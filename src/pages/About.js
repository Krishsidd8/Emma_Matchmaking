import "../styles/About.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import { Link } from "react-router-dom";

import theater from "../assets/theater.png";

function About() {
  return (
    <div className="about-container">
      <Navbar />
      <InteractiveGrid />

      <div className="about-big-box">
        {/* Section 1 */}
        <div className="about-section">
          <div className="about-text">
            <h1>Planting the Seeds of Connection</h1>
            <p>
              We believe that love, like growth, begins with curiosity and care.
              Every match we make is a chance to nurture authentic connections,
              helping people grow closer through empathy, laughter, and
              self-discovery.
            </p>
          </div>
          <div className="about-image">
            <img src={theater} alt="Planting connection" />
          </div>
        </div>

        {/* Section 2 */}
        <div className="about-section">
          <div className="about-image">
            <img src={theater} alt="Inspired by Emma" />
          </div>
          <div className="about-text">
            <h1>Inspired by Austen’s <em>Emma</em></h1>
            <p>
              Our story draws inspiration from Jane Austen’s <em>Emma</em>—a
              tale of matchmaking, misunderstanding, and growth. We aim to bring
              that same blend of humor, introspection, and warmth to the modern
              age through interactive storytelling and human-centered design.
            </p>
          </div>
          
        </div>

        {/* Section 3 */}
        <div className="about-section">
          <div className="about-text">
            <h1>Cultivating Growth Together</h1>
            <p>
              Just as a garden flourishes with care, our community thrives on
              collaboration and creativity. Every project we build is a shared
              effort to foster kindness, curiosity, and connection—because love,
              in all forms, deserves space to grow.
            </p>
            <Link to="/" className="back-home">
              ← Back Home
            </Link>
          </div>
          <div className="about-image">
            <img src={theater} alt="Growth and collaboration" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
