// import styles from .css files
import "./App.css";
import "./styles/Fonts.css";

// import page functions
import Home from "./pages/Home";
import Matchmaking from "./pages/Matchmaking";
import About from "./pages/About";

// import routing components
import { Routes, Route } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css"; // fonts and icons

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/matchmaking" element={<Matchmaking />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}

export default App;
