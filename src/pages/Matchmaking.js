import { useState, useEffect } from "react";
import "../styles/Matchmaking.css";
import "../styles/Fonts.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import Countdown from "../components/Countdown";
import QUESTIONS from "../components/Questions";

const API_BASE = process.env.REACT_APP_API_BASE || "https://emmamatchmaking-production.up.railway.app/api";

function Matchmaking() {
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
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("emma_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [matches, setMatches] = useState(null);
  const [matchedUser, setMatchedUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [step, setStep] = useState("login");

  // --- Login handler ---
  const handleLogin = async () => {
    if (!loginEmail.endsWith("@students.esuhsd.org")) {
      alert("Enter a valid student email");
      return;
    }
    try {
      const resp = await fetch(`${API_BASE}/check-email?email=${loginEmail}`);
      const data = await resp.json();
      if (data.exists) {
        setUser(data.user);
        localStorage.setItem("emma_user", JSON.stringify(data.user));
        setStep(data.user.submitted_at ? "waiting" : "matchType");
      } else {
        setForm({ ...form, email: loginEmail });
        setStep("signup");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  // --- Signup handler ---
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

      setUser(data.user);
      localStorage.setItem("emma_user", JSON.stringify(data.user));
      setStep(data.user.submittedAt ? "waiting" : "matchType");
    } catch (err) {
      console.error(err);
      alert("Network error during signup");
    }
  };

  // --- Match type selection ---
  const handleSelectMatchType = (type) => {
    setMatchType(type);
    if (type === "date") {
      setStep("datePreferences");
    } else {
      setStep("questions");
    }
  };

  // --- Render date preferences ---
  const renderDatePreferences = () => (
    <div className="content-card">
      <h2>Select Preferred Genders</h2>
      {["male", "female", "other"].map((g) => (
        <label key={g}>
          <input
            type="checkbox"
            checked={form.preferredGenders.includes(g)}
            onChange={(e) => {
              const newPrefs = e.target.checked
                ? [...form.preferredGenders, g]
                : form.preferredGenders.filter((p) => p !== g);
              setForm({ ...form, preferredGenders: newPrefs });
            }}
          />
          {g.charAt(0).toUpperCase() + g.slice(1)}
        </label>
      ))}
      <button onClick={() => setStep("questions")}>Continue</button>
    </div>
  );

  // --- Submit answers ---
  const handleSubmit = async () => {
    if (!matchType) return alert("Select a match type first!");
    try {
      const resp = await fetch(`${API_BASE}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, matchType, answers }),
      });
      const data = await resp.json();
      if (!data.ok) return alert(data.error || "Submission failed");

      setUser({ ...user, submitted_at: new Date().toISOString() });
      setStep("waiting");
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  // --- Waiting screen ---
  const renderWaiting = () => (
    <div className="content-card">
      <h2>Waiting for matchmaking...</h2>
      <Countdown targetDate="2025-11-03T23:05:00-08:00" />
    </div>
  );

  // --- Reveal matches ---
  const renderReveal = () => (
    <div className="content-card">
      <h2>Your Match</h2>
      {matchedUser ? (
        <div>
          <p>{matchedUser.first_name} {matchedUser.last_name}</p>
          <p>{matchedUser.email}</p>
        </div>
      ) : (
        <p>No match yet.</p>
      )}
    </div>
  );

  // --- Main content renderer ---
  const renderContent = () => {
    switch (step) {
      case "login":
        return (
          <div className="content-card">
            <h2>Enter Your Student Email</h2>
            <input
              placeholder="Student Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            <button onClick={handleLogin}>Continue</button>
          </div>
        );
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
      case "datePreferences":
        return renderDatePreferences();
      case "questions":
        return (
          <div className="content-card">
            <h2>Tell us about yourself!</h2>
            <div className="scroll-container">
              {QUESTIONS.map((q) => (
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
