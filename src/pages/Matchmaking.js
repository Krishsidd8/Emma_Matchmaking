import { useState, useEffect } from "react";
import "../styles/Matchmaking.css";
import "../styles/Fonts.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import Countdown from "../components/Countdown";

const API_BASE = process.env.REACT_APP_API_BASE || "https://emmamatchmaking-production.up.railway.app/api";

function Matchmaking() {
  const [step, setStep] = useState("signup");
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
    const saved = JSON.parse(localStorage.getItem("emma_user")) || null;
    return saved;
  });
  const [myMatches, setMyMatches] = useState(null);

  const ADMIN_EMAILS = ["krish@students.esuhsd.org"]; // Replace with your email

  const handleRunMatchmaking = async () => {
    try {
      const resp = await fetch(`${API_BASE}/run-matchmaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseline: 0.3 }) // optional baseline
      });
      const data = await resp.json();
      if (data.ok) {
        alert("Matchmaking run successfully! Check console for results.");
        console.log("Matchmaking Results:", data.results);
      } else {
        alert("Error running matchmaking");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while running matchmaking");
    }
  };

  useEffect(() => {
    if (user?.submittedAt) setStep("waiting");
  }, [user]);

  useEffect(() => {
    if (step === "reveal" && user?.email) {
      fetch(`${API_BASE}/my-match?email=${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) setMyMatches(data.match);
        })
        .catch(console.error);
    }
  }, [step, user]);

  const handleSelectMatchType = (type) => {
    setMatchType(type);
    setStep(type === "date" ? "datePreferences" : "questions");
  };

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
        alert(data.error || "Signup failed");
        return;
      }
      const newUser = { ...form, id: data.user_id };
      localStorage.setItem("emma_user", JSON.stringify(newUser));
      setUser(newUser);
      setStep("matchType");
    } catch (err) {
      console.error(err);
      alert("Network error during signup");
    }
  };

  const handleSubmit = async () => {
    if (!matchType) {
      alert("Select a match type first");
      return;
    }
    const unanswered = QUESTIONS.some((q) => !answers[q.id]);
    if (unanswered) {
      alert("Complete all questions");
      return;
    }
    if (!user?.email) {
      alert("Missing user email — signup first");
      return;
    }
    try {
      const resp = await fetch(`${API_BASE}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, matchType, answers }),
      });
      const data = await resp.json();
      if (!data.ok) {
        alert(data.error || "Submission failed");
        return;
      }
      const newUser = { ...user, matchType, answers, submittedAt: new Date().toISOString() };
      setUser(newUser);
      localStorage.setItem("emma_user", JSON.stringify(newUser));
      setStep("waiting");
    } catch (err) {
      console.error(err);
      alert("Network error during submit");
    }
  };

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
    { id: 12, text: "Your pet peeve is:", options: ["Disorganization", "Noise", "Dishonesty", "Overly rigid rules"] },
    { id: 13, text: "Your go-to comfort activity:", options: ["Cooking", "Music", "Exercise", "Crafting"] },
    { id: 14, text: "Your dream vacation includes:", options: ["Mountains", "Beaches", "Cities", "Countryside"] },
    { id: 15, text: "Your problem-solving style:", options: ["Analytical", "Creative", "Collaborative", "Quick and decisive"] },
    { id: 16, text: "Your favorite season:", options: ["Spring", "Summer", "Autumn", "Winter"] },
    { id: 17, text: "You feel most energized by:", options: ["Solitude", "Small group chats", "Large gatherings", "Spontaneous adventures"] },
    { id: 18, text: "Your social media style:", options: ["Curated and aesthetic", "Funny and relatable", "Active and engaging", "Minimal and rare"] },
    { id: 19, text: "Your ideal living space:", options: ["Minimalist", "Eclectic", "Tech-savvy", "Cozy and inviting"] },
    { id: 20, text: "Your morning routine:", options: ["Meditation and coffee", "Workout then work", "Quick shower and go", "Sleep in and brunch"] },
    { id: 21, text: "Your learning style:", options: ["Step-by-step", "Big-picture", "Interactive", "Self-guided"] },
    { id: 22, text: "Your weekend plans:", options: ["Quiet retreat", "Party with friends", "Outdoor adventure", "Art/culture outing"] },
    { id: 23, text: "Your conflict resolution:", options: ["Calm discussion", "Humor to defuse", "Direct and firm", "Avoid and reflect"] },
    { id: 24, text: "Your favorite beverage:", options: ["Tea", "Coffee", "Smoothies", "Cocktails"] },
    { id: 25, text: "You express gratitude by:", options: ["Writing notes", "Verbal appreciation", "Acts of service", "Small gifts"] },
  ];

  const renderReveal = () => {
    if (!user) return <div className="reveal"><h2>Matches Revealed</h2><p>No submission found.</p></div>;
    if (!myMatches) return <div>Loading your matches...</div>;
    return (
      <div className="reveal">
        <h2>Your Matches</h2>
        <pre>{JSON.stringify(myMatches, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div>
      <Navbar />
      <InteractiveGrid />
      {step === "signup" && (
        <div className="signup">
          <h1>Sign up</h1>
          <input placeholder="First Name" value={form.firstName} onChange={(e)=>setForm({...form, firstName:e.target.value})}/>
          <input placeholder="Last Name" value={form.lastName} onChange={(e)=>setForm({...form, lastName:e.target.value})}/>
          <input placeholder="Email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})}/>
          <input placeholder="Grade" value={form.grade} onChange={(e)=>setForm({...form, grade:e.target.value})}/>
          <input placeholder="Gender" value={form.gender} onChange={(e)=>setForm({...form, gender:e.target.value})}/>
          <button onClick={handleSignup}>Sign Up</button>
        </div>
      )}
      {step === "matchType" && (
        <div>
          <h2>Choose Match Type</h2>
          <button onClick={()=>handleSelectMatchType("friend")}>Friends</button>
          <button onClick={()=>handleSelectMatchType("date")}>Dates</button>
          <button onClick={()=>handleSelectMatchType("group")}>Groups</button>
        </div>
      )}
      {step === "questions" && (
        <div>
          <h2>Answer Questions</h2>
          {QUESTIONS.map((q)=>(
            <div key={q.id}>
              <p>{q.text}</p>
              {q.options.map((opt)=>
                <label key={opt}>
                  <input type="radio" name={`q${q.id}`} value={opt} checked={answers[q.id]===opt} onChange={()=>setAnswers({...answers, [q.id]:opt})}/>
                  {opt}
                </label>
              )}
            </div>
          ))}
          <button onClick={handleSubmit}>Submit Answers</button>
        </div>
      )}
      {step === "waiting" && (
        <div>
          <h2>Waiting for matches...</h2>
          <Countdown />
          <button onClick={()=>setStep("reveal")}>Reveal Matches</button>

          {user && ADMIN_EMAILS.includes(user.email) && (
            <div style={{marginTop:"20px"}}>
              <button onClick={handleRunMatchmaking} style={{backgroundColor:"#ff7f50", color:"white"}}>
                Run Matchmaking (Admin)
              </button>
            </div>
          )}
        </div>
      )}
      {step === "reveal" && renderReveal()}
    </div>
  );
}

export default Matchmaking;
