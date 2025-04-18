// StatsCards component - Updated to trigger deployment
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
const StatsCards = ({ stats = {}, statsLoading = {} }) => {
  // Ensure stats has default values to prevent undefined errors
  const safeStats = {
    totalTrades: 0,
    activeTrades: 0,
    completedTrades: 0,
    totalValue: 0,
    ...stats
  };

  // Ensure statsLoading has default values
  const safeLoading = {
    totalTrades: true,
    activeTrades: true,
    completedTrades: true,
    totalValue: true,
    ...statsLoading
  };

  return (
    <div className="trades-stats">
      <div className="trades-stat-card">
        <div className="trades-stat-icon">
          <FontAwesomeIcon icon={faExchangeAlt} />
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Total Trades</div>
          <div className="trades-stat-value">
            {safeLoading.totalTrades ? (
              <div className="stats-loading"></div>
            ) : (
              safeStats.totalTrades
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
            {safeLoading.activeTrades ? (
              <div className="stats-loading"></div>
            ) : (
              safeStats.activeTrades
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
            {safeLoading.completedTrades ? (
              <div className="stats-loading"></div>
            ) : (
              safeStats.completedTrades
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
            {safeLoading.totalValue ? (
              <div className="stats-loading"></div>
            ) : (
              `$${safeStats.totalValue?.toFixed(2) || '0.00'}`
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards; 