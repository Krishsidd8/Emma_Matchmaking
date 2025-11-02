import React, { useState, useEffect, useRef } from "react";
import "../styles/Countdown.css";

const CountdownTimer = () => {
  // Set target date once using useRef to avoid resetting on re-render
  const targetDate = useRef(new Date(Date.now() + 10 * 60 * 1000)); // 10 minutes from now

  const calculateTimeRemaining = () => {
    const now = new Date().getTime();
    const eventTime = targetDate.current.getTime();
    return Math.max(eventTime - now, 0);
  };

  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining());

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

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
              {String(days).padStart(2, "0")}
              <span className="d">d</span>
            </h2>
            <p className="p">days</p>
          </div>
          <div className="time">
            <h2 className="num">
              {String(hours).padStart(2, "0")}
              <span className="h">h</span>
            </h2>
            <p className="p">hours</p>
          </div>
          <div className="time">
            <h2 className="num">
              {String(minutes).padStart(2, "0")}
              <span className="m">m</span>
            </h2>
            <p className="p">minutes</p>
          </div>
          <div className="time">
            <h2 className="num">
              {String(seconds).padStart(2, "0")}
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

export default CountdownTimer;