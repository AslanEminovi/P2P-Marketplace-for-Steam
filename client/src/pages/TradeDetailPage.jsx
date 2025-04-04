import React from 'react';
import { useParams, Link } from 'react-router-dom';
import TradeDetails from '../components/TradeDetails';
import '../styles/TradeDetails.css';

const TradeDetailPage = () => {
  const { tradeId } = useParams();

  return (
    <div className="trade-details-container">
      <div className="trade-details-header">
        <h1 className="trade-details-title">Trade Details</h1>
        <Link to="/trades" className="trade-details-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to trades
        </Link>
      </div>
      
      <TradeDetails tradeId={tradeId} />
    </div>
  );
};

export default TradeDetailPage;