// StatsCards component - COMPLETELY REDESIGNED WITH BRAND NEW UI
import React from 'react';
import { motion } from 'framer-motion';
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

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: [0.43, 0.13, 0.23, 0.96]
      }
    }),
    hover: {
      y: -10,
      boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.2)",
      transition: {
        duration: 0.3
      }
    }
  };

  const statsCards = [
    {
      icon: faExchangeAlt,
      label: "Total Trades",
      value: safeStats.totalTrades,
      loading: safeLoading.totalTrades,
      color: "linear-gradient(135deg, #7928ca, #ff0080)",
      index: 0
    },
    {
      icon: faSpinner,
      label: "Active Trades",
      value: safeStats.activeTrades,
      loading: safeLoading.activeTrades,
      color: "linear-gradient(135deg, #ff9d00, #ff6c00)",
      index: 1
    },
    {
      icon: faCheckCircle,
      label: "Completed Trades",
      value: safeStats.completedTrades,
      loading: safeLoading.completedTrades,
      color: "linear-gradient(135deg, #00f2fe, #4facfe)",
      index: 2
    },
    {
      icon: faDollarSign,
      label: "Total Value",
      value: `$${safeStats.totalValue?.toFixed(2) || '0.00'}`,
      loading: safeLoading.totalValue,
      color: "linear-gradient(135deg, #13f787, #0cebeb)",
      index: 3
    }
  ];

  return (
    <div className="trades-stats">
      {statsCards.map((card) => (
        <motion.div
          key={card.label}
          className="trades-stat-card"
          custom={card.index}
          initial="hidden"
          animate="visible"
          whileHover="hover"
          variants={cardVariants}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "25px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)"
          }}
        >
          <motion.div
            className="trades-stat-icon"
            style={{
              background: card.color,
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "15px" 
            }}
            whileHover={{ 
              rotate: 360,
              transition: { duration: 0.8 }
            }}
          >
            <FontAwesomeIcon icon={card.icon} size="lg" color="white" />
          </motion.div>
          
          <div className="trades-stat-content">
            <div className="trades-stat-label" style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>
              {card.label}
            </div>
            
            <div className="trades-stat-value" style={{ fontSize: "1.8rem", fontWeight: "700", color: "white" }}>
              {card.loading ? (
                <motion.div 
                  className="stats-loading"
                  initial={{ width: "40px" }}
                  animate={{ 
                    width: ["40px", "80px", "40px"],
                    transition: { 
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeInOut"
                    }
                  }}
                  style={{
                    height: "15px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.1)"
                  }}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {card.value}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards; 