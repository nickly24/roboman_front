import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text, fullScreen = false }) => {
  const sizeClass = `spinner-${size}`;
  
  const content = (
    <div className="loading-spinner-container">
      <div className={`loading-spinner ${sizeClass}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {text && <div className="loading-spinner-text">{text}</div>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-spinner-fullscreen">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
