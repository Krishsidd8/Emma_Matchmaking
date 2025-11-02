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

  const fetchMyMatches = async () => {
    if (!user?.email) return null;
    const resp = await fetch(`${API_BASE}/my-match?email=${encodeURIComponent(user.email)}`);
    const data = await resp.json();
    return data.ok ? data.match : null;
  };

  // --- Bots & Matchmaking ---
  const runBotsAndMatchmaking = async () => {
    // 1️⃣ Clear all previous submissions
    await fetch(`${API_BASE}/clear-all`, { method: "POST" });

    // 2️⃣ Submit 199 bots with randomized answers
    const bots = Array.from({ length: 199 }, (_, i) => {
      const botAnswers = QUESTIONS.reduce((acc, q) => {
        const randomIndex = Math.floor(Math.random() * q.options.length);
        acc[q.id] = q.options[randomIndex];
        return acc;
      }, {});

      return {
        firstName: `Bot${i + 1}`,
        lastName: `AI`,
        email: `bot${i + 1}@students.esuhsd.org`,
        grade: `${9 + (i % 4)}`,
        gender: ["male", "female", "other"][i % 3],
        preferredGenders: ["male", "female", "other"],
        matchType: matchType || "friend",
        answers: botAnswers,
      };
    });

    // Submit bots to API
    for (const bot of bots) {
      await fetch(`${API_BASE}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bot),
      });
    }

    // 3️⃣ Run matchmaking including you
    const resp = await fetch(`${API_BASE}/run-matchmaking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseline: 0.3 }),
    });
    const data = await resp.json();
    setMatches(data.results);
    setStep("reveal");
  };


  // --- UI Render ---
  const renderWaiting = () => (
    <div className="content-card">
      <h2>Your submission is saved.</h2>
      <p>Waiting for matchmaking...</p>
      <Countdown
        targetDate="2025-11-02T00:50:00"
        onFinish={runBotsAndMatchmaking}
      />
    </div>
  );

  const renderReveal = () => (
    <div className="content-card">
      <h2>Matches Revealed</h2>
      {matches ? <pre>{JSON.stringify(matches, null, 2)}</pre> : <p>Loading matches...</p>}
    </div>
  );

  const renderContent = () => {
    switch(step) {
      case "signup": return (
        <div className="content-card">
          <h2>Sign Up</h2>
          <input placeholder="First Name" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
          <input placeholder="Last Name" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
          <input placeholder="Student Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <select value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}>
            <option value="">Select Grade</option>
            <option>9th</option>
            <option>10th</option>
            <option>11th</option>
            <option>12th</option>
          </select>
          <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <button onClick={handleSignup}>Continue</button>
        </div>
      );
      case "matchType": return (
        <div className="content-card">
          <h2>Choose Match Type</h2>
          <button onClick={() => handleSelectMatchType("friend")}>Friend</button>
          <button onClick={() => handleSelectMatchType("date")}>Date</button>
          <button onClick={() => handleSelectMatchType("group")}>Group</button>
        </div>
      );
      case "questions": return (
        <div className="content-card">
          <h2>Tell us about yourself!</h2>
          {QUESTIONS.map(q => (
            <div key={q.id} className="question">
              <p><strong>{q.id}. {q.text}</strong></p>
              {q.options.map((opt, idx) => (
                <label key={idx}>
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers({...answers, [q.id]: opt})}
                  />
                  <span className="option-label">{String.fromCharCode(65 + idx)}.</span> {opt}
                </label>
              ))}
            </div>
          ))}
          <button onClick={handleSubmit}>Submit</button>
        </div>
      );
      case "waiting": return renderWaiting();
      case "reveal": return renderReveal();
      default: return null;
    }
  };

  return (
    <div className="appheader">
      <InteractiveGrid />
      <nav className="navbar"><Navbar /></nav>
      {renderContent()}
    </div>
  );
}

export default Matchmaking;
