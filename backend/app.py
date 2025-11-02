import os
import sqlite3
import json
from datetime import datetime
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import pandas as pd
import numpy as np
from itertools import combinations
import networkx as nx
import math
from collections import defaultdict

# Optional: sklearn clustering for groups
try:
    from sklearn.cluster import AgglomerativeClustering
except Exception:
    AgglomerativeClustering = None

# --- Database setup ---
os.makedirs("/tmp/db", exist_ok=True)
DB_PATH = "/tmp/db/emma.db"

app = Flask(__name__)
CORS(app)

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = sqlite3.connect(DB_PATH, check_same_thread=False)
        db.row_factory = sqlite3.Row
        g._database = db
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db:
        db.close()

def init_db():
    with sqlite3.connect(DB_PATH) as db:
        cur = db.cursor()
        # Users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT,
                last_name TEXT,
                email TEXT UNIQUE,
                grade TEXT,
                gender TEXT,
                preferred_genders TEXT,
                submitted_at TEXT,
                match_type TEXT,
                answers TEXT
            );
        """)
        # Answers table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                qid INTEGER NOT NULL,
                answer TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
        """)
        # Matches table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT,
                match_type TEXT,
                payload TEXT
            );
        """)
        db.commit()
    print(f"Initialized DB at {DB_PATH}")

init_db()

# --- Utilities ---
def fetch_all_users_with_answers():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE submitted_at IS NOT NULL")
    users = [dict(r) for r in cur.fetchall()]
    for u in users:
        cur.execute("SELECT qid, answer FROM answers WHERE user_id = ?", (u["id"],))
        u["answers"] = {int(r["qid"]): r["answer"] for r in cur.fetchall()}
    return users

# --- Endpoints ---
@app.route("/api/check-email", methods=["GET"])
def check_email():
    email_or_uid = request.args.get("email", "").strip().lower()
    db = get_db()
    cur = db.cursor()

    if email_or_uid.startswith("user"):
        uid = int(email_or_uid.replace("user", ""))
        cur.execute("SELECT id, first_name, last_name, grade, match_type, email, gender FROM users WHERE id = ?", (uid,))
    else:
        cur.execute("SELECT id, first_name, last_name, grade, match_type, email, gender FROM users WHERE email = ?", (email_or_uid,))

    row = cur.fetchone()
    if not row:
        return jsonify({"exists": False})
    return jsonify({"exists": True, "user": dict(row)})


@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.json
    first = data.get("firstName", "").strip()
    last = data.get("lastName", "").strip()
    email = data.get("email", "").strip().lower()
    grade = data.get("grade", "").strip()
    gender = data.get("gender", "").strip()
    preferred_genders = json.dumps(data.get("preferredGenders", []))

    if not (first and last and email and grade and gender):
        return jsonify({"ok": False, "error": "missing fields"}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    r = cur.fetchone()
    if r:
        uid = r["id"]
    else:
        cur.execute("""
            INSERT INTO users (email, first_name, last_name, grade, gender, preferred_genders)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (email, first, last, grade, gender, preferred_genders))
        db.commit()
        uid = cur.lastrowid

    return jsonify({"ok": True, "user_id": uid})

