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

# Optional: sklearn clustering used for group formation
try:
    from sklearn.cluster import AgglomerativeClustering
except Exception:
    AgglomerativeClustering = None

os.makedirs("/tmp/db", exist_ok=True)
DB_PATH = "/tmp/db/emma.db"


app = Flask(__name__)
CORS(app)  # allow your local React dev server (adjust origins in prod)


def get_db():
    # simple per-request connection
    db = getattr(g, "_database", None)
    if db is None:
        db = sqlite3.connect(DB_PATH, check_same_thread=False)
        db.row_factory = sqlite3.Row
        g._database = db
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
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
                FOREIGN KEY (user_id) REFERENCES users(id)
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

# --- Utility helpers --- #
def fetch_all_users_with_answers():
    db = get_db()
    cur = db.cursor()
    # get users who have submitted
    cur.execute("SELECT * FROM users WHERE submitted_at IS NOT NULL")
    users = [dict(row) for row in cur.fetchall()]

    # attach answers
    for u in users:
        cur.execute("SELECT qid,answer FROM answers WHERE user_id = ?", (u["id"],))
        answers = {int(r["qid"]): r["answer"] for r in cur.fetchall()}
        u["answers"] = answers
    return users


# --- Endpoints --- #

@app.route("/api/check-email", methods=["GET"])
def check_email():
    email = request.args.get("email", "")
    with get_db() as db:
        cur = db.cursor()
        cur.execute("SELECT id, first_name, last_name, grade, match_type FROM users WHERE email = ?", (email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"exists": False})
        return jsonify({
            "exists": True,
            "user": dict(row)
        })


@app.route("/api/signup", methods=["POST"])
def signup():
    """
    payload: {
      firstName, lastName, email, grade
    }
    Creates or returns existing user record (does not add answers)
    """
    data = request.json
    first = data.get("firstName", "").strip()
    last = data.get("lastName", "").strip()
    email = data.get("email", "").strip().lower()
    grade = data.get("grade", "").strip()

    if not (first and last and email and grade):
        return jsonify({"ok": False, "error": "missing fields"}), 400

    db = get_db()
    cur = db.cursor()
    # insert or get
    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    r = cur.fetchone()
    if r:
        uid = r["id"]
    else:
        submitted_at = None
        full = f"{first} {last}"
        cur.execute("INSERT INTO users (email, first_name, last_name, grade, submitted_at) VALUES (?, ?, ?, ?, ?)",
            (email, first, last, grade, submitted_at))

        db.commit()
        uid = cur.lastrowid

    return jsonify({"ok": True, "user_id": uid})


