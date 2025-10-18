import "../styles/Matchmaking.css";

import InteractiveGrid from "../animation/InteractiveGrid";
import { Link } from "react-router-dom";

function Matchmaking() {
  return (
    <div className="appheader">
      <InteractiveGrid />
      <Link className="find" to="/">
        start
      </Link>
    </div>
  );
}

export default Matchmaking;