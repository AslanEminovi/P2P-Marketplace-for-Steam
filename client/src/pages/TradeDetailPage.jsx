import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faExchangeAlt } from '@fortawesome/free-solid-svg-icons';
import TradeDetails from '../components/TradeDetails';
import '../styles/TradeDetails.css';

const TradeDetailPage = () => {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = React.useState(null);

  // Handle error state and redirection
  useEffect(() => {
    if (error) {
      console.error('Trade error:', error);
      
      // Check if there's a suggested redirect URL in the error
      if (error.redirectUrl) {
        // Show notification with option to redirect
        if (window.showNotification) {
          window.showNotification(
            'Error',
            error.message || 'Trade not found or you don\'t have permission to view it.',
            'ERROR',
            10000,
            () => navigate(error.redirectUrl)
          );
        }
        
        // Set up timer to auto-redirect after 5 seconds
        const timer = setTimeout(() => {
          navigate(error.redirectUrl);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [error, navigate]);

  // Render error state with redirect option
  if (error) {
    return (
      <div className="trade-error-container">
        <div className="trade-error-content">
          <div className="error-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2>{error.error || 'Error'}</h2>
          <p>{error.message || 'Trade not found or you don\'t have permission to view it.'}</p>
          <div className="redirect-message">
            <p>You will be redirected to the trades page in 5 seconds...</p>
          </div>
          <button 
            className="redirect-button"
            onClick={() => navigate(error.redirectUrl || '/trades')}
          >
            Go to Trades
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/trades" className="back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Trades
        </Link>
        <h1 className="page-title">
          <FontAwesomeIcon icon={faExchangeAlt} className="title-icon" />
          Trade Details
        </h1>
      </div>

      <TradeDetails tradeId={tradeId} />
    </div>
  );
};

export default TradeDetailPage;