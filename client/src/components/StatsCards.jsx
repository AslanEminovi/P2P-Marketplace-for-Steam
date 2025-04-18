import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/format';

/**
 * StatsCards component displays trade statistics in card format
 * @param {Object} props
 * @param {Object} props.stats - The statistics object
 * @param {boolean} props.loading - Whether the stats are loading
 * @returns {JSX.Element}
 */
const StatsCards = ({ stats, loading }) => {
  return (
    <motion.div 
      className="trades-stats"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="trades-stat-card">
        <div className="trades-stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Total Trades</div>
          <div className="trades-stat-value">
            {loading ? <span className="stats-loading"></span> : stats.totalTrades}
          </div>
        </div>
      </div>
      
      <div className="trades-stat-card active">
        <div className="trades-stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Active Trades</div>
          <div className="trades-stat-value">
            {loading ? <span className="stats-loading"></span> : stats.activeTrades}
          </div>
        </div>
      </div>
      
      <div className="trades-stat-card completed">
        <div className="trades-stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Completed</div>
          <div className="trades-stat-value">
            {loading ? <span className="stats-loading"></span> : stats.completedTrades}
          </div>
        </div>
      </div>
      
      <div className="trades-stat-card">
        <div className="trades-stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div className="trades-stat-content">
          <div className="trades-stat-label">Total Value</div>
          <div className="trades-stat-value">
            {loading ? <span className="stats-loading"></span> : formatCurrency(stats.totalValue)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCards; 