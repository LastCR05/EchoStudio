import React, { useEffect, useState, useRef } from 'react';

const EqualizerBars = ({
  isBarsPlaying = false,
  barCount = 5,
  color = '#2b44dd',
  size = 'sm',
}) => {
  const [heights, setHeights] = useState([]);
  const animationRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Set dimensions based on size prop
  let barWidth, gap, containerHeight;
  switch (size) {
    case 'sm':
      barWidth = 1.5;
      gap = 1;
      containerHeight = 12;
      break;
    case 'lg':
      barWidth = 3;
      gap = 2;
      containerHeight = 24;
      break;
    case 'md':
    default:
      barWidth = 2.4;
      gap = 2.1;
      containerHeight = 20;
      break;
  }

  useEffect(() => {
    // Initialize heights
    setHeights(Array(barCount).fill(0.3));

    // Don't animate if not playing
    if (!isBarsPlaying) {
      return;
    }

    // Set up timing variables for smoother animation
    const updateInterval = 150; // milliseconds between updates

    const animateBars = (timestamp) => {
      // Only update if enough time has passed
      if (timestamp - lastUpdateRef.current >= updateInterval) {
        lastUpdateRef.current = timestamp;

        // Generate new random heights with more musical pattern
        const newHeights = Array(barCount)
          .fill(0)
          .map(() => {
            // More natural range for bar heights (0.3 to 0.9)
            return 0.3 + Math.random() * 0.6;
          });

        setHeights(newHeights);
      }

      animationRef.current = requestAnimationFrame(animateBars);
    };

    // Start the animation
    animationRef.current = requestAnimationFrame(animateBars);

    // Clean up
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isBarsPlaying, barCount]);

  return (
    <div
      className="flex items-end justify-center"
      style={{ height: `${containerHeight}px` }}
    >
      {heights.map((height, index) => (
        <div
          key={index}
          className="flex-shrink-0 transition-all"
          style={{
            height: `${height * containerHeight}px`,
            width: `${barWidth}px`,
            marginLeft: index === 0 ? '0' : `${gap}px`,
            backgroundColor: color,
            transformOrigin: 'bottom',
            transition: 'height 0.1s ease-in-out',
          }}
        />
      ))}
    </div>
  );
};

export default EqualizerBars;
