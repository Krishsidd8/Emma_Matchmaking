import React, { useState, useEffect, useRef } from "react";

const Countdown = ({ onFinish }) => {
  const targetDate = useRef(new Date(Date.now() + 5 * 60 * 1000)); // 5 minutes

  const calculateTimeRemaining = () => {
    const now = new Date().getTime();
    return Math.max(targetDate.current.getTime() - now, 0);
  };

  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining());

  // Generate 199 bots
  const generateBots = () => {
    const bots = [];
    for (let i = 0; i < 199; i++) {
      const botAnswers = {};
      QUESTIONS.forEach((q) => {
        const randomOption = q.options[Math.floor(Math.random() * q.options.length)];
        botAnswers[q.id] = randomOption;
      });
      bots.push({
        id: `bot-${i + 1}`,
        firstName: `Bot${i + 1}`,
        email: `bot${i + 1}@bots.com`,
        matchType: "friend",
        answers: botAnswers,
        submittedAt: new Date().toISOString(),
      });
    }
    return bots;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Clear previous data
        localStorage.removeItem("emma_user");

        const bots = generateBots();
        if (onFinish) onFinish(bots);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onFinish]);

  const minutes = String(Math.floor((timeRemaining / 1000 / 60) % 60)).padStart(2, "0");
  const seconds = String(Math.floor((timeRemaining / 1000) % 60)).padStart(2, "0");

  return (
    <div className="hero">
      <div className="timebox">
        <div className="time">
          <h2 className="num">{minutes}<span className="m">m</span></h2>
          <p className="p">minutes</p>
        </div>
        <div className="time">
          <h2 className="num">{seconds}<span className="s">s</span></h2>
          <p className="p">seconds</p>
        </div>
      </div>
    </div>
  );
};

export default Countdown;
