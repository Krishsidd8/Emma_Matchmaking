
// import styles from .css files
import "./App.css";
import "./styles/Fonts.css";

// import page functions
import Home from "./pages/Home";
import Matchmaking from "./pages/Matchmaking";
import About from "./pages/About";

// imports routing components from "react-router-dom" library
// allows for website to have interactive links
// website can have various pages (e.g., "emmamatchmaking.com/about")
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css"; // fonts and icons

// main app: controls layout and overarching styling
function App() {
  return (
    <div className="App">
      {/* React requires JSX expressions to have one parent element (i.e., a parent <div>) */}
      {/* Router parent element for routes group */}
      <Router>
        <Routes>
          <Route path="/home" exact element={<Home />} />
          <Route path="/matchmaking" exact element={<Matchmaking />} />
          <Route path="/about" exact element={<About />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;