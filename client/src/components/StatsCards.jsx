import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExchangeAlt, faSpinner, faCheckCircle, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import '../styles/Trades.css';

/**
 * StatsCards component displays trade statistics in card format
 * @param {Object} props
 * @param {number} props.totalTrades - Total number of trades
 * @param {number} props.activeTrades - Number of active trades
 * @param {number} props.completedTrades - Number of completed trades
 * @param {number} props.tradeVolume - Total value of trades
 * @param {boolean} props.statsLoading - Whether the stats are loading
 * @returns {JSX.Element}
 */
const StatsCards = ({ 
  totalTrades = 0, 
  activeTrades = 0, 
  completedTrades = 0, 
  tradeVolume = 0, 
  statsLoading = false 
}) => {
  return (
    <div className="trades-stats">
      <div className="trades-stat-card">
        <div className="trades-stat-icon">
          <FontAwesomeIcon icon={faExchangeAlt} />
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Total Trades</div>
          <div className="trades-stat-value">
            {statsLoading ? (
              <div className="stats-loading"></div>
            ) : (
              totalTrades
            )}
          </div>
        </div>
      </div>
      
      <div className="trades-stat-card active">
        <div className="trades-stat-icon">
          <FontAwesomeIcon icon={faSpinner} />
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Active Trades</div>
          <div className="trades-stat-value">
            {statsLoading ? (
              <div className="stats-loading"></div>
            ) : (
              activeTrades
            )}
          </div>
        </div>
      </div>
      
      <div className="trades-stat-card completed">
        <div className="trades-stat-icon">
          <FontAwesomeIcon icon={faCheckCircle} />
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Completed Trades</div>
          <div className="trades-stat-value">
            {statsLoading ? (
              <div className="stats-loading"></div>
            ) : (
              completedTrades
            )}
          </div>
        </div>
      </div>
      
      <div className="trades-stat-card">
        <div className="trades-stat-icon">
          <FontAwesomeIcon icon={faDollarSign} />
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Total Value</div>
          <div className="trades-stat-value">
            {statsLoading ? (
              <div className="stats-loading"></div>
            ) : (
              `$${(tradeVolume || 0).toFixed(2)}`
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards; 