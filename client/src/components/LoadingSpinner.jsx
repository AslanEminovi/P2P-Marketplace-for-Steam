import React from 'react';
import '../styles/LoadingSpinner.css';

const LoadingSpinner = ({ size, fullHeight, message }) => {
  const spinnerStyle = {
    width: size || '50px',
    height: size || '50px'
  };

  return (
    <div className={`spinner-container ${fullHeight ? 'full-height' : ''}`}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={spinnerStyle}></div>
        {message && <p className="spinner-message">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingSpinner; 