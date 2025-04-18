import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../styles/LoadingSpinner.css';

const LoadingSpinner = ({ size = "1x", className = "" }) => {
  return (
    <div className={`loading-spinner-container ${className}`}>
      <FontAwesomeIcon
        icon={faSpinner}
        spin
        size={size}
        className="loading-spinner"
      />
    </div>
  );
};

export default LoadingSpinner; 