import "../styles/Home.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import CountdownTimer from "../components/Countdown";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="appheader">
      <InteractiveGrid />
      
      <nav className="navbar">
        <Navbar />
      </nav>

      <div className="content-card">
        <div className="timer">
          <CountdownTimer />
        </div>
        <Link className="find" to="/matchmaking">
          Find a Match!
        </Link>
        <Link className="about" to="/about">
          About the Play
        </Link>
      </div>
    </div>
  );
}

export default Home;