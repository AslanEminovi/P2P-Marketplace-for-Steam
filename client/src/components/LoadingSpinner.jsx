import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../styles/LoadingSpinner.css';

/**
 * LoadingSpinner component 
 * Displays a customizable loading spinner with different sizes and layout options
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = null,
  fullscreen = false,
  centered = false,
  text = null,
  overlay = false,
  className = ''
}) => {
  // Define size classes
  const sizeClasses = {
    xs: { fontSize: '0.75rem' },
    sm: { fontSize: '1rem' },
    md: { fontSize: '1.5rem' },
    lg: { fontSize: '2rem' },
    xl: { fontSize: '3rem' }
  };

  // Define color styles
  const colorStyle = color ? { color } : {};
  
  // Combine classes
  const containerClasses = [
    'loading-spinner-container',
    fullscreen ? 'fullscreen' : '',
    centered ? 'centered' : '',
    overlay ? 'overlay' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className="loading-spinner" style={{ ...sizeClasses[size], ...colorStyle }}>
        <FontAwesomeIcon icon={faSpinner} spin />
      </div>
      {text && <p className="loading-spinner-text">{text}</p>}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  color: PropTypes.string,
  fullscreen: PropTypes.bool,
  centered: PropTypes.bool,
  text: PropTypes.string,
  overlay: PropTypes.bool,
  className: PropTypes.string
};

export default LoadingSpinner; 