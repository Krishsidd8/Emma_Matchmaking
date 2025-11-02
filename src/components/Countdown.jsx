import React, { useState, useEffect } from "react";

import "../styles/Countdown.css";

const CountdownTimer = () => {
  // const targetDate = "2025-11-06T23:59:00-07:00";
  const targetDate = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now


  // Initialize timeRemaining immediately
  const calculateTimeRemaining = () => {
    const now = new Date().getTime();
    const eventTime = new Date(targetDate).getTime();
    return Math.max(eventTime - now, 0);
  };

  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining());

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [targetDate]);

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
              <text className="d">d</text>
            </h2>
            <p className="p">days</p>
          </div>
          <div className="time">
            <h2 className="num">
              {hours.toString().padStart(2, "0")}
              <text className="h">h</text>
            </h2>
            <p className="p">hours</p>
          </div>
          <div className="time">
            <h2 className="num">
              {minutes.toString().padStart(2, "0")}
              <text className="m">m</text>
            </h2>
            <p className="p">minutes</p>
          </div>
          <div className="time">
            <h2 className="num">
              {seconds.toString().padStart(2, "0")}
              <text className="s">s</text>
            </h2>
            <p className="p">seconds</p>
          </div>
        </div>
      </div>
    );
  };

  return <div>{formatTime(timeRemaining)}</div>;
};

export default CountdownTimer;