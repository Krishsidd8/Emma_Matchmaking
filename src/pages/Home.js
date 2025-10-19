import "../styles/Home.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="appheader">
      <InteractiveGrid />
      
      <nav className="navbar">
        <Navbar />
      </nav>

      <div className="content-card">
        <h1>Every Play Needs Its Perfect Cast</h1>
        <p>Find your Friend, Group, or Date for the Show!</p>
        <Link className="find" to="/matchmaking">
          Find a Match!
        </Link>
        <Link className="about" to="/about">
          Learn About the Play
        </Link>
      </div>
    </div>
  );
}

export default Home;