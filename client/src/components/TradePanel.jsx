import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatCurrency, API_URL } from '../config/constants';

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.3 } }
};

const panelVariants = {
  hidden: { x: '100%', opacity: 0.5 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { 
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    x: '100%', 
    opacity: 0,
    transition: { 
      type: 'spring',
      damping: 30,
      stiffness: 300
    }
  }
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.4
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.2
    }
  }
};

const TradePanel = ({ 
  isOpen, 
  onClose, 
  item, 
  action, // 'buy', 'sell', 'offer', etc.
  onComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tradeUrl, setTradeUrl] = useState('');
  const [tradeData, setTradeData] = useState(null);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerCurrency, setOfferCurrency] = useState('USD');
  const [processingStage, setProcessingStage] = useState(0); // 0: initial, 1: processing, 2: success
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Reset state when panel opens
  useEffect(() => {
    if (isOpen && item) {
      setError(null);
      setSuccess(null);
      setConfirmationStep(false);
      setProcessingStage(0);
      setOfferAmount(item.price ? item.price.toString() : '');
    }
  }, [isOpen, item]);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Close when clicking outside the panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Validate trade URL format
  const validateTradeUrl = (url) => {
    if (!url) return false;
    // Basic validation - should be improved based on exact Steam trade URL format
    return url.includes('steamcommunity.com/tradeoffer/new/') && url.includes('partner=') && url.includes('token=');
  };

  // Handle buy item
  const handleBuyItem = async () => {
    if (confirmationStep) {
      setLoading(true);
      setError(null);
      setProcessingStage(1); // Processing
      
      try {
        const requestData = {};
        
        // Add trade URL if provided
        if (tradeUrl) {
          requestData.tradeUrl = tradeUrl;
        }
        
        const response = await axios.post(
          `${API_URL}/marketplace/buy/${item._id}`,
          requestData,
          { withCredentials: true }
        );
        
        setSuccess(response.data.message);
        setTradeData(response.data);
        setProcessingStage(2); // Success
        
        // Notify parent component
        if (onComplete) {
          onComplete(response.data);
        }
        
        // Show notification
        if (window.showNotification) {
          window.showNotification(
            'Purchase Successful',
            'Your purchase has been processed. Check your trade offers.',
            'SUCCESS'
          );
        }
        
        // Automatically navigate to trade page after successful purchase
        setTimeout(() => {
          navigate(`/trades/${response.data.tradeId}`);
        }, 3000);
        
      } catch (err) {
        console.error('Error buying item:', err);
        setProcessingStage(0); // Reset to initial state
        
        // Special handling for missing trade URL
        if (err.response?.data?.requiresTradeUrl) {
          setError(err.response.data.error);
          setConfirmationStep(false); // Go back to input step
          return;
        }
        
        setError(err.response?.data?.error || 'Failed to purchase item');
        
        // Show notification
        if (window.showNotification) {
          window.showNotification(
            'Purchase Failed',
            err.response?.data?.error || 'Failed to purchase item',
            'ERROR'
          );
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Show confirmation step
      setConfirmationStep(true);
    }
  };

  // Handle making an offer
  const handleMakeOffer = async () => {
    if (!offerAmount || isNaN(offerAmount) || parseFloat(offerAmount) <= 0) {
      setError('Please enter a valid offer amount');
      return;
    }
    
    setLoading(true);
    setError(null);
    setProcessingStage(1); // Processing
    
    try {
      const requestData = {
        offerAmount: parseFloat(offerAmount),
        offerCurrency: offerCurrency
      };
      
      // Add trade URL if provided
      if (tradeUrl) {
        requestData.tradeUrl = tradeUrl;
      }
      
      const response = await axios.post(
        `${API_URL}/offers/${item._id}`,
        requestData,
        { withCredentials: true }
      );
      
      setSuccess(response.data.message);
      setTradeData(response.data);
      setProcessingStage(2); // Success
      
      // Notify parent component
      if (onComplete) {
        onComplete(response.data);
      }
      
      // Show notification
      if (window.showNotification) {
        window.showNotification(
          'Offer Submitted',
          'Your offer has been sent to the seller.',
          'SUCCESS'
        );
      }
      
    } catch (err) {
      console.error('Error making offer:', err);
      setProcessingStage(0); // Reset to initial state
      
      // Special handling for missing trade URL
      if (err.response?.data?.requiresTradeUrl) {
        setError(err.response.data.error);
        return;
      }
      
      setError(err.response?.data?.error || 'Failed to make offer');
      
      // Show notification
      if (window.showNotification) {
        window.showNotification(
          'Offer Failed',
          err.response?.data?.error || 'Failed to submit offer',
          'ERROR'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Get title based on action and state
  const getTitle = () => {
    if (success) return 'Success';
    
    switch (action) {
      case 'buy':
        return confirmationStep ? t('common.confirm') : t('tradePanel.buyNow');
      case 'offer':
        return t('tradePanel.makeOffer');
      default:
        return t('tradePanel.title');
    }
  };

  // Render processing stages
  const renderProcessingStage = () => {
    switch (processingStage) {
      case 1: // Processing
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              margin: '30px 0'
            }}
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                borderTop: '4px solid #4ade80',
                borderRight: '4px solid transparent',
                borderBottom: '4px solid transparent',
                borderLeft: '4px solid transparent'
              }}
            />
            <motion.p 
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ 
                color: '#cbd5e1', 
                textAlign: 'center',
                fontSize: '1rem'
              }}
            >
              {t('tradePanel.waitingMessage')}
            </motion.p>
          </motion.div>
        );
        
      case 2: // Success
        return (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              margin: '30px 0'
            }}
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(74, 222, 128, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(74, 222, 128, 0.4)'
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ 
                color: '#4ade80', 
                textAlign: 'center',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}
            >
              {t('tradePanel.successMessage')}
            </motion.p>
            
            {tradeData && tradeData.tradeId && (
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => navigate(`/trades/${tradeData.tradeId}`)}
                style={{
                  backgroundColor: 'rgba(74, 222, 128, 0.2)',
                  color: '#4ade80',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  marginTop: '10px',
                  transition: 'all 0.2s ease'
                }}
                whileHover={{ 
                  backgroundColor: 'rgba(74, 222, 128, 0.3)',
                  scale: 1.05
                }}
                whileTap={{ scale: 0.95 }}
              >
                View Trade Details
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </motion.button>
            )}
          </motion.div>
        );
        
      default:
        return null;
    }
  };

  // Render content based on action and state
  const renderContent = () => {
    // If trade was successful, show success message - now handled by processing stage
    if (processingStage > 0) {
      return renderProcessingStage();
    }

    // Initial buy step
    if (action === 'buy' && !confirmationStep) {
      return (
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div style={{
            backgroundColor: 'rgba(45, 27, 105, 0.5)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              color: '#f1f1f1', 
              marginTop: '0',
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              Item Details
            </h3>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '10px',
              gap: '15px'
            }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                style={{
                  width: '120px',
                  height: '120px',
                  overflow: 'hidden',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.marketHashName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center'
                  }}
                />
              </motion.div>
              <div>
                <h4 style={{ 
                  color: '#f1f1f1', 
                  margin: '0 0 8px 0',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  {item.marketHashName}
                </h4>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{ 
                    color: '#94a3b8', 
                    fontSize: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}
                >
                  {item.wear && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ opacity: 0.7 }}>Wear:</span>
                      <span style={{ color: '#d1d5db' }}>{item.wear}</span>
                    </span>
                  )}
                  {item.rarity && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ opacity: 0.7 }}>Rarity:</span> 
                      <span style={{ color: '#d1d5db' }}>{item.rarity}</span>
                    </span>
                  )}
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ 
                    marginTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ 
                    color: '#4ade80', 
                    fontWeight: 'bold', 
                    fontSize: '1.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <motion.span
                      initial={{ scale: 0.9 }}
                      animate={{ scale: [0.9, 1.1, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      ${item.price.toFixed(2)}
                    </motion.span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'normal', opacity: 0.8 }}>USD</span>
                  </span>
                  {item.priceGEL && (
                    <span style={{ 
                      color: '#94a3b8', 
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span>₾{parseFloat(item.priceGEL).toFixed(2)}</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>GEL</span>
                    </span>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
          
          {/* Trade URL input - always shown in modern version for clarity */}
          <motion.div
            variants={contentVariants}
            style={{ marginBottom: '20px' }}
          >
            <label
              htmlFor="tradeUrl"
              style={{
                display: 'block',
                color: '#f1f1f1',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              Your Steam Trade URL {error && error.includes('trade URL') && 
                <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>(Required)</span>
              }
            </label>
            <input
              id="tradeUrl"
              type="text"
              value={tradeUrl}
              onChange={(e) => setTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/..."
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(45, 27, 105, 0.3)',
                border: error && error.includes('trade URL') 
                  ? '1px solid rgba(239, 68, 68, 0.5)' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#f1f1f1',
                marginBottom: '8px',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                boxShadow: error && error.includes('trade URL')
                  ? '0 0 0 1px rgba(239, 68, 68, 0.2)'
                  : 'none'
              }}
            />
            <div style={{ 
              fontSize: '0.85rem', 
              color: '#94a3b8', 
              marginBottom: '5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <a
                href="https://steamcommunity.com/my/tradeoffers/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: '#38bdf8',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Find your trade URL here
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </motion.div>
        </motion.div>
      );
    }

    // Confirmation step for buying
    if (action === 'buy' && confirmationStep) {
      return (
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            backgroundColor: 'rgba(45, 27, 105, 0.5)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
        >
          <h3 style={{ 
            background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            fontSize: '1.3rem',
            marginBottom: '1rem'
          }}>
            Confirm Your Purchase
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            <img
              src={item.imageUrl}
              alt={item.marketHashName}
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                objectPosition: 'center',
                filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5))'
              }}
            />
          </div>
          
          <p style={{ color: '#d1d5db', fontSize: '1rem', marginBottom: '10px' }}>
            You are about to purchase:
          </p>
          <h4 style={{ color: '#e2e8f0', fontSize: '1.1rem', marginTop: 0, marginBottom: '20px' }}>
            {item.marketHashName}
          </h4>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            margin: '20px 0',
            padding: '15px',
            backgroundColor: 'rgba(15, 12, 41, 0.4)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Price:</span>
            <span style={{ 
              color: '#4ade80', 
              fontWeight: 'bold', 
              fontSize: '1.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }}
              >
                ${item.price.toFixed(2)}
              </motion.span>
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', opacity: 0.8 }}>USD</span>
            </span>
          </div>
          
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
            This will initiate a trade with the seller. You will be able to review the trade before accepting.
          </p>
        </motion.div>
      );
    }

    // Make an offer form
    if (action === 'offer') {
      return (
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Item details */}
          <div style={{
            backgroundColor: 'rgba(45, 27, 105, 0.5)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              color: '#f1f1f1', 
              marginTop: '0',
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              Item Details
            </h3>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '10px',
              gap: '15px'
            }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                style={{
                  width: '120px',
                  height: '120px',
                  overflow: 'hidden',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.marketHashName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center'
                  }}
                />
              </motion.div>
              <div>
                <h4 style={{ 
                  color: '#f1f1f1', 
                  margin: '0 0 8px 0',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  {item.marketHashName}
                </h4>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{ 
                    color: '#94a3b8', 
                    fontSize: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}
                >
                  {item.wear && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ opacity: 0.7 }}>Wear:</span>
                      <span style={{ color: '#d1d5db' }}>{item.wear}</span>
                    </span>
                  )}
                  {item.rarity && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ opacity: 0.7 }}>Rarity:</span> 
                      <span style={{ color: '#d1d5db' }}>{item.rarity}</span>
                    </span>
                  )}
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ 
                    marginTop: '12px'
                  }}
                >
                  <div style={{ 
                    padding: '8px 12px',
                    backgroundColor: 'rgba(15, 12, 41, 0.4)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Listed price:</span>
                    <span style={{ 
                      color: '#4ade80', 
                      fontWeight: '600', 
                      fontSize: '1rem'
                    }}>
                      ${item.price.toFixed(2)} USD
                    </span>
                  </div>
                  {item.priceGEL && (
                    <div style={{ 
                      marginTop: '5px',
                      padding: '6px 12px',
                      backgroundColor: 'rgba(15, 12, 41, 0.2)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>GEL price:</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        ₾{parseFloat(item.priceGEL).toFixed(2)}
                      </span>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
          
          {/* Offer form */}
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ marginBottom: '20px' }}
          >
            <label
              htmlFor="offerAmount"
              style={{
                display: 'block',
                color: '#f1f1f1',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              Your Offer
            </label>
            <div style={{ 
              display: 'flex',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <div style={{ flex: 3, position: 'relative' }}>
                <input
                  id="offerAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingLeft: '28px',
                    backgroundColor: 'rgba(45, 27, 105, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#f1f1f1',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease'
                  }}
                />
                <span style={{ 
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '0.9rem'
                }}>
                  {offerCurrency === 'USD' ? '$' : '₾'}
                </span>
              </div>
              <select
                value={offerCurrency}
                onChange={(e) => setOfferCurrency(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'rgba(45, 27, 105, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#f1f1f1',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '32px',
                  transition: 'all 0.3s ease'
                }}
              >
                <option value="USD">USD</option>
                <option value="GEL">GEL</option>
              </select>
            </div>
            
            {/* Offer comparison */}
            {item && offerAmount && !isNaN(parseFloat(offerAmount)) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  marginBottom: '15px',
                  padding: '10px 15px',
                  borderRadius: '10px',
                  backgroundColor: getOfferDifferenceColor(),
                  fontSize: '0.9rem',
                  color: '#f1f1f1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
              >
                {getOfferDifferenceIcon()}
                <span>{getOfferDifferenceText()}</span>
              </motion.div>
            )}
          </motion.div>
          
          {/* Trade URL input */}
          <motion.div
            variants={contentVariants}
            style={{ marginBottom: '20px' }}
          >
            <label
              htmlFor="tradeUrl"
              style={{
                display: 'block',
                color: '#f1f1f1',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              Your Steam Trade URL {error && error.includes('trade URL') && 
                <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>(Required)</span>
              }
            </label>
            <input
              id="tradeUrl"
              type="text"
              value={tradeUrl}
              onChange={(e) => setTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/..."
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(45, 27, 105, 0.3)',
                border: error && error.includes('trade URL') 
                  ? '1px solid rgba(239, 68, 68, 0.5)' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#f1f1f1',
                marginBottom: '8px',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                boxShadow: error && error.includes('trade URL')
                  ? '0 0 0 1px rgba(239, 68, 68, 0.2)'
                  : 'none'
              }}
            />
            <div style={{ 
              fontSize: '0.85rem', 
              color: '#94a3b8', 
              marginBottom: '5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <a
                href="https://steamcommunity.com/my/tradeoffers/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: '#38bdf8',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Find your trade URL here
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </motion.div>
        </motion.div>
      );
    }

    return null;
  };
  
  // Utility functions for offer comparison visualization
  function getOfferDifferenceColor() {
    if (!item || !offerAmount || isNaN(parseFloat(offerAmount))) return 'rgba(45, 27, 105, 0.5)';
    
    const diff = offerCurrency === 'USD' 
      ? parseFloat(offerAmount) - item.price
      : parseFloat(offerAmount) - parseFloat(item.priceGEL || 0);
      
    if (diff > 0) return 'rgba(74, 222, 128, 0.15)';
    if (diff < 0) return 'rgba(239, 68, 68, 0.15)';
    return 'rgba(56, 189, 248, 0.15)';
  }
  
  function getOfferDifferenceIcon() {
    if (!item || !offerAmount || isNaN(parseFloat(offerAmount))) return null;
    
    const diff = offerCurrency === 'USD' 
      ? parseFloat(offerAmount) - item.price
      : parseFloat(offerAmount) - parseFloat(item.priceGEL || 0);
      
    if (diff > 0) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      );
    }
    
    if (diff < 0) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      );
    }
    
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    );
  }
  
  function getOfferDifferenceText() {
    if (!item || !offerAmount || isNaN(parseFloat(offerAmount))) return '';
    
    const comparePrice = offerCurrency === 'USD' ? item.price : parseFloat(item.priceGEL || 0);
    const diffAmount = parseFloat(offerAmount) - comparePrice;
    const diffPercent = (diffAmount / comparePrice) * 100;
    
    const currency = offerCurrency === 'USD' ? '$' : '₾';
    
    if (diffAmount > 0) {
      return `${currency}${Math.abs(diffAmount).toFixed(2)} (${Math.abs(diffPercent).toFixed(1)}%) above asking price`;
    }
    
    if (diffAmount < 0) {
      return `${currency}${Math.abs(diffAmount).toFixed(2)} (${Math.abs(diffPercent).toFixed(1)}%) below asking price`;
    }
    
    return 'Exactly the asking price';
  }

  // Render action buttons
  const renderActions = () => {
    if (processingStage > 0) {
      return null; // No actions during processing or after success
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          style={{
            flex: '1',
            padding: '12px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#e2e8f0',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          {t('common.cancel')}
        </motion.button>
        
        <motion.button
          whileHover={{ 
            scale: 1.02, 
            boxShadow: action === 'buy' 
              ? '0 0 20px rgba(74, 222, 128, 0.4)'
              : '0 0 20px rgba(139, 92, 246, 0.4)'
          }}
          whileTap={{ scale: 0.98 }}
          onClick={action === 'buy' ? handleBuyItem : handleMakeOffer}
          disabled={loading || (action === 'offer' && (!offerAmount || parseFloat(offerAmount) <= 0))}
          style={{
            flex: '2',
            padding: '12px 20px',
            backgroundColor: action === 'buy' ? '#4ade80' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: loading || (action === 'offer' && (!offerAmount || parseFloat(offerAmount) <= 0)) 
              ? 'not-allowed' 
              : 'pointer',
            opacity: loading || (action === 'offer' && (!offerAmount || parseFloat(offerAmount) <= 0)) ? 0.7 : 1,
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            boxShadow: action === 'buy' 
              ? '0 8px 16px rgba(74, 222, 128, 0.3)'
              : '0 8px 16px rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {action === 'buy' 
            ? loading 
              ? 'Processing...' 
              : confirmationStep 
                ? t('common.confirm')
                : t('tradePanel.buyNow')
            : loading 
              ? 'Processing...' 
              : t('tradePanel.makeOffer')
          }
          
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          )}
        </motion.button>
      </div>
    );
  };

  // Main panel render
  return (
    <AnimatePresence>
      {isOpen && item && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(5px)',
              zIndex: 1000
            }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '400px',
              maxWidth: '90%',
              height: '100%',
              backgroundColor: 'rgba(45, 27, 105, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                padding: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                backgroundColor: 'rgba(45, 27, 105, 0.98)',
                backdropFilter: 'blur(10px)',
                zIndex: 10
              }}
            >
              <h2 style={{ 
                color: '#f1f1f1', 
                margin: 0,
                fontSize: '1.3rem',
                fontWeight: '600'
              }}>
                {getTitle()}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </motion.button>
            </motion.div>

            {/* Content */}
            <div
              style={{
                padding: '20px',
                flex: 1,
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent'
              }}
            >
              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      color: '#ef4444',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main content */}
              {renderContent()}
            </div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                padding: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(45, 27, 105, 0.98)',
                backdropFilter: 'blur(10px)'
              }}
            >
              {renderActions()}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TradePanel;