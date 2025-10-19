import { useState, useEffect } from "react";
import "../styles/Matchmaking.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import Countdown from "../components/Countdown";
import { Link } from "react-router-dom";


function Matchmaking() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("emma_user")) || null);
  const [step, setStep] = useState(user ? "waiting" : "signup");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", grade: "" });
  const [matchType, setMatchType] = useState("");
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (user) localStorage.setItem("emma_user", JSON.stringify(user));
  }, [user]);

  // Handlers
  const handleSignup = () => {
    if(!form.firstName || !form.lastName || !form.email || !form.grade) {
      alert('Complete all fields');
      return;
    }

    if (!form.email.endsWith("@students.esuhsd.org")) return alert("Use a valid student email");

    const stored = localStorage.getItem("emma_user");
    if (stored && JSON.parse(stored).email === form.email) {
      setUser(JSON.parse(stored));
      setStep("waiting");
      return;
    }

    setStep("matchType");
  };

  const handleSelectMatchType = (type) => {
    setMatchType(type);
    setStep("questions");
  };

  const handleSubmit = () => {
  // Ensure match type selected
  if (!matchType) {
    alert("Select a match type first");
    return;
  }

  // Ensure all 25 questions answered
  const unanswered = QUESTIONS.some(q => !answers[q.id]);
  if (unanswered) {
    alert("Complete all questions");
    return;
  }

  // Save user
  const newUser = {
    ...form,
    matchType,
    answers,
    submittedAt: new Date().toISOString(),
    fullName: `${form.firstName} ${form.lastName}`
  };

  setUser(newUser);
  localStorage.setItem("emma_user", JSON.stringify(newUser));
  setStep("waiting");
};


  // Render Sections
  const renderSignup = () => (
  <div className="matchmaking">
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
    <select
      value={form.grade}
      onChange={(e) => setForm({ ...form, grade: e.target.value })}
    >
      <option value="">Select Grade</option>
      <option>9th</option>
      <option>10th</option>
      <option>11th</option>
      <option>12th</option>
    </select>
    <button onClick={handleSignup}>Continue</button>
  </div>
);


  const renderMatchType = () => (
    <div className="match-type">
      <h2>Choose Match Type</h2>
      <button onClick={() => handleSelectMatchType("friend")}>Friend</button>
      <button onClick={() => handleSelectMatchType("date")}>Date</button>
      <button onClick={() => handleSelectMatchType("group")}>Group</button>
    </div>
  );


  const QUESTIONS = [
  { id: 1, text: "Your ideal weekend looks like:", options: ["Crafting or DIY projects", "Binge-reading or journaling", "Learning something new", "Hosting a game night"] },
  { id: 2, text: "Your emotional reset button is:", options: ["Classical calm", "Soulful blues", "Indie vibes", "Dance-pop energy"] },
  { id: 3, text: "You’re most drawn to films that are:", options: ["Deep and dramatic", "Smart and funny", "Mysterious and intense", "Fantastical and epic"] },
  { id: 4, text: "Which sport reflects your energy best?", options: ["Strategic and solo (golf, tennis)", "Fast and team-based (soccer, basketball)", "Intense and focused (martial arts, boxing)", "Wild and free (surfing, skiing)"] },
  { id: 5, text: "Your soul food is:", options: ["Mediterranean mezze", "Sushi or ramen", "Pasta or pastries", "Tacos or curry"] },
  { id: 6, text: "You recharge by:", options: ["Hiking remote trails", "Exploring historic cities", "Lounging at a resort", "Chasing festivals and fun"] },
  { id: 7, text: "Your fashion speaks:", options: ["Understated elegance", "Bold and artsy", "Trendy and expressive", "Cozy and chill"] },
  { id: 8, text: "Your bookshelf leans toward:", options: ["Deep philosophy", "Page-turning thrillers", "Epic fantasy", "Real-life stories"] },
  { id: 9, text: "You approach new tech like:", options: ["A curious explorer", "A cautious optimist", "A skeptical realist", "A nostalgic minimalist"] },
  { id: 10, text: "You’re most motivated by:", options: ["Creative freedom", "Security and structure", "Team collaboration", "Making a bold impact"] },
  { id: 11, text: "You learn best through:", options: ["Hands-on trial", "Deep reading", "Group discussion", "Visual demos"] },
  { id: 12, text: "Your ideal hangout is:", options: ["Small and meaningful", "Big and buzzing", "One-on-one depth", "Solo with occasional check-ins"] },
  { id: 13, text: "Your go-to reset is:", options: ["Meditation", "Movement", "Journaling", "Cooking"] },
  { id: 14, text: "You feel most alive in:", options: ["Forests", "Mountains", "Oceans", "Deserts"] },
  { id: 15, text: "You express yourself through:", options: ["Visual art", "Music or dance", "Theater or storytelling", "Digital design"] },
  { id: 16, text: "You’re most articulate when:", options: ["Writing", "Speaking", "Showing", "Doing"] },
  { id: 17, text: "Your guiding principle is:", options: ["Integrity", "Compassion", "Drive", "Curiosity"] },
  { id: 18, text: "You value most in connection:", options: ["Loyalty", "Shared adventures", "Emotional support", "Independence"] },
  { id: 19, text: "You laugh hardest at:", options: ["Dry wit", "Absurd chaos", "Clever satire", "Wholesome silliness"] },
  { id: 20, text: "You manage time by:", options: ["Planning everything", "Prioritizing on the fly", "Trusting your gut", "Using tech tools"] },
  { id: 21, text: "Your dream space feels like:", options: ["Rustic and warm", "Sleek and modern", "Colorful and creative", "Minimal and serene"] },
  { id: 22, text: "Your beliefs are shaped by:", options: ["Tradition", "Exploration", "Reflection", "Logic"] },
  { id: 23, text: "You handle tension by:", options: ["Addressing it head-on", "Mediating calmly", "Retreating to think", "Expressing emotions"] },
  { id: 24, text: "Your favorite kind of memory is:", options: ["Quiet peace", "Shared laughter", "Personal wins", "Spontaneous adventures"] },
  { id: 25, text: "You feel most creative when:", options: ["Making with your hands", "Solving puzzles", "Telling stories", "Rearranging your space"] }
];


  const renderQuestions = () => (
  <div className="questions-container">
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

  const renderWaiting = () => {
    return (
      <div className="waiting">
        <h1>Your submission is saved. You cannot submit again with the same email.</h1>
        <div className="timer">
          <Countdown />
        </div>
        <p>UNTIL PAIRINGS RELEASE!</p>
      </div>
    );
  };

  const renderReveal = () => {
    if (!user) return <div className="reveal"><h2>Matches Revealed</h2><p>No submission found.</p></div>;
    return (
      <div className="reveal">
        <h2>Matches Revealed</h2>
        <div><strong>Name:</strong> {user.name}</div>
        <div><strong>Grade:</strong> {user.grade}</div>
        <div><strong>Match Type:</strong> {user.matchType}</div>
        <div><strong>Answers:</strong><pre>{JSON.stringify(user.answers)}</pre></div>
      </div>
    );
  };

  const renderContent = () => {
    switch (step) {
      case "signup": return renderSignup();
      case "matchType": return renderMatchType();
      case "questions": return renderQuestions();
      case "waiting": return renderWaiting();
      case "reveal": return renderReveal();
      default: return null;
    }
  };

  return (
    <div className="appheader">
      <InteractiveGrid />
      <nav className="navbar">
        <Navbar />
      </nav>
      <div className="content-card">
        {renderContent()}
      </div>
    </div>
  );
}

export default Matchmaking;