@app.route("/api/submit", methods=["POST"])
def submit_answers():
    """
    payload:
    {
      email,
      matchType,
      answers: { "1": "Answer text", "2": "Answer", ... }
    }
    """
    data = request.json
    email = data.get("email", "").strip().lower()
    match_type = data.get("matchType")
    answers = data.get("answers", {})

    if not (email and match_type and isinstance(answers, dict) and len(answers) >= 25):
        return jsonify({"ok": False, "error": "invalid payload"}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    if not row:
        return jsonify({"ok": False, "error": "user not found"}), 404
    uid = row["id"]

    # If user already submitted, block duplicate submission
    cur.execute("SELECT submitted_at FROM users WHERE id = ?", (uid,))
    if cur.fetchone()["submitted_at"]:
        return jsonify({"ok": False, "error": "already submitted"}), 409

    # Save answers
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
    """
    Trigger the matchmaking algorithm.
    Optional payload fields:
      baseline: float threshold for pair similarity (0-1)
    """
    payload = request.json or {}
    baseline = float(payload.get("baseline", 0.0))

    users = fetch_all_users_with_answers()
    if not users:
        return jsonify({"ok": True, "matches": {}})

    # build DataFrame with rows indexed by user internal id (string uid like 'u5')
    # For compatibility with your colab: create 'id' field that we'll use as string key
    # map user internal DB id to userX id string:
    for u in users:
        u["uid"] = f"user{u['id']}"

    # list of question keys (1..25)
    all_qids = sorted({k for u in users for k in u["answers"].keys()})
    questions = [int(q) for q in all_qids]

    # Build DataFrame
    rows = []
    for u in users:
        row = {"id": u["uid"], "grade": int(u["grade"].replace("th", "").replace("rd", "").replace("st", "")) if isinstance(u["grade"], str) else int(u["grade"]), "intent": u.get("match_type")}
        # attach answers as columns keyed by qid
        for q in questions:
            row[q] = u["answers"].get(q, "")
        rows.append(row)
    df = pd.DataFrame(rows).set_index("id")

    # --- similarity function adapted from your colab ---
    def to_numeric_choice(x):
        # convert choices A/B/C/D or full text to letters if possible
        if isinstance(x, str) and x.strip() in {"A", "B", "C", "D"}:
            return x.strip()
        # fallback: just return string
        return str(x).strip()

    # compute similarity matrix (0-1)
    ids = df.index.tolist()
    sim_mat = pd.DataFrame(0.0, index=ids, columns=ids)

    def similarity_row(a_id, b_id):
        A = df.loc[a_id]
        B = df.loc[b_id]
        # grade difference constraint (only 1 grade diff allowed)
        if abs(int(A["grade"]) - int(B["grade"])) > 1:
            return 0.0
        # if both date and same gender constraint not present in this DB; you can add preference fields in metadata
        matches = 0
        total = len(questions)
        for q in questions:
            if to_numeric_choice(A[q]) == to_numeric_choice(B[q]):
                matches += 1
        return matches / total if total else 0.0

    # fill sim_mat
    for a, b in combinations(ids, 2):
        s = similarity_row(a, b)
        sim_mat.loc[a, b] = s
        sim_mat.loc[b, a] = s

    # helper: optimal pairing (matching) for pair intents
    def optimal_pairing(intent_name, baseline_val=baseline):
        # select ids with that intent
        subset = [i for i in ids if df.loc[i]["intent"] == intent_name]
        G = nx.Graph()
        for a, b in combinations(subset, 2):
            score = sim_mat.loc[a, b]
            if score >= baseline_val:
                G.add_edge(a, b, weight=score)
        matching = nx.algorithms.matching.max_weight_matching(G, maxcardinality=True)
        pairs = []
        for a, b in matching:
            pairs.append({"a": a, "b": b, "score": float(sim_mat.loc[a, b])})
        return pairs

    # helper: balanced group formation
    def form_groups_balanced(group_size=4, min_size=3, max_size=4):
        # users wanting 'group'
        group_users = [i for i in ids if df.loc[i]["intent"] == "group"]
        n_users = len(group_users)
        if n_users < min_size:
            return []
        sim_sub = sim_mat.loc[group_users, group_users]
        dist = 1 - sim_sub.values
        if AgglomerativeClustering is None:
            # fallback: trivial chunking
            final = [group_users[i:i+max_size] for i in range(0, len(group_users), max_size)]
            return final
        n_clusters = math.ceil(n_users / group_size)
        # safe wrapper for sklearn version differences
        try:
            model = AgglomerativeClustering(n_clusters=n_clusters, metric='precomputed', linkage='average')
            labels = model.fit_predict(dist)
        except TypeError:
            # older sklearn uses affinity
            model = AgglomerativeClustering(n_clusters=n_clusters, affinity='precomputed', linkage='average')
            labels = model.fit_predict(dist)
        init_groups = defaultdict(list)
        for uid, lab in zip(group_users, labels):
            init_groups[lab].append(uid)

        balanced = []
        leftovers = []
        for g in init_groups.values():
            if len(g) > max_size:
                k = math.ceil(len(g) / max_size)
                sub_sim = sim_sub.loc[g, g]
                sub_dist = 1 - sub_sim.values
                try:
                    sub_labels = AgglomerativeClustering(n_clusters=k, metric='precomputed', linkage='average').fit_predict(sub_dist)
                except TypeError:
                    sub_labels = AgglomerativeClustering(n_clusters=k, affinity='precomputed', linkage='average').fit_predict(sub_dist)
                sub_groups = defaultdict(list)
                for uid, lab in zip(g, sub_labels):
                    sub_groups[lab].append(uid)
                for sg in sub_groups.values():
                    if min_size <= len(sg) <= max_size:
                        balanced.append(sg)
                    elif len(sg) > max_size:
                        for i in range(0, len(sg), max_size):
                            balanced.append(sg[i:i + max_size])
                    else:
                        leftovers.extend(sg)
            elif len(g) < min_size:
                leftovers.extend(g)
            else:
                balanced.append(g)

        # attempt to cluster leftovers
        if len(leftovers) >= min_size:
            L_ids = leftovers
            L_sim = sim_sub.loc[L_ids, L_ids]
            L_dist = 1 - L_sim.values
            L_n = math.ceil(len(L_ids) / group_size)
            try:
                L_labels = AgglomerativeClustering(n_clusters=L_n, metric='precomputed', linkage='average').fit_predict(L_dist)
            except TypeError:
                L_labels = AgglomerativeClustering(n_clusters=L_n, affinity='precomputed', linkage='average').fit_predict(L_dist)
            L_groups = defaultdict(list)
            for uid, lab in zip(L_ids, L_labels):
                L_groups[lab].append(uid)
            leftovers2 = []
            for g in L_groups.values():
                if min_size <= len(g) <= max_size:
                    balanced.append(g)
                elif len(g) > max_size:
                    k = math.ceil(len(g) / max_size)
                    sub_sim = L_sim.loc[g, g]
                    sub_dist = 1 - sub_sim.values
                    sub_labels = AgglomerativeClustering(n_clusters=k, metric='precomputed', linkage='average').fit_predict(sub_dist)
                    sub_groups = defaultdict(list)
                    for uid, lab in zip(g, sub_labels):
                        sub_groups[lab].append(uid)
                    for sg in sub_groups.values():
                        if min_size <= len(sg) <= max_size:
                            balanced.append(sg)
                        else:
                            leftovers2.extend(sg)
                else:
                    leftovers2.extend(g)
            leftovers = leftovers2

        if leftovers:
            for uid in list(leftovers):
                best_idx = None
                best_score = -1.0
                for idx, grp in enumerate(balanced):
                    if len(grp) >= max_size:
                        continue
                    score = sim_sub.loc[uid, grp].mean()
                    if score > best_score:
                        best_score = score
                        best_idx = idx
                if best_idx is not None:
                    balanced[best_idx].append(uid)
                    leftovers.remove(uid)
            while leftovers:
                chunk = leftovers[:max_size]
                balanced.append(chunk)
                leftovers = leftovers[max_size:]

        # final pass chunking and merging tiny groups
        final_groups = []
        for g in balanced:
            if len(g) > max_size:
                for i in range(0, len(g), max_size):
                    final_groups.append(g[i:i + max_size])
            else:
                final_groups.append(g)
        tiny = [g for g in final_groups if len(g) < min_size]
        non_tiny = [g for g in final_groups if len(g) >= min_size]
        if tiny:
            for t in tiny:
                for uid in t:
                    best_idx = -1
                    best_score = -1.0
                    for i, grp in enumerate(non_tiny):
                        if len(grp) >= max_size:
                            continue
                        s = sim_sub.loc[uid, grp].mean()
                        if s > best_score:
                            best_score = s
                            best_idx = i
                    if best_idx >= 0:
                        non_tiny[best_idx].append(uid)
                    else:
                        non_tiny.append([uid])
            final_groups = non_tiny

        return final_groups

    # Run matchers
    friend_pairs = optimal_pairing("friend", baseline)
    date_pairs = optimal_pairing("date", baseline)
    groups = form_groups_balanced(group_size=4, min_size=3, max_size=4)

    results = {
        "friends": friend_pairs,
        "dates": date_pairs,
        "groups": groups
    }

    # store matches (as JSON) with timestamp
    with get_db() as db:
        cur = db.cursor()
        cur.execute("INSERT INTO matches (created_at, match_type, payload) VALUES (?, ?, ?)",
                    (datetime.utcnow().isoformat(), "full_run", json.dumps(results)))
        db.commit()
        match_id = cur.lastrowid

    return jsonify({"ok": True, "match_id": match_id, "results": results})


@app.route("/api/latest-matches", methods=["GET"])
def latest_matches():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, created_at, payload FROM matches ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    if not row:
        return jsonify({"ok": True, "matches": None})
    return jsonify({"ok": True, "matches": json.loads(row["payload"]), "created_at": row["created_at"], "id": row["id"]})


@app.route("/api/my-match", methods=["GET"])
def my_match():
    """
    Given email, return the user's entry and any match info containing them.
    ?email=...
    """
    email = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"ok": False, "error": "missing email"}), 400
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cur.fetchone()
    if not user:
        return jsonify({"ok": False, "error": "user not found"}), 404
    uid = f"user{user['id']}"
    # fetch latest match payload and look up where uid appears
    cur.execute("SELECT payload FROM matches ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    if not row:
        return jsonify({"ok": True, "user": dict(user), "match": None})
    payload = json.loads(row["payload"])
    # search in friends/dates/groups
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
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