@app.route("/api/submit", methods=["POST"])
def submit_answers():
    data = request.json
    email = data.get("email", "").strip().lower()
    match_type = data.get("matchType")
    answers = data.get("answers", {})

    if not (email and match_type and isinstance(answers, dict) and len(answers) >= 25):
        return jsonify({"ok": False, "error": "invalid payload"}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, submitted_at FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    if not row:
        return jsonify({"ok": False, "error": "user not found"}), 404
    uid = row["id"]
    if row["submitted_at"]:
        return jsonify({"ok": False, "error": "already submitted"}), 409

    for qid_str, ans in answers.items():
        try:
            qid = int(qid_str)
        except:
            continue
        cur.execute("INSERT INTO answers (user_id, qid, answer) VALUES (?, ?, ?)", (uid, qid, ans))
    submitted_at = datetime.utcnow().isoformat()
    cur.execute("UPDATE users SET match_type = ?, submitted_at = ? WHERE id = ?", (match_type, submitted_at, uid))
    db.commit()
    return jsonify({"ok": True, "user_id": uid})

@app.route("/api/run-matchmaking", methods=["POST"])
def run_matchmaking():
    payload = request.json or {}
    baseline = float(payload.get("baseline", 0.0))

    users = fetch_all_users_with_answers()
    if not users:
        return jsonify({"ok": True, "matches": {}})

    # Map DB IDs to uid strings
    for u in users:
        u["uid"] = f"user{u['id']}"

    questions = sorted({k for u in users for k in u["answers"].keys()})
    rows = []
    for u in users:
        row = {
            "id": u["uid"],
            "grade": int(u["grade"].replace("th","").replace("rd","").replace("st","")) if isinstance(u["grade"], str) else int(u["grade"]),
            "intent": u.get("match_type")
        }
        for q in questions:
            row[q] = u["answers"].get(q, "")
        rows.append(row)
    df = pd.DataFrame(rows).set_index("id")

    ids = df.index.tolist()
    sim_mat = pd.DataFrame(0.0, index=ids, columns=ids)
    gender_map = {u["uid"]: u.get("gender","") for u in users}
    pref_map = {u["uid"]: json.loads(u.get("preferred_genders") or "[]") for u in users}

    def similarity_row(a_id, b_id):
        A, B = df.loc[a_id], df.loc[b_id]
        if abs(int(A["grade"]) - int(B["grade"])) > 1:
            return 0.0
        if A["intent"] == "date" and B["intent"] == "date":
            if gender_map[b_id] not in pref_map[a_id] or gender_map[a_id] not in pref_map[b_id]:
                return 0.0
        matches = sum(str(A[q]).strip() == str(B[q]).strip() for q in questions)
        return matches / len(questions) if questions else 0.0

    for a,b in combinations(ids,2):
        s = similarity_row(a,b)
        sim_mat.loc[a,b] = s
        sim_mat.loc[b,a] = s

    def optimal_pairing(intent_name, baseline_val=baseline):
        subset = [i for i in ids if df.loc[i]["intent"] == intent_name]
        G = nx.Graph()
        for a,b in combinations(subset,2):
            score = sim_mat.loc[a,b]
            if score >= baseline_val:
                G.add_edge(a,b,weight=score)
        matching = nx.algorithms.matching.max_weight_matching(G, maxcardinality=True)
        pairs = [{"a": a, "b": b, "score": float(sim_mat.loc[a,b])} for a,b in matching]

        # Identify unmatched users
        paired_ids = {p["a"] for p in pairs} | {p["b"] for p in pairs}
        unmatched = [uid for uid in subset if uid not in paired_ids]
        return pairs, unmatched

    # --- Run friends and dates ---
    friend_pairs, unmatched_friends = optimal_pairing("friend")
    date_pairs, unmatched_dates = optimal_pairing("date")

    # --- Form groups ---
    group_users = [i for i in ids if df.loc[i]["intent"]=="group"]
    # Include unmatched users from friends/dates
    group_users += unmatched_friends + unmatched_dates

    def form_groups_balanced(group_users, min_size=3, max_size=4):
        if not group_users:
            return []

        groups = []
        temp = list(group_users)

        # Shuffle so merging is more random (optional)
        np.random.shuffle(temp)

        # Make groups of max_size
        while len(temp) >= max_size:
            groups.append(temp[:max_size])
            temp = temp[max_size:]

        # Handle leftovers
        while temp:
            if len(temp) >= min_size:
                groups.append(temp[:max_size])
                temp = temp[max_size:]
            else:
                # Add leftover users to existing groups that have < max_size
                added = False
                for g in groups:
                    while len(g) < max_size and temp:
                        g.append(temp.pop(0))
                        added = True
                if not added:
                    # If still leftover and no group can take them, make a new small group
                    groups.append(temp[:])
                    temp = []

        return groups

    groups = form_groups_balanced(group_users)

    results = {
        "friends": friend_pairs,
        "dates": date_pairs,
        "groups": groups
    }

    # --- Save to DB ---
    cur = get_db().cursor()
    cur.execute("INSERT INTO matches (created_at, match_type, payload) VALUES (?, ?, ?)",
                (datetime.utcnow().isoformat(), "full_run", json.dumps(results)))
    get_db().commit()
    match_id = cur.lastrowid

    return jsonify({"ok": True, "match_id": match_id, "results": results})


@app.route("/api/latest-matches", methods=["GET"])
def latest_matches():
    cur = get_db().cursor()
    cur.execute("SELECT id, created_at, payload FROM matches ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    if not row:
        return jsonify({"ok": True, "matches": None})
    return jsonify({"ok": True, "matches": json.loads(row["payload"]), "created_at": row["created_at"], "id": row["id"]})

@app.route("/api/my-match", methods=["GET"])
def my_match():
    email = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"ok": False, "error": "missing email"}), 400
    cur = get_db().cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cur.fetchone()
    if not user:
        return jsonify({"ok": False, "error": "user not found"}), 404
    uid = f"user{user['id']}"
    cur.execute("SELECT payload FROM matches ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    if not row:
        return jsonify({"ok": True, "user": dict(user), "match": None})
    payload = json.loads(row["payload"])
    found = {"friends": [], "dates": [], "groups": []}
    for p in payload.get("friends", []):
        if p["a"] == uid or p["b"] == uid:
            found["friends"].append(p)
    for p in payload.get("dates", []):
        if p["a"] == uid or p["b"] == uid:
            found["dates"].append(p)
    for grp in payload.get("groups", []):
        if uid in grp:
            found["groups"].append(grp)
    return jsonify({"ok": True, "user": dict(user), "match": found})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT",5000)))