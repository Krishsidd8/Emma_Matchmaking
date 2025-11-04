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
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("emma_user")) || null);
  const [matches, setMatches] = useState(null);
  const [matchedUser, setMatchedUser] = useState(null);


  const [loginEmail, setLoginEmail] = useState("");
  const [step, setStep] = useState("login");

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
        if (data.user.submitted_at) {
          setStep("waiting"); // already submitted
        } else {
          setStep("matchType"); // not submitted yet
        }
      } else {
        setForm({ ...form, email: loginEmail });
        setStep("signup"); // new user → sign up
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

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

      if (!data.ok) {
        return alert(data.error || "Signup failed");
      }

      const existingUser = data.user; // returned from backend

      setUser(existingUser);
      localStorage.setItem("emma_user", JSON.stringify(existingUser));

      // Decide which step based on submission status
      if (existingUser.submittedAt) {
        setStep("waiting"); // already submitted → go to countdown
      } else {
        setStep("matchType"); // not submitted → continue form
      }
    } catch (err) {
      console.error(err);
      alert("Network error during signup");
    }
  };

  // --- Add this function ---
  const renderDatePreferences = () => (
    <div className="content-card">
      <h2>Select Who You Would Like To Be Matched With?</h2>
      <div className="scroll-container">
        {["male", "female", "other"].map((gender) => (
          <label key={gender}>
            <input
              type="checkbox"
              checked={form.preferredGenders.includes(gender)}
              onChange={(e) => {
                const newPrefs = e.target.checked
                  ? [...form.preferredGenders, gender]
                  : form.preferredGenders.filter((g) => g !== gender);
                setForm({ ...form, preferredGenders: newPrefs });
              }}
            />
            {gender.charAt(0).toUpperCase() + gender.slice(1)}
          </label>
        ))}
      </div>
      <button onClick={() => setStep("questions")}>Continue</button>
    </div>
  );

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

      const newUser = {
        ...user,
        submittedAt: new Date().toISOString(),
        matchType,
        answers,
      };
      setUser(newUser);
      localStorage.setItem("emma_user", JSON.stringify(newUser));
      setStep("waiting"); // after submission → countdown
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
    if (!user) return;

    // Fetch latest info in case user already exists
    fetch(`${API_BASE}/check-email?email=${user.email}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          const latestUser = data.user;
          setUser(latestUser);
          localStorage.setItem("emma_user", JSON.stringify(latestUser));

          if (latestUser.submittedAt) {
            setStep("waiting"); // already submitted
          } else {
            setStep("matchType"); // not submitted
          }
        } else {
          // User somehow removed, reset
          localStorage.removeItem("emma_user");
          setUser(null);
          setStep("signup");
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);


  // --- UI Render ---
  const renderWaiting = () => (
    <div className="content-card">
      <h2>Your submission is saved.</h2>
      <p>Waiting for matchmaking...</p>
      <Countdown
        targetDate="2025-11-06T18:00:00-08:00" // 6PM PST on Nov 6, 2025
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
