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
    email = request.args.get("email", "").strip().lower()
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
    user_row = cur.fetchone()
    if not user_row:
        return jsonify({"exists": False})

    cur.execute("SELECT qid, answer FROM answers WHERE user_id = ?", (user_row["id"],))
    answers = {str(r["qid"]): r["answer"] for r in cur.fetchall()}

    user_data = dict(user_row)
    user_data["answers"] = answers
    user_data["preferred_genders"] = json.loads(user_data.get("preferred_genders") or "[]")
    return jsonify({"exists": True, "user": user_data})

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
        # User exists: update info
        uid = r["id"]
        cur.execute("""
            UPDATE users
            SET first_name = ?, last_name = ?, grade = ?, gender = ?, preferred_genders = ?
            WHERE id = ?
        """, (first, last, grade, gender, preferred_genders, uid))
    else:
        cur.execute("""
            INSERT INTO users (email, first_name, last_name, grade, gender, preferred_genders)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (email, first, last, grade, gender, preferred_genders))
        uid = cur.lastrowid
    db.commit()

    cur.execute("SELECT submitted_at FROM users WHERE id = ?", (uid,))
    submitted_at = cur.fetchone()["submitted_at"]

    return jsonify({"ok": True, "user": {
        "id": uid,
        "first_name": first,
        "last_name": last,
        "email": email,
        "grade": grade,
        "gender": gender,
        "preferred_genders": json.loads(preferred_genders),
        "submitted_at": submitted_at
    }})

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

    # Save/update answers
    for qid_str, ans in answers.items():
        try:
            qid = int(qid_str)
        except:
            continue
        cur.execute("""
            INSERT INTO answers (user_id, qid, answer)
            VALUES (?, ?, ?)
        """, (uid, qid, ans))
    submitted_at = datetime.utcnow().isoformat()
    cur.execute("UPDATE users SET match_type = ?, submitted_at = ? WHERE id = ?", (match_type, submitted_at, uid))
    
    cur.execute("""
        INSERT INTO user_submissions (
            user_id, first_name, last_name, email, grade, gender, preferred_genders, match_type, submitted_at, answers
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        uid,
        row["first_name"],
        row["last_name"],
        row["email"],
        row["grade"],
        row["gender"],
        row["preferred_genders"],
        match_type,
        submitted_at,
        json.dumps(answers)
    ))
    
    
    db.commit()
    return jsonify({"ok": True, "user_id": uid})

@app.route("/api/run-matchmaking", methods=["POST"])
def run_matchmaking():
    payload = request.json or {}
    baseline = float(payload.get("baseline", 0.0))

    users = fetch_all_users_with_answers()
    if not users:
        return jsonify({"ok": True, "results": {}})

    for u in users:
        u["uid"] = f"user{u['id']}"

    questions = sorted({k for u in users for k in u["answers"].keys()})
    rows = []
    for u in users:
        grade_int = int(u["grade"].replace("th", "").replace("rd", "").replace("st", ""))
        row = {"id": u["uid"], "grade": grade_int, "intent": u.get("match_type")}
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
            if gender_map[b_id] not in pref_map[a_id]:
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
        paired_ids = {p["a"] for p in pairs} | {p["b"] for p in pairs}
        unmatched = [uid for uid in subset if uid not in paired_ids]
        return pairs, unmatched

    friend_pairs, unmatched_friends = optimal_pairing("friend")
    date_pairs, unmatched_dates = optimal_pairing("date")
    group_users = [i for i in ids if df.loc[i]["intent"]=="group"] + unmatched_friends + unmatched_dates

    # Form balanced groups
    def form_groups_balanced(users, min_size=3, max_size=4):
        if not users: return []
        groups = []
        temp = list(users)
        np.random.shuffle(temp)
        while len(temp) >= max_size:
            groups.append(temp[:max_size])
            temp = temp[max_size:]
        while temp:
            if len(temp) >= min_size:
                groups.append(temp[:max_size])
                temp = temp[max_size:]
            else:
                added = False
                for g in groups:
                    while len(g) < max_size and temp:
                        g.append(temp.pop(0))
                        added = True
                if not added:
                    groups.append(temp[:])
                    temp = []
        return groups

    groups = form_groups_balanced(group_users)
    results = {"friends": friend_pairs, "dates": date_pairs, "groups": groups}

    cur = get_db().cursor()
    cur.execute("INSERT INTO matches (created_at, match_type, payload) VALUES (?, ?, ?)",
                (datetime.utcnow().isoformat(), "full_run", json.dumps(results)))
    get_db().commit()
    match_id = cur.lastrowid
    return jsonify({"ok": True, "match_id": match_id, "results": results})

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

@app.route("/api/user/<int:user_id>", methods=["GET"])
def get_user_by_id(user_id):
    cur = get_db().cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cur.fetchone()
    if not user:
        return jsonify({"ok": False, "error": "user not found"}), 404
    user_data = dict(user)
    cur.execute("SELECT qid, answer FROM answers WHERE user_id = ?", (user_id,))
    user_data["answers"] = {r["qid"]: r["answer"] for r in cur.fetchall()}
    return jsonify({"ok": True, "user": user_data})

if __name__ == "__main__":    
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT",5000)))
