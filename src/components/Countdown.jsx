import React, { useState, useEffect } from "react";
import "../styles/Countdown.css";

const Countdown = ({ onFinish }) => {
  // Fixed target date
  const targetDate = new Date('2025-11-02T07:30:00-07:00').getTime();
  const calculateTimeRemaining = () => {
    const now = new Date().getTime();
    return Math.max(targetDate - now, 0);s
  };

  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Trigger onFinish when time reaches 0
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
