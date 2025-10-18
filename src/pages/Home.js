import "../styles/Home.css";

import InteractiveGrid from "../animation/InteractiveGrid";
import CountdownTimer from "../components/Countdown";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="appheader">
      <InteractiveGrid />
      <div className="timer">
        <CountdownTimer />
      </div>
      <div className="until">
        <p>until pairings release!</p>
      </div>
      <Link className="find" to="/matchmaking">
        find a match
      </Link>
      <Link className="about" to="/about">
      about emma
      </Link>
    </div>
  );
}

export default Home;