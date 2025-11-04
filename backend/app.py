# app.py (replace your existing file with this)
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

        cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT,
            last_name TEXT,
            email TEXT UNIQUE,
            grade TEXT,
            gender TEXT,
            preferred_genders TEXT,
            match_type TEXT,
            submitted_at TEXT
        );
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS user_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            grade TEXT,
            gender TEXT,
            preferred_genders TEXT,
            match_type TEXT,
            submitted_at TEXT,
            answers TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            qid INTEGER NOT NULL,
            answer TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """)
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
        # normalize preferred_genders for downstream use
        pref_raw = u.get("preferred_genders")
        if isinstance(pref_raw, str):
            try:
                u["preferred_genders"] = json.loads(pref_raw) if pref_raw else []
            except Exception:
                # fallback: try to interpret as Python literal list or comma-separated
                u["preferred_genders"] = []
        elif pref_raw is None:
            u["preferred_genders"] = []
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
    # ensure preferred_genders is a list
    try:
        user_data["preferred_genders"] = json.loads(user_data.get("preferred_genders") or "[]")
    except Exception:
        user_data["preferred_genders"] = []
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
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    if not row:
        return jsonify({"ok": False, "error": "user not found"}), 404

    # Convert sqlite3.Row to a dict
    row_dict = dict(row)
    uid = row_dict["id"]

    # insert answers
    for qid_str, ans in answers.items():
        try:
            qid = int(qid_str)
        except:
            continue
        cur.execute("""
            INSERT INTO answers (user_id, qid, answer)
            VALUES (?, ?, ?)
        """, (uid, qid, ans))

    # normalize and store lowercase match_type
    match_type_norm = match_type.lower() if isinstance(match_type, str) else match_type
    submitted_at = datetime.utcnow().isoformat()
    cur.execute("UPDATE users SET match_type = ?, submitted_at = ? WHERE id = ?", (match_type_norm, submitted_at, uid))

    # store a snapshot in user_submissions for easy export/audit
    # ensure preferred_genders captured as string (it already is stored in users as JSON string)
    cur.execute("""
        INSERT INTO user_submissions (
            user_id, first_name, last_name, email, grade, gender, preferred_genders, match_type, submitted_at, answers
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        uid,
        row_dict.get("first_name"),
        row_dict.get("last_name"),
        row_dict.get("email"),
        row_dict.get("grade"),
        row_dict.get("gender"),
        row_dict.get("preferred_genders"),
        match_type_norm,
        submitted_at,
        json.dumps(answers)
    ))

    db.commit()
    return jsonify({"ok": True, "user_id": uid})

