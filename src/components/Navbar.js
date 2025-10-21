import { Link, useLocation } from "react-router-dom";
import "../styles/Navbar.css";

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="left-slot"></div>

        <div className="logo">
          <h1>Emma's Matchmaking</h1>
        </div>

        <div className="pages">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Home
          </Link>
          <Link
            to="/about"
            className={`nav-link ${location.pathname === "/about" ? "active" : ""}`}
          >
            About the Play
          </Link>
          <Link
            to="/matchmaking"
            className={`nav-link ${location.pathname === "/matchmaking" ? "active" : ""}`}
          >
            Matchmaking
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
