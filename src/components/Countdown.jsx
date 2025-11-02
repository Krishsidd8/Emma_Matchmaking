import React, { useState, useEffect } from "react";
import { QUESTIONS } from "../components/Questions.js";

const Countdown = ({ durationMinutes = 5, onFinish }) => {
  const targetTime = Date.now() + durationMinutes * 60 * 1000;
  const [timeRemaining, setTimeRemaining] = useState(targetTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeRemaining(0);
        onFinish?.();
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, onFinish]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}`;
  };

  return (
    <div style={{ marginTop: "1rem", fontSize: "1.5rem" }}>
      Time remaining: {formatTime(timeRemaining)}
    </div>
  );
};

export default Countdown;
