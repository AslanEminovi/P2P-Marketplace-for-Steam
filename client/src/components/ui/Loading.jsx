import React from 'react';
import './Loading.css';

const Loading = ({ size = 'medium', text = 'Loading...', fullScreen = false }) => {
  const spinnerClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large',
  };

  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className="loading-container">
          <div className={`spinner ${spinnerClasses[size]}`}></div>
          {text && <p className="loading-text">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-container">
      <div className={`spinner ${spinnerClasses[size]}`}></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default Loading; 