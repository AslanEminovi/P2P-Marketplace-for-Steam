import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/languageUtils';
import { formatCurrency, API_URL } from '../config/constants';
import '../styles/TradePanel.css';
import TradeSidePanel from './TradeSidePanel';
import './TradeSidePanel.css';
import { toast } from 'react-hot-toast';
import socketService from '../services/socketService';
import { useSelector } from 'react-redux';

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
  const [userProfile, setUserProfile] = useState(null);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isTradePanelOpen, setIsTradePanelOpen] = useState(false);
  const [currentTradeId, setCurrentTradeId] = useState(null);
  const [tradePanelRole, setTradePanelRole] = useState('buyer');
  const currentUser = useSelector(state => state.auth.user);

  // Fetch user profile when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen]);

  // Fetch user profile to get trade URL
  const fetchUserProfile = async () => {
    try {
      setFetchingProfile(true);
      const response = await axios.get(`${API_URL}/user/profile`, {
        withCredentials: true
      });
      
      setUserProfile(response.data);
      
      // Pre-fill trade URL if available in user profile
      if (response.data.tradeUrl) {
        setTradeUrl(response.data.tradeUrl);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // Don't set error state here, just log it
    } finally {
      setFetchingProfile(false);
    }
  };

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
    
    // Improved validation for Steam trade URLs
    // Must contain the correct domain and required parameters
    const steamTradeUrlRegex = /https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=[0-9]+&token=[a-zA-Z0-9_-]+/;
    return steamTradeUrlRegex.test(url);
  };

  // Handle buy item
  const handleBuyItem = async () => {
    if (confirmationStep) {
      setLoading(true);
      setError(null);
      setProcessingStage(1); // Processing
      
      try {
        // Validate trade URL before sending request
        if (!tradeUrl) {
          throw {
            response: {
              data: {
                error: "Please provide your Steam trade URL",
                requiresTradeUrl: true
              }
            }
          };
        }
        
        if (!validateTradeUrl(tradeUrl)) {
          throw {
            response: {
              data: {
                error: "Please provide a valid Steam trade URL format",
                requiresTradeUrl: true
              }
            }
          };
        }
        
        const requestData = {
          tradeUrl: tradeUrl
        };
        
        const response = await axios.post(
          `${API_URL}/marketplace/buy/${item._id}`,
          requestData,
          { withCredentials: true }
        );
        
        setSuccess(response.data.message || "Purchase successful!");
        setTradeData(response.data);
        setProcessingStage(2); // Success
        
        // Open the trade side panel with the trade ID
        if (response.data.tradeId) {
          setCurrentTradeId(response.data.tradeId);
          setTradePanelRole('buyer');
          setTimeout(() => {
            onClose(); // Close this panel first
            setIsTradePanelOpen(true); // Then open the trade side panel
          }, 1000);
        }
        
        // Notify parent component
        if (onComplete) {
          onComplete(response.data);
        }
        
        // Show notification
        if (window.showNotification) {
          window.showNotification(
            'Purchase Successful',
            'Your purchase has been processed successfully.',
            'SUCCESS'
          );
        }
      } catch (error) {
        console.error('Error buying item:', error);
        setError(error.response?.data?.error || "Failed to complete purchase");
        setProcessingStage(0); // Reset
      } finally {
        setLoading(false);
      }
    } else {
      // Move to confirmation step
      setConfirmationStep(true);
    }
  };

  // Handle make offer
  const handleMakeOffer = async () => {
    // Basic validation
    if (!offerAmount) {
      setError("Please enter an offer amount");
      return;
    }
    
    if (isNaN(parseFloat(offerAmount)) || parseFloat(offerAmount) <= 0) {
      setError("Please enter a valid positive number for your offer");
      return;
    }
    
    if (confirmationStep) {
      setLoading(true);
      setError(null);
      setProcessingStage(1); // Processing
      
      try {
        // Validate trade URL before sending request
        if (!tradeUrl) {
          throw {
            response: {
              data: {
                error: "Please provide your Steam trade URL",
                requiresTradeUrl: true
              }
            }
          };
        }
        
        if (!validateTradeUrl(tradeUrl)) {
          throw {
            response: {
              data: {
                error: "Please provide a valid Steam trade URL format",
                requiresTradeUrl: true
              }
            }
          };
        }
        
        const requestData = {
          tradeUrl: tradeUrl,
          offerAmount: parseFloat(offerAmount),
          offerCurrency: offerCurrency
        };
        
        const response = await axios.post(
          `${API_URL}/offers/${item._id}`,
          requestData,
          { withCredentials: true }
        );
        
        setSuccess(response.data.message || "Offer submitted successfully!");
        setTradeData(response.data);
        setProcessingStage(2); // Success
        
        // Open the trade side panel with the trade ID
        if (response.data.tradeId) {
          setCurrentTradeId(response.data.tradeId);
          setTradePanelRole('buyer');
          setTimeout(() => {
            onClose(); // Close this panel first
            setIsTradePanelOpen(true); // Then open the trade side panel
          }, 1000);
        }
        
        // Notify parent component
        if (onComplete) {
          onComplete(response.data);
        }
        
        // Show notification
        if (window.showNotification) {
          window.showNotification(
            'Offer Submitted',
            'Your offer has been submitted successfully.',
            'SUCCESS'
          );
        }

        // Notify seller about the new offer via socket
        socketService.notifySellerNewOffer({
          tradeId: response.data.tradeId,
          sellerId: response.data.sellerId,
          buyerId: response.data.buyerId || currentUser?._id,
          itemId: item._id,
          item: {
            name: item.name || item.marketHashName,
            _id: item._id
          },
          price: parseFloat(offerAmount),
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error submitting offer:', error);
        setError(error.response?.data?.error || "Failed to submit offer");
        setProcessingStage(0); // Reset
      } finally {
        setLoading(false);
      }
    } else {
      // Move to confirmation step
      setConfirmationStep(true);
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

  // Render the current processing stage (loading, success, etc.)
  const renderProcessingStage = () => {
    switch (processingStage) {
      // Processing (loading)
      case 1:
        return (
          <div className="trade-panel-processing">
            <div className="processing-icon">
              <div className="spinner"></div>
            </div>
            <h3 className="processing-title">
              {action === 'buy' ? 'Processing Purchase' : 'Submitting Offer'}
            </h3>
            <p className="processing-message">
              {action === 'buy' 
                ? "We're processing your purchase. This should only take a moment..." 
                : "We're submitting your offer. This should only take a moment..."}
            </p>
          </div>
        );
      
      // Success
      case 2:
        return (
          <div className="trade-panel-processing">
            <div className="processing-icon">
              <svg 
                width="40" 
                height="40" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="success-icon"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="processing-title">
              {action === 'buy' ? 'Purchase Successful!' : 'Offer Submitted!'}
            </h3>
            <p className="processing-message">
              {action === 'buy' 
                ? "Your purchase has been completed successfully. You'll receive a trade offer on Steam shortly." 
                : "Your offer has been submitted successfully. The seller will be notified of your offer."}
            </p>
            
            {tradeData && tradeData.tradeId && action === 'buy' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{ marginTop: '20px' }}
              >
                <button 
                  className="trade-panel-button trade-panel-button-primary"
                  onClick={() => navigate(`/trades/${tradeData.tradeId}`)}
                  style={{ width: '100%' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  </svg>
                  <span>View Trade Details</span>
                </button>
              </motion.div>
            )}
          </div>
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
          <div className="trade-panel-item-card">
            <div className="trade-panel-item-image">
              <img
                src={item.imageUrl || item.image}
                alt={item.marketHashName || item.name}
              />
            </div>
            <div className="trade-panel-item-details">
              <h4 className="trade-panel-item-name">
                {item.marketHashName || item.name}
              </h4>
              <p className="trade-panel-item-subtitle">
                {item.weapon_type || item.category} {item.wear && `| ${item.wear}`}
              </p>
              
              <div className="trade-panel-item-price">
                <span>{formatCurrency(item.price, 'USD')}</span>
                <span className="trade-panel-item-price-label">USD</span>
              </div>
              
              {item.priceGEL && (
                <div className="trade-panel-item-price" style={{ fontSize: "1rem", opacity: 0.7 }}>
                  <span>₾{parseFloat(item.priceGEL).toFixed(2)}</span>
                  <span className="trade-panel-item-price-label">GEL</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Trade URL input */}
          <div className="trade-panel-form-group">
            <label className="trade-panel-label" htmlFor="tradeUrl">
              Your Steam Trade URL
              {error && error.includes('trade URL') && (
                <span style={{ color: 'var(--panel-error)', marginLeft: '6px' }}>
                  (Required)
                </span>
              )}
            </label>
            <input
              id="tradeUrl"
              className="trade-panel-input"
              type="text"
              value={tradeUrl}
              onChange={(e) => setTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=XXXXX&token=XXXXX"
              disabled={loading || fetchingProfile}
            />
            <div className="trade-panel-helper-text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Don't have a trade URL?</span>
              <a 
                href="https://steamcommunity.com/my/tradeoffers/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="trade-panel-link"
              >
                Find your trade URL here
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
          
          <div className="trade-panel-helper-text" style={{ marginTop: "20px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Your Steam Trade URL is stored securely and only used for sending trade offers.</span>
          </div>
        </motion.div>
      );
    }
    
    // Confirmation step for Buy
    if (action === 'buy' && confirmationStep) {
      return (
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="trade-panel-item-card">
            <div className="trade-panel-item-image">
              <img
                src={item.imageUrl || item.image}
                alt={item.marketHashName || item.name}
              />
            </div>
            <div className="trade-panel-item-details">
              <h4 className="trade-panel-item-name">
                {item.marketHashName || item.name}
              </h4>
              <p className="trade-panel-item-subtitle">
                {item.weapon_type || item.category} {item.wear && `| ${item.wear}`}
              </p>
              
              <div className="trade-panel-item-price">
                <span>{formatCurrency(item.price, 'USD')}</span>
                <span className="trade-panel-item-price-label">USD</span>
              </div>
            </div>
          </div>
          
          <div className="trade-panel-confirmation">
            <div className="confirmation-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Confirm Purchase</span>
            </div>
            
            <div className="confirmation-row">
              <span className="confirmation-label">Item Price</span>
              <span className="confirmation-value">{formatCurrency(item.price, 'USD')}</span>
            </div>
            
            <div className="confirmation-row">
              <span className="confirmation-label">Platform Fee (0%)</span>
              <span className="confirmation-value">{formatCurrency(0, 'USD')}</span>
            </div>
            
            <div className="confirmation-row">
              <span className="confirmation-label">Total</span>
              <span className="confirmation-value confirmation-total">{formatCurrency(item.price, 'USD')}</span>
            </div>
          </div>
          
          {/* Trade URL confirmation */}
          <div className="trade-panel-form-group">
            <label className="trade-panel-label" htmlFor="tradeUrl">
              Steam Trade URL
            </label>
            <input
              id="tradeUrl"
              className="trade-panel-input"
              type="text"
              value={tradeUrl}
              onChange={(e) => setTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=XXXXX&token=XXXXX"
              disabled={loading}
            />
          </div>
        </motion.div>
      );
    }
    
    // Make offer flow - initial step
    if (action === 'offer' && !confirmationStep) {
      return (
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="trade-panel-item-card">
            <div className="trade-panel-item-image">
              <img
                src={item.imageUrl || item.image}
                alt={item.marketHashName || item.name}
              />
            </div>
            <div className="trade-panel-item-details">
              <h4 className="trade-panel-item-name">
                {item.marketHashName || item.name}
              </h4>
              <p className="trade-panel-item-subtitle">
                {item.weapon_type || item.category} {item.wear && `| ${item.wear}`}
              </p>
              
              <div className="trade-panel-item-price">
                <span>{formatCurrency(item.price, 'USD')}</span>
                <span className="trade-panel-item-price-label">Listed Price</span>
              </div>
            </div>
          </div>
          
          {/* Offer amount input */}
          <div className="trade-panel-form-group">
            <label className="trade-panel-label" htmlFor="offerAmount">
              Your Offer Amount
            </label>
            <div className="trade-panel-input-group">
              <input
                id="offerAmount"
                className="trade-panel-input"
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                disabled={loading}
              />
              <select
                className="trade-panel-currency-select"
                value={offerCurrency}
                onChange={(e) => setOfferCurrency(e.target.value)}
                disabled={loading}
              >
                <option value="USD">USD</option>
                <option value="GEL">GEL</option>
              </select>
            </div>
            
            {/* Price comparison feedback */}
            {offerAmount && !isNaN(parseFloat(offerAmount)) && parseFloat(offerAmount) > 0 && (
              <div className={`trade-panel-price-comparison ${
                parseFloat(offerAmount) < item.price ? 'price-lower' : 
                parseFloat(offerAmount) > item.price ? 'price-higher' : 
                'price-equal'
              }`}>
                {parseFloat(offerAmount) < item.price ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <polyline points="19 12 12 19 5 12"></polyline>
                    </svg>
                    <span>Your offer is {((1 - parseFloat(offerAmount) / item.price) * 100).toFixed(1)}% lower than the asking price</span>
                  </>
                ) : parseFloat(offerAmount) > item.price ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5"></line>
                      <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>
                    <span>Your offer is {((parseFloat(offerAmount) / item.price - 1) * 100).toFixed(1)}% higher than the asking price</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                    </svg>
                    <span>Your offer matches the asking price exactly</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Trade URL input */}
          <div className="trade-panel-form-group">
            <label className="trade-panel-label" htmlFor="tradeUrl">
              Your Steam Trade URL
              {error && error.includes('trade URL') && (
                <span style={{ color: 'var(--panel-error)', marginLeft: '6px' }}>
                  (Required)
                </span>
              )}
            </label>
            <input
              id="tradeUrl"
              className="trade-panel-input"
              type="text"
              value={tradeUrl}
              onChange={(e) => setTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=XXXXX&token=XXXXX"
              disabled={loading || fetchingProfile}
            />
            <div className="trade-panel-helper-text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Don't have a trade URL?</span>
              <a 
                href="https://steamcommunity.com/my/tradeoffers/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="trade-panel-link"
              >
                Find your trade URL here
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        </motion.div>
      );
    }
    
    // Make offer flow - confirmation step
    if (action === 'offer' && confirmationStep) {
      return (
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="trade-panel-item-card">
            <div className="trade-panel-item-image">
              <img
                src={item.imageUrl || item.image}
                alt={item.marketHashName || item.name}
              />
            </div>
            <div className="trade-panel-item-details">
              <h4 className="trade-panel-item-name">
                {item.marketHashName || item.name}
              </h4>
              <p className="trade-panel-item-subtitle">
                {item.weapon_type || item.category} {item.wear && `| ${item.wear}`}
              </p>
              
              <div className="trade-panel-item-price">
                <span>{formatCurrency(item.price, 'USD')}</span>
                <span className="trade-panel-item-price-label">Listed Price</span>
              </div>
            </div>
          </div>
          
          <div className="trade-panel-confirmation">
            <div className="confirmation-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Confirm Offer</span>
            </div>
            
            <div className="confirmation-row">
              <span className="confirmation-label">Item Listed Price</span>
              <span className="confirmation-value">{formatCurrency(item.price, 'USD')}</span>
            </div>
            
            <div className="confirmation-row">
              <span className="confirmation-label">Your Offer</span>
              <span className="confirmation-value">{formatCurrency(parseFloat(offerAmount), offerCurrency)}</span>
            </div>
            
            {parseFloat(offerAmount) !== item.price && (
              <div className="confirmation-row">
                <span className="confirmation-label">Difference</span>
                <span className="confirmation-value" style={{ 
                  color: parseFloat(offerAmount) < item.price ? 'var(--panel-error)' : 'var(--panel-success)' 
                }}>
                  {parseFloat(offerAmount) < item.price 
                    ? '↓ ' + ((1 - parseFloat(offerAmount) / item.price) * 100).toFixed(1) + '%'
                    : '↑ ' + ((parseFloat(offerAmount) / item.price - 1) * 100).toFixed(1) + '%'
                  }
                </span>
              </div>
            )}
          </div>
          
          {/* Trade URL confirmation */}
          <div className="trade-panel-form-group">
            <label className="trade-panel-label" htmlFor="tradeUrl">
              Steam Trade URL
            </label>
            <input
              id="tradeUrl"
              className="trade-panel-input"
              type="text"
              value={tradeUrl}
              onChange={(e) => setTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=XXXXX&token=XXXXX"
              disabled={loading}
            />
          </div>
        </motion.div>
      );
    }
    
    return (
      <div className="trade-panel-error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Invalid action type or state. Please try again.</span>
      </div>
    );
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

  // Render action buttons based on current state
  const renderActions = () => {
    // Hide actions during processing
    if (processingStage > 0) {
      return null;
    }
    
    // Buy flow - initial
    if (action === 'buy' && !confirmationStep) {
      return (
        <>
          <button 
            className="trade-panel-button trade-panel-button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="trade-panel-button trade-panel-button-primary"
            onClick={handleBuyItem}
            disabled={loading || !tradeUrl}
          >
            {loading ? 'Loading...' : 'Continue to Checkout'}
          </button>
        </>
      );
    }
    
    // Buy flow - confirmation
    if (action === 'buy' && confirmationStep) {
      return (
        <>
          <button 
            className="trade-panel-button trade-panel-button-secondary"
            onClick={() => setConfirmationStep(false)}
            disabled={loading}
          >
            Back
          </button>
          <button 
            className="trade-panel-button trade-panel-button-primary"
            onClick={handleBuyItem}
            disabled={loading || !tradeUrl}
          >
            {loading ? 'Processing...' : `Buy Now for ${formatCurrency(item.price, 'USD')}`}
          </button>
        </>
      );
    }
    
    // Offer flow - initial
    if (action === 'offer' && !confirmationStep) {
      const canContinue = offerAmount && !isNaN(parseFloat(offerAmount)) && parseFloat(offerAmount) > 0;
      
      return (
        <>
          <button 
            className="trade-panel-button trade-panel-button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="trade-panel-button trade-panel-button-primary"
            onClick={handleMakeOffer}
            disabled={loading || !canContinue}
          >
            {loading ? 'Loading...' : 'Continue to Confirm Offer'}
          </button>
        </>
      );
    }
    
    // Offer flow - confirmation
    if (action === 'offer' && confirmationStep) {
      return (
        <>
          <button 
            className="trade-panel-button trade-panel-button-secondary"
            onClick={() => setConfirmationStep(false)}
            disabled={loading}
          >
            Back
          </button>
          <button 
            className="trade-panel-button trade-panel-button-primary"
            onClick={handleMakeOffer}
            disabled={loading || !tradeUrl}
          >
            {loading ? 'Processing...' : `Submit Offer: ${formatCurrency(parseFloat(offerAmount), offerCurrency)}`}
          </button>
        </>
      );
    }
    
    // Default
    return (
      <button 
        className="trade-panel-button trade-panel-button-secondary"
        onClick={onClose}
      >
        Close
      </button>
    );
  };

  // Main component render
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            className="trade-panel-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop overlay */}
            <motion.div
              className="trade-panel-backdrop"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={onClose}
            />
            
            {/* Panel container */}
            <motion.div
              ref={panelRef}
              className="trade-panel-container"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Header */}
              <motion.div className="trade-panel-header">
                <div className="trade-panel-title">
                  {action === 'buy' && (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                      </svg>
                      <span>Buy Item</span>
                    </>
                  )}
                  
                  {action === 'offer' && (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      <span>Make Offer</span>
                    </>
                  )}
                  
                  {action === 'sell' && (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1v22"></path>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      <span>Sell Item</span>
                    </>
                  )}
                  
                  {confirmationStep && (
                    <span className="trade-panel-badge badge-offer">Confirmation</span>
                  )}
                </div>
                
                <button className="trade-panel-close-btn" onClick={onClose}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </motion.div>

              {/* Content */}
              <div className="trade-panel-content">
                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="trade-panel-error"
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
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
                className="trade-panel-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {renderActions()}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Add this side panel component */}
          <TradeSidePanel 
            isOpen={isTradePanelOpen} 
            onClose={() => setIsTradePanelOpen(false)} 
            tradeId={currentTradeId}
            role={tradePanelRole}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default TradePanel;