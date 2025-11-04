import React, { useState, useEffect } from "react";
import "../styles/Countdown.css";

// PST offset is -8 hours, PDT daylight saving is -7 hours
const Countdown = ({ onFinish }) => {
  // Returns target timestamp in milliseconds (UTC)
  const getTargetTime = () => {
    // Nov 3, 2025 at 11:05 PM PST
    // Month is 0-indexed in JS Date constructor
    return new Date(Date.UTC(2025, 10, 4, 8, 5, 0)); // UTC equivalent of 23:05 PST
  };


  const [timeRemaining, setTimeRemaining] = useState(() => Math.max(getTargetTime() - Date.now(), 0));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(getTargetTime() - Date.now(), 0);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onFinish) onFinish();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onFinish]);

  const formatTime = (time) => {
    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / (1000 * 60)) % 60);
    const hours = Math.floor((time / (1000 * 60 * 60)) % 24);
    const days = Math.floor(time / (1000 * 60 * 60 * 24));

    return (
      <div className="hero">
        <div className="timebox">
          <div className="time">
            <h2 className="num">
              {days.toString().padStart(2, "0")}
              <span className="d">d</span>
            </h2>
            <p className="p">days</p>
          </div>
          <div className="time">
            <h2 className="num">
              {hours.toString().padStart(2, "0")}
              <span className="h">h</span>
            </h2>
            <p className="p">hours</p>
          </div>
          <div className="time">
            <h2 className="num">
              {minutes.toString().padStart(2, "0")}
              <span className="m">m</span>
            </h2>
            <p className="p">minutes</p>
          </div>
          <div className="time">
            <h2 className="num">
              {seconds.toString().padStart(2, "0")}
              <span className="s">s</span>
            </h2>
            <p className="p">seconds</p>
          </div>
        </div>
      </div>
    );
  };

  return <div>{formatTime(timeRemaining)}</div>;
};

export default Countdown;
