import { useState, useEffect } from "react";
import "../styles/Matchmaking.css";
import "../styles/Fonts.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import Countdown from "../components/Countdown";

const API_BASE = process.env.REACT_APP_API_BASE || "https://emmamatchmaking-production.up.railway.app/api";
const ADMIN_EMAILS = ["youremail@students.esuhsd.org"]; // replace with your email

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

  useEffect(() => {
    if (user?.submittedAt) setStep("waiting");
  }, [user]);

  // --- API handlers ---
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

  const handleRunMatchmaking = async () => {
    try {
      const resp = await fetch(`${API_BASE}/run-matchmaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseline: 0.3 }),
      });
      const data = await resp.json();
      if (data.ok) alert("Matchmaking run successfully! Check console for results.");
      console.log("Matchmaking results:", data.results);
    } catch (err) {
      console.error(err);
      alert("Network error while running matchmaking");
    }
  };

  // --- UI render helpers ---
  const renderSignup = () => (
    <div className="content-card">
      <h2>Sign Up</h2>
      <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
      <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
      <input placeholder="Student Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
      <h2>Who are you interested in?</h2>
      {["male","female","other"].map((g) => (
        <label key={g}>
          <input
            type="checkbox"
            checked={form.preferredGenders.includes(g)}
            onChange={(e) => {
              const prefs = new Set(form.preferredGenders);
              e.target.checked ? prefs.add(g) : prefs.delete(g);
              setForm({ ...form, preferredGenders: Array.from(prefs) });
            }}
          />
          {g.charAt(0).toUpperCase() + g.slice(1)}
        </label>
      ))}
      <button onClick={() => setStep("questions")}>Continue</button>
    </div>
  );

  const renderQuestions = () => (
    <div className="content-card">
      <h2>Tell us about yourself!</h2>
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
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );

  const renderWaiting = () => (
    <div className="content-card">
      <h2>Your submission is saved.</h2>
      <p>You cannot submit again with the same email.</p>
      <Countdown />
      {user && ADMIN_EMAILS.includes(user.email) && (
        <button onClick={handleRunMatchmaking} style={{marginTop:"1rem", backgroundColor:"#ff7f50", color:"white"}}>
          Run Matchmaking (Admin)
        </button>
      )}
    </div>
  );

  const renderReveal = () => {
    if (!user) return <div className="content-card"><h2>No submission found.</h2></div>;
    return <div className="content-card"><h2>Matches Revealed</h2><pre>{JSON.stringify(fetchMyMatches(), null, 2)}</pre></div>;
  };

  const renderContent = () => {
    switch(step) {
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

// --- QUESTIONS DATA ---
const QUESTIONS = [
  { id: 1, text: "Your ideal weekend looks like:", options: ["Crafting or DIY projects","Binge-reading or journaling","Learning something new","Hosting a game night"] },
  { id: 2, text: "Your emotional reset button is:", options: ["Classical calm","Soulful blues","Indie vibes","Dance-pop energy"] },
  { id: 3, text: "You’re most drawn to films that are:", options: ["Deep and dramatic","Smart and funny","Mysterious and intense","Fantastical and epic"] },
  { id: 4, text: "Which sport reflects your energy best?", options: ["Strategic and solo (golf, tennis)","Fast and team-based (soccer, basketball)","Intense and focused (martial arts, boxing)","Wild and free (surfing, skiing)"] },
  { id: 5, text: "Your soul food is:", options: ["Mediterranean mezze","Sushi or ramen","Pasta or pastries","Tacos or curry"] },
  { id: 6, text: "You recharge by:", options: ["Hiking remote trails","Exploring historic cities","Lounging at a resort","Chasing festivals and fun"] },
  { id: 7, text: "Your fashion speaks:", options: ["Understated elegance","Bold and artsy","Trendy and expressive","Cozy and chill"] },
  { id: 8, text: "Your bookshelf leans toward:", options: ["Deep philosophy","Page-turning thrillers","Epic fantasy","Real-life stories"] },
  { id: 9, text: "You approach new tech like:", options: ["A curious explorer","A cautious optimist","A skeptical realist","A nostalgic minimalist"] },
  { id: 10, text: "You’re most motivated by:", options: ["Creative freedom","Security and structure","Team collaboration","Making a bold impact"] },
  { id: 11, text: "You learn best through:", options: ["Hands-on trial","Deep reading","Group discussion","Visual demos"] },
  { id: 12, text: "Your ideal hangout is:", options: ["Small and meaningful","Big and buzzing","One-on-one depth","Solo with occasional check-ins"] },
  { id: 13, text: "Your go-to reset is:", options: ["Meditation","Movement","Journaling","Cooking"] },
  { id: 14, text: "You feel most alive in:", options: ["Forests","Mountains","Oceans","Deserts"] },
  { id: 15, text: "You express yourself through:", options: ["Visual art","Music or dance","Theater or storytelling","Digital design"] },
  { id: 16, text: "You’re most articulate when:", options: ["Writing","Speaking","Showing","Doing"] },
  { id: 17, text: "Your guiding principle is:", options: ["Integrity","Compassion","Drive","Curiosity"] },
  { id: 18, text: "You value most in connection:", options: ["Loyalty","Shared adventures","Emotional support","Independence"] },
  { id: 19, text: "You laugh hardest at:", options: ["Dry wit","Absurd chaos","Clever satire","Wholesome silliness"] },
  { id: 20, text: "You manage time by:", options: ["Planning everything","Prioritizing on the fly","Trusting your gut","Using tech tools"] },
  { id: 21, text: "Your dream space feels like:", options: ["Rustic and warm","Sleek and modern","Colorful and creative","Minimal and serene"] },
  { id: 22, text: "Your beliefs are shaped by:", options: ["Tradition","Exploration","Reflection","Logic"] },
  { id: 23, text: "You handle tension by:", options: ["Addressing it head-on","Mediating calmly","Retreating to think","Expressing emotions"] },
  { id: 24, text: "Your favorite kind of memory is:", options: ["Quiet peace","Shared laughter","Personal wins","Spontaneous adventures"] },
  { id: 25, text: "You feel most creative when:", options: ["Making with your hands","Solving puzzles","Telling stories","Rearranging your space"] },
];

export default Matchmaking;
