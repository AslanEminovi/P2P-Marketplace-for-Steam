import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExchangeAlt, faSpinner, faCheckCircle, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import '../styles/Trades.css';

/**
 * StatsCards component displays trade statistics in card format
 * @param {Object} props
 * @param {Object} props.stats - The statistics object
 * @param {boolean} props.statsLoading - Whether the stats are loading
 * @returns {JSX.Element}
 */
const StatsCards = ({ stats, statsLoading }) => {
  return (
    <div className="trades-stats">
      <div className="trades-stat-card">
        <div className="trades-stat-icon">
          <FontAwesomeIcon icon={faExchangeAlt} />
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Total Trades</div>
          <div className="trades-stat-value">
            {statsLoading.totalTrades ? (
              <div className="stats-loading"></div>
            ) : (
              stats.totalTrades
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
            {statsLoading.activeTrades ? (
              <div className="stats-loading"></div>
            ) : (
              stats.activeTrades
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
            {statsLoading.completedTrades ? (
              <div className="stats-loading"></div>
            ) : (
              stats.completedTrades
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
            {statsLoading.totalValue ? (
              <div className="stats-loading"></div>
            ) : (
              `$${stats.totalValue.toFixed(2)}`
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards; 