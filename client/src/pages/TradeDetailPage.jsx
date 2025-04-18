import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faExchangeAlt } from '@fortawesome/free-solid-svg-icons';
import TradeDetails from '../components/TradeDetails';
import '../styles/TradeDetails.css';

const TradeDetailPage = () => {
  const { tradeId } = useParams();

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