@app.route("/api/run-matchmaking", methods=["POST"])
def run_matchmaking():
    payload = request.json or {}
    baseline = float(payload.get("baseline", 0.0))

    print("=== RUNNING MATCHMAKING ===")
    print(f"Baseline: {baseline}")

    users = fetch_all_users_with_answers()
    print(f"Fetched {len(users)} users with answers")

    if not users:
        return jsonify({"ok": True, "results": {}})

    # Normalize users
    for u in users:
        u["uid"] = f"user{u['id']}"
        u["match_type"] = str(u.get("match_type") or "").lower()
        u["gender"] = (u.get("gender") or "").lower()

        # parse preferred genders
        pref_raw = u.get("preferred_genders") or []
        pref_list = []

        if isinstance(pref_raw, str):
            try:
                pref_list = json.loads(pref_raw)
            except Exception:
                # fallback: comma-separated string
                pref_list = [x.strip() for x in pref_raw.split(",") if x.strip()]
        elif isinstance(pref_raw, list):
            pref_list = pref_raw

        u["preferred_genders"] = [str(x).lower() for x in pref_list]
        print(f"User {u['uid']}: intent={u['match_type']}, gender={u['gender']}, preferred={u['preferred_genders']}")

    # questions set
    questions = sorted({k for u in users for k in u["answers"].keys()})
    print("Questions IDs:", questions)

    # create DataFrame for similarity calculation
    rows = []
    for u in users:
        try:
            grade_int = int(str(u.get("grade") or "").replace("th", "").replace("rd", "").replace("st", "").replace("nd", ""))
        except Exception:
            try:
                grade_int = int(u.get("grade"))
            except Exception:
                grade_int = 11
        row = {"id": u["uid"], "grade": grade_int, "intent": u.get("match_type", "")}
        for q in questions:
            row[q] = u["answers"].get(q, "")
        rows.append(row)

    df = pd.DataFrame(rows).set_index("id")
    print("User DataFrame for similarity calculation:\n", df)

    ids = df.index.tolist()
    if not ids:
        return jsonify({"ok": True, "results": {"friends": [], "dates": [], "groups": []}})

    # build similarity matrix
    sim_mat = pd.DataFrame(0.0, index=ids, columns=ids)
    gender_map = {u["uid"]: u["gender"] for u in users}
    pref_map = {u["uid"]: u["preferred_genders"] for u in users}

    def accepts(preferences, gender):
        # empty preference = accept anyone
        return not preferences or gender in preferences

    def similarity_row(a_id, b_id):
        A, B = df.loc[a_id], df.loc[b_id]

        # grade proximity
        try:
            if abs(int(A["grade"]) - int(B["grade"])) > 1:
                return 0.0
        except Exception:
            pass

        # check mutual date preferences
        if str(A.get("intent") or "").lower() == "date" and str(B.get("intent") or "").lower() == "date":
            ga, gb = gender_map.get(a_id, ""), gender_map.get(b_id, "")
            pref_a, pref_b = pref_map.get(a_id, []), pref_map.get(b_id, [])
            pref_a = [str(x).lower() for x in pref_a]
            pref_b = [str(x).lower() for x in pref_b]

            if not (accepts(pref_a, gb) and accepts(pref_b, ga)):
                print(f"{a_id}-{b_id} fail mutual date preference: ga={ga}, gb={gb}, pref_a={pref_a}, pref_b={pref_b}")
                return 0.0

        # count exact answer matches
        if not questions:
            return 1.0
        matches = sum(str(A[q]).strip() == str(B[q]).strip() for q in questions)
        return matches / len(questions)

    for a, b in combinations(ids, 2):
        s = similarity_row(a, b)
        sim_mat.loc[a, b] = s
        sim_mat.loc[b, a] = s
        print(f"Similarity {a}-{b} = {s}")

    print("Similarity matrix:\n", sim_mat)

    # pairing function
    def optimal_pairing(intent_name, baseline_val=baseline):
        subset = [i for i in ids if str(df.loc[i]["intent"]).lower() == str(intent_name).lower()]
        G = nx.Graph()
        for a, b in combinations(subset, 2):
            score = sim_mat.loc[a, b]
            if score >= baseline_val:
                G.add_edge(a, b, weight=score)
        matching = nx.algorithms.matching.max_weight_matching(G, maxcardinality=True)
        pairs = [{"a": a, "b": b, "score": float(sim_mat.loc[a, b])} for a, b in matching]
        paired_ids = {p["a"] for p in pairs} | {p["b"] for p in pairs}
        unmatched = [uid for uid in subset if uid not in paired_ids]
        return pairs, unmatched

    # run pairings
    friend_pairs, unmatched_friends = optimal_pairing("friend")
    date_pairs, unmatched_dates = optimal_pairing("date")

    matched_users = {p["a"] for p in friend_pairs + date_pairs} | {p["b"] for p in friend_pairs + date_pairs}

    # group users
    group_users = [u for u in ids if str(df.loc[u]["intent"]).lower() == "group"]
    print(f"Found {len(group_users)} group users: {group_users}")

    group_results = []

    if group_users:
        # Extract only group subset similarity matrix
        submat = sim_mat.loc[group_users, group_users]

        if AgglomerativeClustering and len(group_users) >= 3:
            # Estimate cluster count: ~4–5 users per group
            n_groups = max(1, len(group_users) // 4)
            model = AgglomerativeClustering(
                n_clusters=n_groups,
                affinity="euclidean",
                linkage="average"
            )
            features = submat.values
            np.fill_diagonal(features, 1.0)
            model.fit(features)
            labels = model.labels_

            # build groups by label
            for label in np.unique(labels):
                members = [group_users[i] for i, l in enumerate(labels) if l == label]
                group_results.append({"members": members})
        else:
            # fallback grouping (no sklearn or too few users)
            temp = group_users.copy()
            while len(temp) > 0:
                chunk = temp[:4]  # groups of 4
                temp = temp[4:]
                group_results.append({"members": chunk})

    print(f"Formed {len(group_results)} groups: {group_results}")

    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO matches (created_at, match_type, payload) VALUES (?, ?, ?)",
        (datetime.utcnow().isoformat(), "auto", json.dumps({
            "friends": friend_pairs,
            "dates": date_pairs,
            "groups": group_results
        }))
    )
    db.commit()

    return jsonify({
            "ok": True,
            "results": {
                "friends": friend_pairs,
                "dates": date_pairs,
                "groups": group_results
            }
        })


@app.route("/api/my-match")
def my_match():
    email = request.args.get("email")
    if not email:
        return jsonify({"ok": False, "error": "missing email"}), 400

    db = get_db()
    cur = db.cursor()
    user = cur.execute(
        "SELECT id, name, intent FROM users WHERE email = ?", (email,)
    ).fetchone()
    if not user:
        return jsonify({"ok": False, "error": "user not found"}), 404

    user_id = user["id"]
    user_intent = user["intent"]

    match = cur.execute(
        "SELECT * FROM matches ORDER BY created_at DESC LIMIT 1"
    ).fetchone()
    if not match:
        return jsonify({"ok": False, "match": None})

    data = json.loads(match["payload"])

    # === handle friend/date pairings ===
    for pair in data.get("friends", []) + data.get("dates", []):
        if pair["a"] == user_id or pair["b"] == user_id:
            other_id = pair["b"] if pair["a"] == user_id else pair["a"]
            other = cur.execute(
                "SELECT name, grade, email, gender, intent FROM users WHERE id = ?",
                (other_id,),
            ).fetchone()
            if other:
                return jsonify({
                    "ok": True,
                    "match": {
                        "type": user_intent,
                        "name": other["name"],
                        "grade": other["grade"],
                        "email": other["email"],
                        "gender": other["gender"],
                    },
                })

    # === handle group clusters ===
    for group in data.get("groups", []):
        members = group.get("members", [])
        if user_id in members:
            # Get all other members
            placeholders = ",".join("?" * len(members))
            rows = cur.execute(
                f"SELECT name, grade, email, gender FROM users WHERE id IN ({placeholders})",
                tuple(members),
            ).fetchall()

            # Make sure we show everyone (including the requester)
            group_list = [
                {
                    "name": r["name"],
                    "grade": r["grade"],
                    "email": r["email"],
                    "gender": r["gender"],
                }
                for r in rows
            ]

            return jsonify({
                "ok": True,
                "match": {
                    "type": "group",
                    "members": group_list
                },
            })

    # === no match found ===
    return jsonify({"ok": True, "match": None})


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
    # ensure preferred_genders is a list before returning
    try:
        user_data["preferred_genders"] = json.loads(user_data.get("preferred_genders") or "[]")
    except Exception:
        user_data["preferred_genders"] = []
    return jsonify({"ok": True, "user": user_data})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
