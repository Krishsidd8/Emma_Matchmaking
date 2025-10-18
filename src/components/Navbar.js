// website can have text like "About the play" which the user
// can click to go to a page or link (i.e., /about)
import { Link } from "react-router"; // link wrapper to enable navigation with client-side routing

import "../styles/Navbar.css"

export function Navbar() {
  return (
    <div className="navbar">
      <Link to="/" className="nav-link">Home</Link>
      <Link to="/about" className="nav-link">About the play</Link>
      <Link to="/matchmaking" className="nav-link">Find a match!</Link>
      <Link to="/countdown" className="nav-link">Countdown</Link>
    </div>
  );
}

export default Navbar;