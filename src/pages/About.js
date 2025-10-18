import "../styles/About.css";

import InteractiveGrid from "../animation/InteractiveGrid";
import { Link } from "react-router-dom";

function About() {
  return (
    <div className="header">
      <InteractiveGrid />
      <div className="info">
        <h1 className="title">about emma</h1>
        Emma is a witty and theatrical adaptation of Jane Austen’s beloved
        novel, following the charming yet meddlesome Emma Woodhouse as she
        navigates romantic entanglements in early 19th-century England. Though
        she vows never to marry, Emma delights in matchmaking for others,
        particularly her friend Harriet Smith, despite warnings from the
        sensible Mr. Knightley. Her plans go awry when Mr. Elton, whom she
        intended for Harriet, reveals his interest in Emma instead. The arrival
        of Jane Fairfax and Frank Churchill adds further intrigue and confusion,
        prompting Emma to confront her own feelings and misjudgments.
        Ultimately, she realizes her love for Mr. Knightley, leading to
        heartfelt resolutions and personal growth. Blending humor, heart, and
        period charm, the play explores themes of love, friendship, social
        class, and self-awareness, with notable adaptations offering tones that
        range from classic elegance to screwball comedy
      </div>
      <Link className="home" to="/">
        home
      </Link>
    </div>
  );
}

export default About;