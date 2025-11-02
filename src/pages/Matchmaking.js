import { useState, useEffect } from "react";
import "../styles/Matchmaking.css";
import "../styles/Fonts.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import Countdown from "../components/Countdown";
import QUESTIONS from "../components/Questions";

const API_BASE = process.env.REACT_APP_API_BASE || "https://emmamatchmaking-production.up.railway.app/api";

function Matchmaking() {
  const [step, setStep] = useState("signup"); // signup → matchType → datePreferences → questions → waiting → reveal
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

  useEffect(() => {
    if (user?.submittedAt) setStep("waiting");
  }, [user]);

  // --- API Handlers ---
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
    const unanswered = QUESTIONS.some(q => !answers[q.id]);
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

  // --- Bot simulation + auto matchmaking ---
  const handleCountdownFinish = async () => {
    console.log("Countdown finished. Generating 199 bots...");
    const botUsers = Array.from({ length: 199 }, (_, i) => {
      const botAnswers = {};
      QUESTIONS.forEach(q => {
        const randIdx = Math.floor(Math.random() * q.options.length);
        botAnswers[q.id] = q.options[randIdx];
      });
      return {
        firstName: `Bot${i+1}`,
        lastName: `User`,
        email: `bot${i+1}@example.com`,
        grade: `${9 + (i % 4)}`,
        gender: ["male","female","other"][i%3],
        preferredGenders: ["male","female","other"],
        answers: botAnswers,
      };
    });

    const allUsers = [user, ...botUsers].filter(Boolean);

    try {
      const resp = await fetch(`${API_BASE}/run-matchmaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: allUsers, baseline: 0.3 }),
      });
      const data = await resp.json();
      setMatches(data.results);
      setStep("reveal");
    } catch (err) {
      console.error(err);
      alert("Network error while running matchmaking");
    }
  };

  // --- Render helpers ---
  const renderSignup = () => (
    <div className="content-card">
      <h2>Sign Up</h2>
      <input placeholder="First Name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
      <input placeholder="Last Name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
      <input placeholder="Student Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
        <option value="">Select Grade</option>
        <option>9th</option>
        <option>10th</option>
        <option>11th</option>
        <option>12th</option>
      </select>
      <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
      <button onClick={handleSignup}>Continue</button>
    </div>
  );

  const renderMatchType = () => (
    <div className="content-card">
      <h2>Choose Match Type</h2>
      <button onClick={() => handleSelectMatchType("friend")}>Friend</button>
      <button onClick={() => handleSelectMatchType("date")}>Date</button>
      <button onClick={() => handleSelectMatchType("group")}>Group</button>
    </div>
  );

  const renderDatePreferences = () => (
    <div className="content-card">
      <h2>Who would you like to be matched with?</h2>
      <div className="scroll-container">
        {["male","female","nonbinary","other"].map(g => (
          <label key={g}>
            <input
              type="checkbox"
              checked={form.preferredGenders.includes(g)}
              onChange={e => {
                const prefs = new Set(form.preferredGenders);
                e.target.checked ? prefs.add(g) : prefs.delete(g);
                setForm({ ...form, preferredGenders: Array.from(prefs) });
              }}
            />
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </label>
        ))}
      </div>
      <button onClick={() => setStep("questions")}>Continue</button>
    </div>
  );

  const renderQuestions = () => (
    <div className="content-card">
      <h2>Tell us about yourself!</h2>
      <div className="scroll-container">
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
                  onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                />
                <span className="option-label">{String.fromCharCode(65+idx)}.</span> {opt}
              </label>
            ))}
          </div>
        ))}
      </div>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );

  const renderWaiting = () => (
    <div className="content-card">
      <h2>Your submission is saved.</h2>
      <p>You cannot submit again with the same email.</p>
      <Countdown durationMinutes={5} onFinish={handleCountdownFinish} />
    </div>
  );

  const renderReveal = () => (
    <div className="content-card">
      <h2>Matches Revealed</h2>
      <pre>{JSON.stringify(matches, null, 2)}</pre>
    </div>
  );

  const renderContent = () => {
    switch(step){
      case "signup": return renderSignup();
      case "matchType": return renderMatchType();
      case "datePreferences": return renderDatePreferences();
      case "questions": return renderQuestions();
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
