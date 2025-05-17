import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/languageUtils';
import { formatCurrency, API_URL } from '../config/constants';
import '../styles/TradePanel.css';
import { FaExchangeAlt, FaInbox, FaPaperPlane, FaHistory, FaComment, FaFilter, FaSteam } from 'react-icons/fa';

// Add a socket connection for real-time updates if not already connected
let socket;
if (!socket && window.io) {
  socket = window.io(API_URL);
  console.log('Socket connection initialized for TradePanel');
}

// Global function to open the trade panel with specific parameters
// This will be attached to the window object for global access
window.openTradePanel = (options) => {
  // This function will be implemented by the main app to open the trade panel
  // For now, we'll log the request
  console.log('Open trade panel request:', options);
  if (window.dispatchEvent) {
    // Create a custom event with the options
    const event = new CustomEvent('openTradePanel', { detail: options });
    window.dispatchEvent(event);
  }
};

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
  action, // 'buy', 'sell', 'offer', 'offers', etc.
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
  
  // State for managing offers list
  const [sentOffers, setSentOffers] = useState([]);
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [fetchingSentOffers, setFetchingSentOffers] = useState(false);
  const [fetchingReceivedOffers, setFetchingReceivedOffers] = useState(false);
  const [fetchingTradeHistory, setFetchingTradeHistory] = useState(false);
  const [cancelingOffer, setCancelingOffer] = useState(null);
  const [activeOffersTab, setActiveOffersTab] = useState('sent'); // 'sent', 'received', or 'history'
  
  // Handle counter-offer
  const [counterOfferItem, setCounterOfferItem] = useState(null);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [counterOfferOriginalId, setCounterOfferOriginalId] = useState(null);
  
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch user profile when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
      
      // Always fetch offers when panel opens to check for existing offers
      if (action === 'offers') {
        fetchSentOffers();
        fetchReceivedOffers();
        fetchTradeHistory();
        
        // Check for activeTab in localStorage (set by App.jsx)
        const savedActiveTab = localStorage.getItem('tradePanelActiveTab');
        if (savedActiveTab) {
          setActiveOffersTab(savedActiveTab);
          // Clear it from localStorage after using it
          localStorage.removeItem('tradePanelActiveTab');
        }
      } else if (action === 'offer' && item?._id) {
        // Only check for existing offers if we're making a new offer
        fetchSentOffers();
      }
    }
  }, [isOpen, action, item?._id]);

  // Before making an offer, check if we already have a pending offer for this item
  useEffect(() => {
    if (isOpen && action === 'offer' && item?._id && sentOffers.length > 0 && !fetchingSentOffers) {
      const existingOffer = sentOffers.find(
        offer => offer.itemId === item._id && offer.status?.toLowerCase() === 'pending'
      );
      
      if (existingOffer) {
        setError(`You already have a pending offer for this item. Cancel it before making a new offer.`);
      } else {
        // Clear the error if there's no existing offer
        if (error === `You already have a pending offer for this item. Cancel it before making a new offer.`) {
          setError(null);
        }
      }
    }
  }, [isOpen, action, item?._id, sentOffers, fetchingSentOffers, error]);

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

  // Fetch sent offers
  const fetchSentOffers = async () => {
    try {
      setFetchingSentOffers(true);
      setError(null);
      const response = await axios.get(`${API_URL}/offers/sent`, {
        withCredentials: true
      });
      
      if (Array.isArray(response.data)) {
        // Map the response to a consistent format
        const formattedOffers = response.data.map(offer => ({
          _id: offer.offerId,
          itemId: offer.itemId,
          itemName: offer.itemName || 'Unknown Item',
          itemImage: offer.itemImage,
          owner: offer.owner,
          amount: offer.offerAmount,
          currency: offer.offerCurrency || 'USD',
          originalPrice: offer.originalPrice,
          status: offer.status,
          createdAt: offer.createdAt,
          tradeId: offer.tradeId
        }));
        
        setSentOffers(formattedOffers);
        
        // Check if we need to highlight existing offer
        if (action === 'offer' && item && item._id) {
          const existingOffer = formattedOffers.find(
            offer => offer.itemId === item._id && offer.status?.toLowerCase() === 'pending'
          );
          
          if (existingOffer) {
            setError(`You already have a pending offer for this item. Cancel it before making a new offer.`);
          }
        }
      } else {
        setSentOffers([]);
      }
    } catch (err) {
      console.error('Error fetching sent offers:', err);
      setError('Failed to load your sent offers. Please try again.');
    } finally {
      setFetchingSentOffers(false);
    }
  };

  // Fetch received offers
  const fetchReceivedOffers = async () => {
    try {
      setFetchingReceivedOffers(true);
      const response = await axios.get(`${API_URL}/offers/received`, {
        withCredentials: true
      });
      
      if (Array.isArray(response.data)) {
        // Map the response to a consistent format
        const formattedOffers = response.data.map(offer => ({
          _id: offer.offerId,
          itemId: offer.itemId,
          itemName: offer.itemName || 'Unknown Item',
          itemImage: offer.itemImage,
          offeredBy: offer.offeredBy,
          amount: offer.offerAmount,
          currency: offer.offerCurrency || 'USD',
          message: offer.message,
          createdAt: offer.createdAt,
          expiresAt: offer.expiresAt
        }));
        
        setReceivedOffers(formattedOffers);
      } else {
        setReceivedOffers([]);
      }
    } catch (err) {
      console.error('Error fetching received offers:', err);
      // Don't set global error for this one as it's a secondary fetch
    } finally {
      setFetchingReceivedOffers(false);
    }
  };

  // Fetch trade history
  const fetchTradeHistory = async () => {
    try {
      setFetchingTradeHistory(true);
      const response = await axios.get(`${API_URL}/trades/history`, {
        withCredentials: true
      });
      
      if (Array.isArray(response.data)) {
        setTradeHistory(response.data);
      } else {
        setTradeHistory([]);
      }
    } catch (err) {
      console.error('Error fetching trade history:', err);
      // Don't set global error for this one
    } finally {
      setFetchingTradeHistory(false);
    }
  };

  // Reset state when panel opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setConfirmationStep(false);
      setProcessingStage(0);
      
      if (item && action !== 'offers') {
        setOfferAmount(item.price ? item.price.toString() : '');
      }
    }
  }, [isOpen, item, action]);

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

  // Close panel when clicking outside
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

  // Handle canceling a pending offer
  const handleCancelOffer = async (offerId) => {
    try {
      setCancelingOffer(offerId);
      setError(null);
      
      // Make sure we have the correct offer ID
      if (!offerId) {
        throw new Error('Invalid offer ID');
      }
      
      // Send the cancel request to the correct endpoint
      const response = await axios.put(
        `${API_URL}/offers/${offerId}/cancel`,
        {},
        { withCredentials: true }
      );
      
      // Check if the request was successful
      if (response && response.data && response.data.success) {
        // Update the local state to reflect the cancellation
        setSentOffers(prevOffers => 
          prevOffers.map(offer => 
            offer._id === offerId 
              ? { ...offer, status: 'cancelled' } 
              : offer
          )
        );
        
        // Show success notification
        if (window.showNotification) {
          window.showNotification(
            'Offer Cancelled',
            'Your offer has been cancelled successfully.',
            'INFO'
          );
        }
      } else {
        // If we got a response without success status, treat as error
        throw new Error(response?.data?.error || 'Failed to cancel offer');
      }
    } catch (err) {
      console.error('Error cancelling offer:', err);
      
      // Set detailed error message
      const errorMessage = err.response?.data?.error || err.message || 'Failed to cancel offer';
      setError(errorMessage);
      
      // Show error notification
      if (window.showNotification) {
        window.showNotification(
          'Error',
          errorMessage,
          'ERROR'
        );
      }
    } finally {
      setCancelingOffer(null);
    }
  };

  // Handle acceptOffer success - navigate to trade page if needed
  const [acceptedTradeId, setAcceptedTradeId] = useState(null);
  
  useEffect(() => {
    if (acceptedTradeId) {
      // Set a brief delay to let the user see the success message
      const timer = setTimeout(() => {
        navigate(`/trades/${acceptedTradeId}`);
        onClose();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [acceptedTradeId, navigate]);
  
  // Handle accept offer
  const handleAcceptOffer = async (itemId, offerId) => {
    try {
      setLoading(true);
      setError(null);
      setProcessingStage(1); // Set to processing immediately
      
      const response = await axios.put(
        `${API_URL}/offers/${itemId}/${offerId}/accept`,
        {},
        { withCredentials: true }
      );
      
      if (response.data.success) {
        // Show success message
        setSuccess(response.data.message || "Offer accepted! Preparing trade details...");
        
        // Update local state
        setReceivedOffers(prevOffers => 
          prevOffers.filter(offer => offer._id !== offerId)
        );
        
        // Set the processing stage to success
        setProcessingStage(2); // Success
        
        // Set the tradeId for redirection
        if (response.data.tradeId) {
          // Add a deliberate delay to ensure the trade record is fully created in the database
          // before redirecting to the trade details page
          setTimeout(() => {
            setAcceptedTradeId(response.data.tradeId);
            
            // Show notification about next steps
            if (window.showNotification) {
              window.showNotification(
                'Offer Accepted',
                'Offer accepted successfully. You will now be redirected to complete the trading process.',
                'SUCCESS'
              );
            }
          }, 1500); // 1.5 second delay to ensure trade is created
        }
      }
    } catch (err) {
      console.error('Error accepting offer:', err);
      setError(err.response?.data?.error || 'Failed to accept offer');
      setProcessingStage(0); // Reset to initial state
    } finally {
      setLoading(false);
    }
  };

  // Handle declining an offer
  const handleDeclineOffer = async (itemId, offerId) => {
    try {
      setLoading(true);
      
      const response = await axios.put(
        `${API_URL}/offers/${itemId}/${offerId}/decline`,
        {},
        { withCredentials: true }
      );
      
      if (response.data.success) {
        // Update the local state
        setReceivedOffers(prevOffers => 
          prevOffers.filter(offer => offer._id !== offerId)
        );
        
        // Show success notification
        if (window.showNotification) {
          window.showNotification(
            'Offer Declined',
            'You have declined the offer.',
            'INFO'
          );
        }
      }
    } catch (err) {
      console.error('Error declining offer:', err);
      setError(err.response?.data?.error || 'Failed to decline offer');
    } finally {
      setLoading(false);
    }
  };

  // Format date for better readability
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()] + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Get CSS class for offer status
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'status-accepted';
      case 'pending':
        return 'status-pending';
      case 'declined':
      case 'cancelled':
        return 'status-declined';
      default:
        return 'status-default';
    }
  };

  // Helper to get status text
  const getStatusText = (status) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'Accepted';
      case 'pending':
        return 'Pending';
      case 'declined':
        return 'Declined';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Helper to validate trade URL
  const validateTradeUrl = (url) => {
    // Basic validation for Steam trade URL format
    return url.includes('steamcommunity.com/tradeoffer/new');
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
        
        // Notify parent component
        if (onComplete) {
          onComplete(response.data);
        }
        
        // Show notification
        if (window.showNotification) {
          window.showNotification(
            'Purchase Successful',
            'Your purchase has been processed successfully. Preparing trade details...',
            'SUCCESS'
          );
        }
        
        // Wait for trade to be fully created on the server before redirecting
        // Add a delay to ensure database persistence completes and cache is updated
        if (response.data.tradeId) {
          const tradeId = response.data.tradeId;
          
          // Show processing message
          if (window.showNotification) {
            window.showNotification(
              'Processing Trade',
              'Setting up your trade details. Please wait...',
              'INFO'
            );
          }
          
          // Wait to ensure the trade is created and persisted
          setTimeout(async () => {
            try {
              // Verify trade exists by making a request to fetch it
              const verifyResponse = await axios.get(
                `${API_URL}/trades/${tradeId}`, 
                { withCredentials: true }
              );
              
              if (verifyResponse.data) {
                console.log('Trade verified, navigating to trade details:', tradeId);
                
                // If the trade tracking panel is available, open it
                if (window.openTradeTrackingPanel) {
                  window.openTradeTrackingPanel(tradeId, 'buyer');
                } else {
                  // Fallback to navigation with additional retry logic
                  navigate(`/trades/${tradeId}`);
                }
              } else {
                throw new Error('Trade verification failed');
              }
            } catch (verifyError) {
              console.error('Error verifying trade:', verifyError);
              
              // Try one more time after a longer delay
              setTimeout(async () => {
                try {
                  const retryResponse = await axios.get(
                    `${API_URL}/trades/${tradeId}`, 
                    { withCredentials: true }
                  );
                  
                  if (retryResponse.data) {
                    console.log('Trade verified on retry, navigating to trade details:', tradeId);
                    navigate(`/trades/${tradeId}`);
                  } else {
                    throw new Error('Trade verification failed on retry');
                  }
                } catch (retryError) {
                  console.error('Error verifying trade on retry:', retryError);
                  // Show error and redirect to trades page
                  if (window.showNotification) {
                    window.showNotification(
                      'Trade Processing Issue',
                      'There was an issue processing your trade. Please check your trades page.',
                      'WARNING'
                    );
                  }
                  navigate('/trades');
                }
              }, 2000); // Longer delay for retry
            }
          }, 1500); // Initial delay
        } else {
          // No trade ID in response
          if (window.showNotification) {
            window.showNotification(
              'Trade Processing Issue',
              'No trade ID returned. Please check your trades page.',
              'WARNING'
            );
          }
          setTimeout(() => navigate('/trades'), 1500);
        }
        
      } catch (err) {
        console.error('Error buying item:', err);
        setProcessingStage(0); // Reset to initial state
        
        let errorMsg = err.response?.data?.error || 'Failed to purchase item';
        
        // Enhanced error handling with specific messages
        if (err.response?.data?.requiresTradeUrl) {
          setError(errorMsg);
          setConfirmationStep(false); // Go back to input step
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Trade URL Required',
              'Please enter your Steam trade URL to complete this purchase.',
              'WARNING'
            );
          }
          return;
        } else if (errorMsg.includes('Insufficient balance') || errorMsg.includes('insufficient funds')) {
          setError("You don't have enough funds in your wallet to complete this purchase. Please add funds and try again.");
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Insufficient Funds',
              'Add funds to your wallet to complete this purchase.',
              'WARNING'
            );
          }
        } else if (errorMsg.includes('Not authenticated') || errorMsg.includes('login')) {
          setError("You need to be logged in to make a purchase. Please log in and try again.");
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Authentication Required',
              'Please log in to complete this purchase.',
              'WARNING'
            );
          }
        } else if (errorMsg.includes('not available') || errorMsg.includes('already sold')) {
          setError("This item is no longer available for purchase. It may have been sold or removed from the marketplace.");
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Item Unavailable',
              'This item is no longer available. Refresh your page to see updated listings.',
              'ERROR'
            );
          }
        } else {
          setError(errorMsg);
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Error',
              errorMsg,
              'ERROR'
            );
          }
        }
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
        
        // Open the trade tracking panel
        setTimeout(() => {
          if (response.data.tradeId) {
            // If the trade tracking panel is available, open it
            if (window.openTradeTrackingPanel) {
              window.openTradeTrackingPanel(response.data.tradeId, 'buyer');
            }
          }
        }, 1500);
        
      } catch (err) {
        console.error('Error making offer:', err);
        setProcessingStage(0); // Reset to initial state
        
        let errorMsg = err.response?.data?.error || 'Failed to submit offer';
        
        // Enhanced error handling with specific messages
        if (err.response?.data?.requiresTradeUrl) {
          setError(errorMsg);
          setConfirmationStep(false); // Go back to input step
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Trade URL Required',
              'Please enter your Steam trade URL to complete your offer.',
              'WARNING'
            );
          }
          return;
        } else if (errorMsg.includes('Insufficient balance') || errorMsg.includes('insufficient funds')) {
          setError("You don't have enough funds in your wallet for this offer. Please add funds and try again.");
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Insufficient Funds',
              'Add funds to your wallet to complete this offer.',
              'WARNING'
            );
          }
        } else if (errorMsg.includes('Not authenticated') || errorMsg.includes('login')) {
          setError("You need to be logged in to make an offer. Please log in and try again.");
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Authentication Required',
              'Please log in to make an offer.',
              'WARNING'
            );
          }
        } else if (errorMsg.includes('not available') || errorMsg.includes('already sold')) {
          setError("This item is no longer available. It may have been sold or removed from the marketplace.");
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Item Unavailable',
              'This item is no longer available. Refresh your page to see updated listings.',
              'ERROR'
            );
          }
        } else if (errorMsg.includes('own listing')) {
          setError("You cannot make an offer on your own listing.");
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Invalid Offer',
              'You cannot make an offer on your own listing.',
              'ERROR'
            );
          }
        } else {
          setError(errorMsg);
          
          // Show notification
          if (window.showNotification) {
            window.showNotification(
              'Error',
              errorMsg,
              'ERROR'
            );
          }
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Move to confirmation step
      setConfirmationStep(true);
    }
  };

  // Helper to get the panel title based on action
  const getTitle = () => {
    switch(action) {
      case 'buy':
        return t('trade.buy_item');
      case 'sell':
        return t('trade.sell_item');
      case 'offer':
        return t('trade.make_offer');
      case 'offers':
        return 'Trade Offers';
      default:
        return t('trade.trade_panel');
    }
  };

  // Render the current processing stage (loading, success, etc.)
  const renderProcessingStage = () => {
    switch (processingStage) {
      case 0: // Initial
        return null;
      case 1: // Processing
        return (
          <div className="processing-container">
            <div className="processing-animation">
              <div className="processing-spinner"></div>
            </div>
            <h3>Processing your request...</h3>
            <p>Please wait while we process your transaction.</p>
          </div>
        );
      case 2: // Success
        return (
          <div className="success-container">
            <div className="success-icon">✓</div>
            <h3>Success!</h3>
            <p>{success}</p>
            {tradeData && tradeData.tradeId && (
              <div className="trade-actions">
                <button 
                  className="primary-button trade-button"
                  onClick={() => {
                    navigate(`/trades/${tradeData.tradeId}`);
                    onClose();
                  }}
                >
                  <FaExchangeAlt className="button-icon" />
                  Go to Trade Page to Complete Transaction
                </button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Render offers list view
  const renderOffersView = () => {
    // First render tabs
    const tabs = (
      <div className="trade-panel-tabs">
        <button 
          className={`trade-panel-tab ${activeOffersTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveOffersTab('sent')}
        >
          <FaPaperPlane size={16} />
          <span>Sent Offers</span>
          {sentOffers.filter(o => o.status?.toLowerCase() === 'pending').length > 0 && (
            <span className="trade-panel-tab-badge">
              {sentOffers.filter(o => o.status?.toLowerCase() === 'pending').length}
            </span>
          )}
        </button>
        <button 
          className={`trade-panel-tab ${activeOffersTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveOffersTab('received')}
        >
          <FaInbox size={16} />
          <span>Received Offers</span>
          {receivedOffers.length > 0 && (
            <span className="trade-panel-tab-badge">
              {receivedOffers.length}
            </span>
          )}
        </button>
        <button 
          className={`trade-panel-tab ${activeOffersTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveOffersTab('history')}
        >
          <FaHistory size={16} />
          <span>Trade History</span>
          {tradeHistory.length > 0 && (
            <span className="trade-panel-tab-badge">
              {tradeHistory.length}
            </span>
          )}
        </button>
      </div>
    );

    // Loading states
    if (activeOffersTab === 'sent' && fetchingSentOffers) {
      return (
        <>
          {tabs}
          <div className="trade-panel-loading">
            <div className="spinner"></div>
            <p>Loading your offers...</p>
          </div>
        </>
      );
    }
    
    if (activeOffersTab === 'received' && fetchingReceivedOffers) {
      return (
        <>
          {tabs}
          <div className="trade-panel-loading">
            <div className="spinner"></div>
            <p>Loading received offers...</p>
          </div>
        </>
      );
    }

    // Error states - only show for the active tab
    if (error && activeOffersTab === 'sent') {
      return (
        <>
          {tabs}
          <div className="trade-panel-error-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>{error}</p>
            <button 
              className="trade-panel-button trade-panel-button-primary"
              onClick={fetchSentOffers}
              style={{ maxWidth: "200px", margin: "0 auto", marginTop: "16px" }}
            >
              Try Again
            </button>
          </div>
        </>
      );
    }
    
    // Sent offers view
    if (activeOffersTab === 'sent') {
      if (!sentOffers || sentOffers.length === 0) {
        return (
          <>
            {tabs}
            <div className="trade-panel-empty-state">
              <FaPaperPlane size={40} style={{ color: 'var(--panel-text-secondary)', opacity: 0.7, marginBottom: '16px' }} />
              <h3>No Sent Offers</h3>
              <p>You haven't made any offers yet. Browse the marketplace to make offers on items.</p>
            </div>
          </>
        );
      }

      // Sort offers
      const sortedOffers = [...sentOffers].sort((a, b) => {
        const statusOrder = { 'pending': 0, 'accepted': 1 };
        const statusA = statusOrder[a.status?.toLowerCase()] ?? 2;
        const statusB = statusOrder[b.status?.toLowerCase()] ?? 2;
        
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      
      return (
        <>
          {tabs}
          <div className="trade-panel-offers-list">
            {sortedOffers.map((offer) => (
              <div key={offer._id} className="trade-panel-offer-item">
                <div className="offer-item-header">
                  <div className="offer-item-img">
                    {offer.itemImage ? (
                      <img src={offer.itemImage} alt={offer.itemName} />
                    ) : (
                      <div className="placeholder-img"></div>
                    )}
                  </div>
                  <div className="offer-item-details">
                    <h4 className="offer-item-name">{offer.itemName || 'Unknown Item'}</h4>
                    <div className="offer-item-meta">
                      <span className="offer-timestamp">{offer.createdAt ? formatDate(offer.createdAt) : 'Unknown date'}</span>
                      <span className={`offer-status ${getStatusClass(offer.status || 'unknown')}`}>
                        {getStatusText(offer.status || 'unknown')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="offer-item-content">
                  <div className="offer-amount">
                    <span className="label">Your Offer:</span>
                    <span className="value">{formatCurrency(offer.amount || 0, offer.currency || 'USD')}</span>
                  </div>
                  {offer.originalPrice && (
                    <div className="offer-original-price">
                      <span className="label">Listed Price:</span>
                      <span className="value">{formatCurrency(offer.originalPrice, offer.currency || 'USD')}</span>
                    </div>
                  )}
                  {offer.owner && (
                    <div className="offer-owner">
                      <span className="label">Seller:</span>
                      <span className="value">{offer.owner.displayName || 'Unknown'}</span>
                    </div>
                  )}
                  {offer.status?.toLowerCase() === 'pending' && (
                    <button 
                      className="trade-panel-button trade-panel-button-danger"
                      onClick={() => handleCancelOffer(offer._id)}
                      disabled={cancelingOffer === offer._id}
                    >
                      {cancelingOffer === offer._id ? 'Cancelling...' : 'Cancel Offer'}
                    </button>
                  )}
                  {offer.status?.toLowerCase() === 'accepted' && offer.tradeId && (
                    <button 
                      className="trade-panel-button trade-panel-button-primary"
                      onClick={() => navigate(`/trades/${offer.tradeId}`)}
                    >
                      View Trade
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }
    
    // Received offers view
    if (activeOffersTab === 'received') {
      if (!receivedOffers || receivedOffers.length === 0) {
        return (
          <>
            {tabs}
            <div className="trade-panel-empty-state">
              <FaInbox size={40} style={{ color: 'var(--panel-text-secondary)', opacity: 0.7, marginBottom: '16px' }} />
              <h3>No Received Offers</h3>
              <p>You haven't received any offers yet.</p>
            </div>
          </>
        );
      }
      
      return (
        <>
          {tabs}
          <div className="trade-panel-offers-list">
            {receivedOffers.map((offer) => (
              <div key={offer._id} className="trade-panel-offer-item">
                <div className="offer-item-header">
                  <div className="offer-item-img">
                    {offer.itemImage ? (
                      <img src={offer.itemImage} alt={offer.itemName} />
                    ) : (
                      <div className="placeholder-img"></div>
                    )}
                  </div>
                  <div className="offer-item-details">
                    <h4 className="offer-item-name">{offer.itemName || 'Unknown Item'}</h4>
                    <div className="offer-item-meta">
                      <span className="offer-timestamp">{offer.createdAt ? formatDate(offer.createdAt) : 'Unknown date'}</span>
                    </div>
                  </div>
                </div>
                <div className="offer-item-content">
                  <div className="offer-amount">
                    <span className="label">Offer Amount:</span>
                    <span className="value">{formatCurrency(offer.amount || 0, offer.currency || 'USD')}</span>
                  </div>
                  {offer.offeredBy && (
                    <div className="offer-owner">
                      <span className="label">From:</span>
                      <span className="value">{offer.offeredBy.displayName || 'Unknown User'}</span>
                    </div>
                  )}
                  {offer.message && (
                    <div className="offer-message">
                      <span className="label">Message:</span>
                      <p className="message-content">{offer.message}</p>
                    </div>
                  )}
                  <div className="offer-action-buttons">
                    <button 
                      className="trade-panel-button trade-panel-button-primary"
                      onClick={() => handleAcceptOffer(offer.itemId, offer._id)}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Accept Offer'}
                    </button>
                    <button 
                      className="trade-panel-button trade-panel-button-secondary"
                      onClick={() => prepareCounterOffer(
                        offer.itemId, 
                        offer._id, 
                        offer.amount, 
                        offer.itemName
                      )}
                      disabled={loading}
                    >
                      Counter
                    </button>
                    <button 
                      className="trade-panel-button trade-panel-button-danger"
                      onClick={() => handleDeclineOffer(offer.itemId, offer._id)}
                      disabled={loading}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }
    
    // Trade history view
    if (activeOffersTab === 'history') {
      if (!tradeHistory || tradeHistory.length === 0) {
        return (
          <>
            {tabs}
            <div className="trade-panel-empty-state">
              <FaHistory size={40} style={{ color: 'var(--panel-text-secondary)', opacity: 0.7, marginBottom: '16px' }} />
              <h3>No Trade History</h3>
              <p>You haven't completed any trades yet.</p>
            </div>
          </>
        );
      }
      
      return (
        <>
          {tabs}
          <div className="trade-panel-offers-list">
            {tradeHistory.map((trade) => (
              <div key={trade.tradeId} className="trade-panel-offer-item">
                <div className="offer-item-header">
                  <div className="offer-item-img">
                    {trade.itemImage && (
                      <img src={trade.itemImage} alt={trade.itemName} />
                    )}
                  </div>
                  <div className="offer-item-details">
                    <h4 className="offer-item-name">{trade.itemName || 'Unknown Item'}</h4>
                    <div className="offer-item-meta">
                      <span className="offer-timestamp">{trade.completedAt ? formatDate(trade.completedAt) : 'Unknown date'}</span>
                    </div>
                  </div>
                </div>
                <div className="offer-item-content">
                  <div className="offer-amount">
                    <span className="label">Trade ID:</span>
                    <span className="value">{trade.tradeId}</span>
                  </div>
                  <div className="offer-amount">
                    <span className="label">Status:</span>
                    <span className="value">{trade.status}</span>
                  </div>
                  <div className="offer-amount">
                    <span className="label">Amount:</span>
                    <span className="value">{formatCurrency(trade.amount, trade.currency || 'USD')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }
  };

  // Render content based on action and state
  const renderContent = () => {
    if (action === 'offers') {
      return renderOffersView();
    }
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
    
    // Offers flow - initial
    if (action === 'offers' && !confirmationStep) {
      return (
        <>
          <button 
            className="trade-panel-button trade-panel-button-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button 
            className="trade-panel-button trade-panel-button-primary"
            onClick={fetchSentOffers}
          >
            {fetchingSentOffers ? 'Loading...' : 'Refresh Offers'}
          </button>
        </>
      );
    }
    
    // Offers flow - confirmation
    if (action === 'offers' && confirmationStep) {
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
            onClick={fetchSentOffers}
          >
            {fetchingSentOffers ? 'Loading...' : 'Refresh Offers'}
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

  // Add socket event listeners for real-time updates
  useEffect(() => {
    if (socket && isOpen) {
      console.log('Setting up socket event listeners for TradePanel');
      
      // Improved event handler for real-time trade panel updates
      const handleTradePanelUpdate = (data) => {
        console.log('TradePanel update received:', data);
        
        // Force immediate refresh of the appropriate section based on update type
        if (data.type === 'offer_update' || data.type === 'new_offer_received' || 
            data.type === 'offer_accepted' || data.type === 'offer_declined' || 
            data.type === 'offer_cancelled' || data.type === 'counter_offer') {
          
          // Immediately refresh the correct data
          if (activeOffersTab === 'sent' || data.type === 'offer_accepted' || 
              data.type === 'offer_declined' || data.type === 'counter_offer') {
            fetchSentOffers();
          }
          
          if (activeOffersTab === 'received' || data.type === 'new_offer_received') {
            fetchReceivedOffers();
          }
          
          // If the update indicates an offer was accepted, handle the redirect logic
          if (data.type === 'offer_accepted' && data.tradeId) {
            setAcceptedTradeId(data.tradeId);
          }
          
          // Auto-switch to the relevant tab based on update type
          if (data.type === 'new_offer_received' && activeOffersTab !== 'received') {
            setActiveOffersTab('received');
          } else if (data.type === 'counter_offer' && activeOffersTab !== 'received') {
            setActiveOffersTab('received');
          }
          
          // Show visual feedback for the update
          const feedback = document.createElement('div');
          feedback.className = 'trade-panel-update-feedback';
          feedback.textContent = 'Real-time update received';
          document.body.appendChild(feedback);
          
          // Remove the feedback element after animation
          setTimeout(() => {
            if (feedback.parentNode) {
              document.body.removeChild(feedback);
            }
          }, 2000);
        }
      };
      
      // Register listeners
      socket.on('offer_update', handleTradePanelUpdate);
      socket.on('new_offer', handleTradePanelUpdate);
      socket.on('counter_offer', handleTradePanelUpdate);
      socket.on('trade_update', handleTradePanelUpdate);
      
      // Clean up on unmount
      return () => {
        socket.off('offer_update', handleTradePanelUpdate);
        socket.off('new_offer', handleTradePanelUpdate);
        socket.off('counter_offer', handleTradePanelUpdate);
        socket.off('trade_update', handleTradePanelUpdate);
      };
    }
  }, [isOpen, activeOffersTab, fetchSentOffers, fetchReceivedOffers]);

  // Add CSS for visual feedback
  useEffect(() => {
    // Add CSS for the visual feedback
    const style = document.createElement('style');
    style.textContent = `
      .trade-panel-update-feedback {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(56, 189, 248, 0.9);
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        z-index: 10000;
        animation: fadeInOut 2s ease-in-out;
        pointer-events: none;
      }
      
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Prepare counter offer
  const prepareCounterOffer = (itemId, offerId, originalAmount, itemName) => {
    setCounterOfferItem({
      _id: itemId,
      name: itemName,
      originalOffer: originalAmount
    });
    setCounterOfferAmount(originalAmount);
    setCounterOfferOriginalId(offerId);
    setShowCounterOfferModal(true);
  };

  // Submit counter offer
  const submitCounterOffer = async () => {
    if (!counterOfferItem || !counterOfferAmount) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(
        `${API_URL}/offers/${counterOfferItem._id}/${counterOfferOriginalId}/counterOffer`,
        {
          counterAmount: parseFloat(counterOfferAmount),
          counterCurrency: 'USD',
          message: `Counter offer for ${counterOfferItem.name}`
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        // Close modal and refresh offers
        setShowCounterOfferModal(false);
        fetchReceivedOffers();
        
        // Show success notification
        if (window.showNotification) {
          window.showNotification(
            'Counter Offer Sent',
            'Your counter offer has been sent successfully.',
            'SUCCESS'
          );
        }
      }
    } catch (err) {
      console.error('Error sending counter offer:', err);
      setError(err.response?.data?.error || 'Failed to send counter offer');
    } finally {
      setLoading(false);
    }
  };

  // Render counter offer modal
  const renderCounterOfferModal = () => {
    if (!showCounterOfferModal || !counterOfferItem) return null;
    
    return (
      <div className="trade-panel-modal-backdrop">
        <div className="trade-panel-modal">
          <div className="trade-panel-modal-header">
            <h3>Counter Offer</h3>
            <button 
              className="trade-panel-close-btn"
              onClick={() => setShowCounterOfferModal(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="trade-panel-modal-content">
            <p>Original offer: ${counterOfferItem.originalOffer}</p>
            <div className="trade-panel-form-group">
              <label className="trade-panel-label" htmlFor="counterOfferAmount">
                Your Counter Offer Amount
              </label>
              <input
                id="counterOfferAmount"
                className="trade-panel-input"
                type="number"
                value={counterOfferAmount}
                onChange={(e) => setCounterOfferAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>
          <div className="trade-panel-modal-actions">
            <button 
              className="trade-panel-button trade-panel-button-secondary"
              onClick={() => setShowCounterOfferModal(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="trade-panel-button trade-panel-button-primary"
              onClick={submitCounterOffer}
              disabled={loading || !counterOfferAmount}
            >
              {loading ? 'Sending...' : 'Send Counter Offer'}
            </button>
          </div>
        </div>
      </div>
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
              <motion.div
                className="trade-panel-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="trade-panel-title">
                  {action === 'buy' && (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                      </svg>
                      <span>{t('trade.buy_item')}</span>
                    </>
                  )}
                  
                  {action === 'offer' && (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      <span>{t('trade.make_offer')}</span>
                    </>
                  )}
                  
                  {action === 'offers' && (
                    <>
                      <FaExchangeAlt size={20} color="var(--panel-accent)" />
                      <span>Trade Offers</span>
                    </>
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

          {/* Counter offer modal */}
          {renderCounterOfferModal()}
        </>
      )}
    </AnimatePresence>
  );
};

export default TradePanel;