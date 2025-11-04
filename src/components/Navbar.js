import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import "../styles/Navbar.css";

export function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="logo">
          <h1>Emma's Matchmaking</h1>
        </div>

        {/* Hamburger toggle button */}
        <button
          className={`menu-toggle ${menuOpen ? "open" : ""}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>

        {/* Navigation links */}
        <div className={`pages ${menuOpen ? "open" : ""}`}>
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Home
          </Link>
          <Link
            to="/about"
            className={`nav-link ${location.pathname === "/about" ? "active" : ""}`}
            onClick={closeMenu}
          >
            About the Play
          </Link>
          <Link
            to="/matchmaking"
            className={`nav-link ${location.pathname === "/matchmaking" ? "active" : ""}`}
            onClick={closeMenu}
          >
            Matchmaking
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
