import React, { useEffect, useRef } from "react";
import "../styles/InteractiveGrid.css"; // your CSS file

export default function InteractiveGrid() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;

    // clear old tiles if re-rendered
    container.innerHTML = "";

    // create the grid tiles
    const tile = document.createElement("div");
    tile.classList.add("tile");

    for (let i = 0; i < 1600; i++) {
      container.appendChild(tile.cloneNode());
    }
  }, []);

  return (
    <div className="interactive-grid-wrapper">
      <div id="container" ref={containerRef}>
        <div className="tile"></div>
      </div>
    </div>
  );
}