import "../styles/About.css";
import "../styles/Fonts.css"
import Navbar from "../components/Navbar";
import InteractiveGrid from "../animation/InteractiveGrid";
import { useState, useEffect } from "react";

import leftArrow from "../assets/leftarrow.png";
import rightArrow from "../assets/rightarrow.png";

import firstImage from "../assets/1.png";
import secondImage from "../assets/2.png";
import thirdImage from "../assets/3.png";

function About() {
  const slides = [
    {
      title: "A Story Comes Alive",
      text: `Step into the world of Emma, a timeless story of wit, charm, and 
      intrigue, now brought to life on stage by the talented students of EVHS. 
      Join us as we follow Emma’s adventures in love, friendship, and self-discovery, 
      where every scene bursts with humor and heart.`,
      image: firstImage,
    },
    {
      title: "Showtimes & Venue",
      text: `Catch the magic at Evergreen Valley High School Theater, 3300 Quimby Rd, 
      San Jose, CA 95148, on November 6th, 7th, and 8th. Performances start at 7:00 PM, 
      with doors opening 30 minutes prior. Be sure to arrive early to grab your seat!`,
      image: secondImage,
    },
    {
      title: "An Evening for Everyone",
      text: `Whether you’re a longtime fan of the story or experiencing Emma for the first 
      time, our production promises laughter, surprises, and unforgettable performances. 
      Don’t miss this chance to support our school’s budding actors and enjoy a night of 
      exceptional theater in the heart of EVHS.`,
      image: thirdImage,
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
        <div key={currentIndex} className="about-section">
          <div className="scroll-container">
            <div className="about-text">
              <h1>{title}</h1>
              <p>{text}</p>
            </div>
            <div className="about-image">
              <img src={image} alt={title} />
            </div>
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
