import { useState, useEffect } from "react";
import "../styles/Matchmaking.css";
import "../styles/Fonts.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import Countdown from "../components/Countdown";
import QUESTIONS from "../components/Questions";

const API_BASE = process.env.REACT_APP_API_BASE || "https://emmamatchmaking-production.up.railway.app/api";

function Matchmaking() {
  const [step, setStep] = useState("signup"); // signup → matchType → questions → waiting → reveal
  const [matchType, setMatchType] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    grade: "",
    gender: "",
    preferredGenders: [],
  });
  const [answers, setAnswers] = useState({});
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("emma_user")) || null);
  const [matches, setMatches] = useState(null);
  const [matchedUser, setMatchedUser] = useState(null);

  // --- API Helpers ---
  const handleSignup = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.grade || !form.gender) {
      alert("Complete all fields");
      return;
    }
    if (!form.email.endsWith("@students.esuhsd.org")) {
      alert("Use a valid student email");
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (!data.ok) return alert(data.error || "Signup failed");

      const newUser = { ...form, id: data.user_id };
      setUser(newUser);
      localStorage.setItem("emma_user", JSON.stringify(newUser));
      setStep("matchType");
    } catch (err) {
      console.error(err);
      alert("Network error during signup");
    }
  };

  const handleSelectMatchType = (type) => {
    setMatchType(type);
    setStep(type === "date" ? "datePreferences" : "questions");
  };

  const handleSubmit = async () => {
    const unanswered = QUESTIONS.some((q) => !answers[q.id]);
    if (!matchType || unanswered || !user?.email) {
      alert("Complete all fields and select a match type");
      return;
    }
    try {
      const resp = await fetch(`${API_BASE}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, matchType, answers }),
      });
      const data = await resp.json();
      if (!data.ok) return alert(data.error || "Submission failed");

      const newUser = { ...user, submittedAt: new Date().toISOString(), matchType, answers };
      setUser(newUser);
      localStorage.setItem("emma_user", JSON.stringify(newUser));
      setStep("waiting");
    } catch (err) {
      console.error(err);
      alert("Network error during submission");
    }
  };

  // --- Bots & Matchmaking ---
  const runMatchmaking = async () => {
    try {
      const matchResp = await fetch(`${API_BASE}/run-matchmaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseline: 0.1 }),
      });
      const matchData = await matchResp.json();
      setMatches(matchData.results);
      setStep("reveal");
    } catch (err) {
      console.error("Error during matchmaking:", err);
      alert("Something went wrong during matchmaking. Check console.");
    }
  };

  // --- Fetch matched user ---
  useEffect(() => {
    if (!matches || !user?.id) return;

    // Find the matched ID
    const myMatch = matches?.dates?.find(
      (p) => p.a === `user${user.id}` || p.b === `user${user.id}`
    ) || matches?.friends?.find(
      (p) => p.a === `user${user.id}` || p.b === `user${user.id}`
    );

    const matchedId = myMatch
      ? myMatch.a === `user${user.id}` ? myMatch.b : myMatch.a
      : null;

    if (!matchedId) return;

    // Extract numeric ID
    const matchedNumericId = matchedId.replace("user", "");

    // Fetch full user info with answers
    fetch(`${API_BASE}/check-email?email=${matchedNumericId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) setMatchedUser(data.user);
        else setMatchedUser(null);
      })
      .catch((err) => {
        console.error("Error fetching matched user:", err);
        setMatchedUser(null);
      });
  }, [matches, user]);

  // --- UI Render ---
  const renderWaiting = () => (
    <div className="content-card">
      <h2>Your submission is saved.</h2>
      <p>Waiting for matchmaking...</p>
      <Countdown
        targetDate="2025-11-02T13:00:00-08:00" // 1Pm PST on Nov 2, 2025
        onFinish={runMatchmaking}
      />
    </div>
  );

  const renderReveal = () => {
    if (!user?.email) return null;

    return (
      <div className="content-card">
        <h2>Your Match</h2>
        <div className="scroll-container">
          {matchedUser ? (
            <div>
              <p>
                <strong>Name:</strong> {matchedUser.first_name} {matchedUser.last_name}
              </p>
              <p>
                <strong>Grade:</strong> {matchedUser.grade}
              </p>
              <p>
                <strong>Email:</strong> {matchedUser.email}
              </p>
              <p>
                <strong>Gender:</strong> {matchedUser.gender}
              </p>
              <p>
                <strong>Matched Questions:</strong>
              </p>
              <ul>
                {Object.entries(user.answers || {})
                  .filter(([qid, ans]) => matchedUser.answers && matchedUser.answers[qid] === ans)
                  .map(([qid, ans]) => (
                    <li key={qid}>{`Q${qid}: ${ans}`}</li>
                  ))}
              </ul>
            </div>
          ) : (
            <p>Loading your match...</p>
          )}
        </div>
      </div>
    );
  };


  const renderContent = () => {
    switch (step) {
      case "signup":
        return (
          <div className="content-card">
            <h2>Sign Up</h2>
            <input
              placeholder="First Name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <input
              placeholder="Last Name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
            <input
              placeholder="Student Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              <option value="">Select Grade</option>
              <option>9th</option>
              <option>10th</option>
              <option>11th</option>
              <option>12th</option>
            </select>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <button onClick={handleSignup}>Continue</button>
          </div>
        );
      case "matchType":
        return (
          <div className="content-card">
            <h2>Choose Match Type</h2>
            <button onClick={() => handleSelectMatchType("friend")}>Friend</button>
            <button onClick={() => handleSelectMatchType("date")}>Date</button>
            <button onClick={() => handleSelectMatchType("group")}>Group</button>
          </div>
        );
      case "questions":
        return (
          <div className="content-card">
            <h2>Tell us about yourself!</h2>
            <div className="scroll-container">
              {QUESTIONS.map((q) => (
                <div key={q.id} className="question">
                  <p>
                    <strong>
                      {q.id}. {q.text}
                    </strong>
                  </p>
                  {q.options.map((opt, idx) => (
                    <label key={idx}>
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                      />
                      <span className="option-label">{String.fromCharCode(65 + idx)}.</span> {opt}
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={handleSubmit}>Submit</button>
          </div>
        );
      case "waiting":
        return renderWaiting();
      case "reveal":
        return renderReveal();
      default:
        return null;
    }
  };

  return (
    <div className="appheader">
      <InteractiveGrid />
      <nav className="navbar">
        <Navbar />
      </nav>
      {renderContent()}
    </div>
  );
}

export default Matchmaking;
