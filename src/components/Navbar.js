import { Link, useLocation } from "react-router-dom";
import "../styles/Navbar.css";

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* optional left slot (keeps grid balanced). You can remove it or add an icon later */}
        <div className="left-slot"></div>

        <div className="logo">
          <Link
            to="/home"
            className={`nav-link ${location.pathname === "/home" ? "active" : ""}`}
          >
            Emma's Matchmaking
          </Link>
        </div>

        <div className="pages">
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
