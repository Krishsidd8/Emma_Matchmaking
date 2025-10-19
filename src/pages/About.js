import "../styles/About.css";
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import { useState, useEffect } from "react";

import leftArrow from "../assets/leftarrow.png";
import rightArrow from "../assets/rightarrow.png";

import theater from "../assets/theater.png";
import masks from "../assets/masks.png";
import friends from "../assets/friendship.png";

function About() {
  const slides = [
    {
      title: "Planting the Seeds of Connection",
      text: `We believe that love, like growth, begins with curiosity and care.
      Every match we make is a chance to nurture authentic connections,
      helping people grow closer through empathy, laughter, and self-discovery.`,
      image: theater,
    },
    {
      title: "Inspired by Austen’s Emma",
      text: `Our story draws inspiration from Jane Austen’s *Emma* — a tale of
      matchmaking, misunderstanding, and growth. We aim to bring that same
      blend of humor, introspection, and warmth to the modern age through
      interactive storytelling and human-centered design.`,
      image: masks,
    },
    {
      title: "Cultivating Growth Together",
      text: `Just as a garden flourishes with care, our community thrives on
      collaboration and creativity. Every project we build is a shared effort
      to foster kindness, curiosity, and connection—because love, in all forms,
      deserves space to grow.`,
      image: friends,
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
  const interval = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, 6000);
  return () => clearInterval(interval);
  }, [slides.length]);
  
  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const handlePrev = () => {setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);  };

  const { title, text, image } = slides[currentIndex];

  return (
    <div className="about-container">
      <Navbar />
      <InteractiveGrid />

      <div className="about-big-box carousel">
        {/* Slide content */}
        <div key={currentIndex} className="about-section fade-in">
          <div className="about-text">
            <h1>{title}</h1>
            <p>{text}</p>
          </div>
          <div className="about-image">
            <img src={image} alt={title} />
          </div>
        </div>

        {/* Navigation arrows */}
        <button className="arrow left" onClick={handlePrev}>
          <img src={leftArrow} alt="Previous" className="arrow-icon" />
        </button>
        <button className="arrow right" onClick={handleNext}>
          <img src={rightArrow} alt="Next" className="arrow-icon" />
        </button>

        {/* Navigation dots */}
        <div className="carousel-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`dot ${i === currentIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(i)}
            ></span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default About;
