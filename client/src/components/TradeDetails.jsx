import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatCurrency, API_URL } from '../config/constants';
import { Button, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchTradeDetails, 
  updateTradeStatus,
  selectCurrentTrade, 
  selectTradeDetailsLoading, 
  selectTradesError,
  resetCurrentTrade
} from '../redux/slices/tradesSlice';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatDate } from '../utils/format';
import { toast as toastifyToast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

// Redux imports
import { 
  selectCurrentUser
} from '../redux/slices/authSlice';

// Utility functions for trade status
const getStatusText = (status) => {
  switch (status) {
    case 'created':
      return 'Created';
    case 'pending':
      return 'Pending';
    case 'awaiting_seller':
      return 'Awaiting Seller';
    case 'awaiting_buyer':
      return 'Awaiting Buyer';
    case 'accepted':
      return 'Seller Accepted';
    case 'offer_sent':
      return 'Offer Sent';
    case 'awaiting_confirmation':
      return 'Awaiting Confirmation';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'failed':
      return 'Failed';
    case 'rejected':
      return 'Rejected';
    case 'expired':
      return 'Expired';
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return '#4ade80'; // Green
    case 'cancelled':
    case 'failed':
    case 'rejected':
    case 'expired':
      return '#ef4444'; // Red
    case 'awaiting_seller':
    case 'awaiting_buyer':
      return '#3b82f6'; // Blue
    case 'offer_sent':
    case 'accepted':
      return '#f59e0b'; // Amber
    case 'awaiting_confirmation':
      return '#8b5cf6'; // Purple
    default:
      return '#9ca3af'; // Gray
  }
};

const getStatusBgColor = (status) => {
  const color = getStatusColor(status);
  // Add alpha for background
  if (color.startsWith('#')) {
    return `${color}22`;
  }
  return color;
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      );
    case 'cancelled':
    case 'failed':
    case 'rejected':
    case 'expired':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      );
    case 'awaiting_seller':
    case 'awaiting_buyer':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      );
  }
};

const getDefaultStatusMessage = (status, userIsSeller, userIsBuyer) => {
  if (status === 'awaiting_seller' && userIsSeller) {
    return 'Please review and accept this trade offer.';
  } else if (status === 'awaiting_seller' && userIsBuyer) {
    return 'Waiting for the seller to accept your trade request.';
  } else if (status === 'awaiting_buyer' && userIsBuyer) {
    return 'Please confirm that you received the item.';
  } else if (status === 'awaiting_buyer' && userIsSeller) {
    return 'Waiting for buyer to confirm receipt of the item.';
  } else if (status === 'completed') {
    return 'This trade has been completed successfully.';
  } else if (status === 'cancelled') {
    return 'This trade was cancelled.';
  } else if (status === 'failed') {
    return 'This trade failed to complete.';
  } else if (status === 'rejected') {
    return 'This trade was rejected by the seller.';
  } else if (status === 'expired') {
    return 'This trade expired due to inactivity.';
  }
  return 'Current status: ' + getStatusText(status);
};

// Utility functions for item rarity 
const getRarityColor = (rarity) => {
  if (!rarity) return '#9ca3af'; // Default gray
  
  rarity = rarity.toLowerCase();
  if (rarity.includes('consumer') || rarity.includes('common')) {
    return '#9ca3af'; // Gray
  } else if (rarity.includes('industrial') || rarity.includes('uncommon')) {
    return '#38bdf8'; // Light blue
  } else if (rarity.includes('mil-spec') || rarity.includes('rare')) {
    return '#2563eb'; // Blue
  } else if (rarity.includes('restricted') || rarity.includes('mythical')) {
    return '#8b5cf6'; // Purple
  } else if (rarity.includes('classified') || rarity.includes('legendary')) {
    return '#d946ef'; // Pink/Magenta
  } else if (rarity.includes('covert') || rarity.includes('ancient') || rarity.includes('immortal')) {
    return '#ef4444'; // Red
  } else if (rarity.includes('contraband')) {
    return '#f59e0b'; // Amber/Yellow
  }
  
  return '#9ca3af'; // Default gray
};

const getRarityBorderColor = (rarity) => {
  const color = getRarityColor(rarity);
  // Make it more transparent
  if (color.startsWith('#')) {
    return `${color}66`;
  }
  return color;
};

// Status badge component
const StatusBadge = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return { bg: '#166534', text: '#4ade80' };
      case 'awaiting_seller':
        return { bg: '#1e40af', text: '#93c5fd' };
      case 'offer_sent':
        return { bg: '#854d0e', text: '#fde047' };
      case 'awaiting_confirmation':
        return { bg: '#9a3412', text: '#fdba74' };
      case 'cancelled':
        return { bg: '#7f1d1d', text: '#f87171' };
      case 'failed':
        return { bg: '#7f1d1d', text: '#f87171' };
      default:
        return { bg: '#374151', text: '#e5e7eb' };
    }
  };

  const colors = getStatusColor();
  
  // For cancelled trades, show a more prominent badge
  if (status === 'cancelled') {
    return (
      <span style={{
        backgroundColor: colors.bg,
        color: colors.text,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.875rem',
        fontWeight: '500',
        textTransform: 'uppercase',
        boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
        animation: 'pulseBadge 2s infinite'
      }}>
        {getStatusText(status)}
        <style jsx>{`
          @keyframes pulseBadge {
            0% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.5); }
            50% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); }
            100% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.5); }
          }
        `}</style>
      </span>
    );
  }
  
  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.875rem',
      fontWeight: '500',
      textTransform: 'uppercase'
    }}>
      {getStatusText(status)}
    </span>
  );
};

// Add a new visual timeline component for trade status
const StatusTimeline = ({ trade }) => {
  if (!trade) return null;
  
  const steps = [
    { key: 'created', label: 'Created' },
    { key: 'pending', label: 'Pending' },
    { key: 'awaiting_seller', label: 'Seller Sending' },
    { key: 'awaiting_buyer', label: 'Buyer Receiving' },
    { key: 'completed', label: 'Completed' }
  ];
  
  // Determine active step based on current status
  const getActiveIndex = () => {
    const statusOrder = {
      'created': 0,
      'pending': 1,
      'awaiting_seller': 2,
      'awaiting_buyer': 3,
      'completed': 4,
      'cancelled': -1,
      'failed': -1,
      'rejected': -1,
      'expired': -1
    };
    
    return statusOrder[trade.status] !== undefined ? statusOrder[trade.status] : -1;
  };
  
  const activeIndex = getActiveIndex();
  
  // Don't show timeline for cancelled/failed trades
  if (activeIndex < 0) return null;
  
  return (
    <div className="trade-timeline">
      <div className="timeline-container">
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          
          return (
            <div 
              key={step.key}
              className={`timeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              <div className="timeline-icon">
                {isCompleted ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : isActive ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                )}
              </div>
              <div className="timeline-label">{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Improved Trade UI for item details section
const TradeItemDetails = ({ item, trade, price }) => {
  if (!item && !trade) return null;
  
  // Get data from either item object or trade object
  const itemData = item || {
    name: trade.itemName,
    marketHashName: trade.itemName,
    icon: trade.itemImage || trade.iconUrl,
    rarity: trade.itemRarity,
    type: trade.itemType,
    wear: trade.itemWear,
    float: trade.itemFloat,
    paintSeed: trade.itemPaintSeed
  };
  
  const itemPrice = price || trade?.price || 0;
  
  return (
    <div className="trade-details-section">
      <h3 className="trade-details-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
          Item Details
        </h3>
      
      <div className="trade-item-container">
        <div className="trade-item-image-container">
          <div 
            className="trade-item-rarity"
            style={{ backgroundColor: getRarityColor(itemData.rarity) }}
          ></div>
          <img 
            src={itemData.icon || itemData.iconUrl || '/default-item.png'} 
            alt={itemData.name || itemData.marketHashName || 'Item'} 
            className="trade-item-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-item.png';
            }}
          />
        </div>
        
        <div className="trade-item-details">
          <h3 className="trade-item-name">{itemData.name || itemData.marketHashName || 'Unknown Item'}</h3>
          <p className="trade-item-subtitle">{itemData.type || itemData.category || itemData.collectionName || 'CS:GO Item'}</p>
          
          <div className="trade-item-price">
            {formatCurrency(itemPrice)}
          </div>
          
          {itemData.float && (
            <div className="trade-item-float">
              Float: {parseFloat(itemData.float).toFixed(10)}
          </div>
          )}
          
          <div className="trade-item-properties">
            {itemData.wear && (
              <div className="trade-item-property">
                <span className="trade-item-property-label">Wear:</span>
                <span className="trade-item-property-value">{itemData.wear}</span>
        </div>
            )}
            
            {itemData.rarity && (
              <div className="trade-item-property">
                <span className="trade-item-property-label">Rarity:</span>
                <span className="trade-item-property-value">{itemData.rarity}</span>
        </div>
            )}
            
            {itemData.paintSeed && (
              <div className="trade-item-property">
                <span className="trade-item-property-label">Pattern:</span>
                <span className="trade-item-property-value">{itemData.paintSeed}</span>
              </div>
            )}
            
            {trade && (
              <div className="trade-item-property">
                <span className="trade-item-property-label">Steam Asset ID:</span>
                <span className="trade-item-property-value">{trade.assetId || 'Not available'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main trade header component
const TradeHeader = ({ trade, userRoles }) => {
  if (!trade) return null;
  
  return (
    <div className="trade-details-header">
      <div>
        <div className="trade-details-id">Trade #{trade._id}</div>
          </div>
          
      <div className="trade-details-status-wrapper">
        <div className="trade-details-date">
          {new Date(trade.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        
        <div className="trade-status-badge" style={{
          backgroundColor: getStatusBgColor(trade.status),
          color: getStatusColor(trade.status),
          border: `1px solid ${getStatusColor(trade.status)}66`
        }}>
          {getStatusIcon(trade.status)}
          {getStatusText(trade.status)}
            </div>
      </div>
    </div>
  );
};

const TradeDetails = ({ tradeId }) => {
  // Redux hooks
  const dispatch = useDispatch();
  const trade = useSelector(selectCurrentTrade);
  const loading = useSelector(selectTradeDetailsLoading);
  const reduxError = useSelector(selectTradesError);
  const currentUser = useSelector(state => state.auth.user);

  // Local UI state
  const [steamOfferUrl, setSteamOfferUrl] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [inventoryCheckLoading, setInventoryCheckLoading] = useState(false);
  const [inventoryCheckResult, setInventoryCheckResult] = useState(null);
  const [canConfirmReceived, setCanConfirmReceived] = useState(false);
  const [tradeOffersUrl, setTradeOffersUrl] = useState('');
  const [sendingLoading, setSendingLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isCheckingInventory, setIsCheckingInventory] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionError, setActionError] = useState(null);
  const retryAttempted = useRef(false);
  
  // Additional state for seller waiting status
  const sellerWaitingForBuyer = trade?.status === 'awaiting_buyer' && trade?.isUserSeller;

  // Mock socket service until the real one is implemented
  const mockSocketService = {
    isConnected: () => false,
    joinTradeRoom: () => {},
    leaveTradeRoom: () => {},
    subscribeToTradeUpdates: () => {},
    unsubscribeFromTradeUpdates: () => {},
    requestTradeRefresh: () => {},
    onConnected: () => {},
    off: () => {},
    sendTradeUpdate: () => {}
  };

  // Get current user information
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/user/profile`, {
          withCredentials: true
        });
        setUser(response.data);
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Add proper loading and error handling for trade details
  useEffect(() => {
    const fetchTradeDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching trade details for ID:', tradeId);
        const response = await axios.get(`${API_URL}/trades/${tradeId}`, {
          withCredentials: true
        });
        
        // Add a small delay to ensure trade data is fully available
        setTimeout(() => {
          console.log('Trade details received:', response.data);
          setTrade(response.data);
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error('Error fetching trade details:', err);
        
        // Extract error details from response
        const errorData = err.response?.data || {
          error: 'Error',
          message: 'Failed to load trade details',
          redirectUrl: '/trades'
        };
        
        setError(errorData);
        setLoading(false);
        
        // Propagate error to parent component
        if (onError && typeof onError === 'function') {
          onError(errorData);
        }
      }
    };
    
    if (tradeId) {
      // Add a small delay before fetching to ensure server has time to process
      const timer = setTimeout(() => {
        fetchTradeDetails();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [tradeId]);

  // Retry mechanism if initial load fails
  const handleRetryLoad = () => {
    if (tradeId) {
      setLoading(true);
      setError(null);
      
      // Add a longer delay for retry attempts
      setTimeout(async () => {
        try {
          console.log('Retrying trade details fetch for ID:', tradeId);
          const response = await axios.get(`${API_URL}/trades/${tradeId}`, {
            withCredentials: true
          });
          
          console.log('Trade details received on retry:', response.data);
          setTrade(response.data);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching trade details on retry:', err);
          
          // Extract error details from response
          const errorData = err.response?.data || {
            error: 'Error',
            message: 'Failed to load trade details after retry',
            redirectUrl: '/trades'
          };
          
          setError(errorData);
          setLoading(false);
          
          // Propagate error to parent component
          if (onError && typeof onError === 'function') {
            onError(errorData);
          }
        }
      }, 1500);
    }
  };

  // Update user roles when trade or user changes
  useEffect(() => {
    if (trade && user) {
      // Determine if user is buyer or seller
      const userIsBuyer = trade.isUserBuyer || (trade.buyer && trade.buyer._id === user.id);
      const userIsSeller = trade.isUserSeller || (trade.seller && trade.seller._id === user.id);
      
      setIsBuyer(userIsBuyer);
      setIsSeller(userIsSeller);
      
      // Set asset ID for inventory checks
      if (trade.assetId) {
        setAssetId(trade.assetId);
      }
    }
  }, [trade, user]);

  // Set up auto-refresh for active trades
  useEffect(() => {
    // Only set up refresh for active trades
    if (!trade || ['completed', 'cancelled', 'failed'].includes(trade.status)) {
      return;
    }

    // Set up refresh interval (every 15 seconds)
    const refreshInterval = setInterval(() => {
      dispatch(fetchTradeDetails(tradeId));
    }, 15000);

    // Clean up the interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [tradeId, trade, dispatch]);

  // Add polling for active trades
  useEffect(() => {
    let pollingInterval = null;
    
    // Only poll for trades that are in progress
    const shouldPoll = trade && ['created', 'pending', 'awaiting_seller', 'awaiting_buyer'].includes(trade.status);
    
    if (shouldPoll && !loading) {
      console.log(`[TradeDetails] Starting polling for trade ${tradeId}`);
      
      // Poll more frequently for trades that are actively being processed
      const pollTime = ['awaiting_seller', 'awaiting_buyer'].includes(trade.status) 
        ? 10000  // Every 10 seconds for trades requiring action
        : 30000; // Every 30 seconds for other active trades
      
      pollingInterval = setInterval(() => {
        console.log(`[TradeDetails] Polling for updates on trade ${tradeId}`);
        dispatch(fetchTradeDetails(tradeId));
      }, pollTime);
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [tradeId, trade?.status, loading, dispatch]);
  
  // Clear any error after 5 seconds
  useEffect(() => {
    let errorTimeout = null;
    
    if (reduxError) {
      errorTimeout = setTimeout(() => {
        setError(null);
      }, 5000);
    }
    
    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, [reduxError]);

  /* 
  // Socket integration code - commented out until socketService is implemented
  useEffect(() => {
    // Subscribe to trade updates via socket when component mounts
    if (tradeId && socketService && socketService.isConnected()) {
      socketService.joinTradeRoom(tradeId);
      socketService.subscribeToTradeUpdates(tradeId);
      
      // Force refresh cache data to ensure we have latest
      socketService.requestTradeRefresh(tradeId);
    }
    
    // Return cleanup function
    return () => {
      if (tradeId && socketService && socketService.isConnected()) {
        socketService.leaveTradeRoom(tradeId);
        socketService.unsubscribeFromTradeUpdates(tradeId);
      }
    };
  }, [tradeId]);

  // Socket reconnection handler
  useEffect(() => {
    const handleSocketConnect = () => {
      if (tradeId) {
        console.log(`[TradeDetails] Socket reconnected, rejoining trade room for ${tradeId}`);
        socketService.joinTradeRoom(tradeId);
        socketService.subscribeToTradeUpdates(tradeId);
        socketService.requestTradeRefresh(tradeId);
        
        // Refresh trade data after reconnection
        dispatch(fetchTradeDetails(tradeId));
      }
    };
    
    if (socketService) {
      socketService.onConnected(handleSocketConnect);
    }
    
    return () => {
      if (socketService) {
        // Clean up event listener
        socketService.off('connect', handleSocketConnect);
      }
    };
  }, [tradeId, dispatch]);
  */

  // Handle status change
  const handleStatusChange = async (newStatus, data = {}) => {
    try {
      setActionInProgress(true);
      
      // Update status through API
      const result = await dispatch(updateTradeStatus({
        tradeId,
        action: newStatus,
        data
      })).unwrap();
      
      /* 
      // Socket update - commented out until socketService is implemented
      if (result && socketService && socketService.isConnected()) {
        socketService.sendTradeUpdate(tradeId, newStatus, {
          status: result.trade?.status,
          userId: currentUser?._id,
          username: currentUser?.displayName || currentUser?.username
        });
      }
      */
      
      // Refresh trade details
      dispatch(fetchTradeDetails(tradeId));
      setActionInProgress(false);
      
      return result;
    } catch (error) {
      setActionInProgress(false);
      setActionError(error.message || 'Failed to update trade status');
      return null;
    }
  };

  const handleSellerApprove = async () => {
    try {
      setApproveLoading(true);
      
      await dispatch(updateTradeStatus({
        tradeId,
        action: 'seller-initiate',
        data: {}
      })).unwrap();
      
      toast.success('Trade approved successfully');
    } catch (err) {
      console.error('Error approving trade:', err);
      toast.error(err?.message || 'Failed to approve trade');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleSellerConfirmSent = async () => {
    if (!steamOfferUrl.trim()) {
      toast.error('Please enter a valid Steam trade offer ID or URL');
        return;
      }
      
    try {
      setSendingLoading(true);
      
      await dispatch(updateTradeStatus({
        tradeId,
        action: 'seller-sent-manual',
        data: { tradeOfferId: steamOfferUrl.trim() }
      })).unwrap();
      
      toast.success('Trade offer marked as sent');
      setSteamOfferUrl('');
    } catch (err) {
      console.error('Error marking trade as sent:', err);
      toast.error(err?.message || 'Failed to mark trade as sent');
    } finally {
      setSendingLoading(false);
    }
  };

  const handleBuyerConfirm = async () => {
    try {
      setConfirmLoading(true);
      
      await dispatch(updateTradeStatus({
        tradeId,
        action: 'buyer-confirm',
        data: {}
      })).unwrap();
      
      toast.success('Trade completed successfully');
    } catch (err) {
      console.error('Error confirming trade receipt:', err);
      toast.error(err?.message || 'Failed to confirm receipt');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCheckInventory = async () => {
    setIsCheckingInventory(true);
    setInventoryCheckLoading(true);
    
    try {
      const response = await axios.get(`${API_URL}/trades/${tradeId}/verify-inventory`, {
        withCredentials: true
      });
      
      setInventoryCheckResult(response.data);
      setCanConfirmReceived(!response.data.itemInSellerInventory);
      
      if (response.data.itemInSellerInventory) {
        toast.warning('The item is still in the seller\'s inventory');
        } else {
        toast.success('The item appears to have been transferred');
      }
    } catch (err) {
      console.error('Error checking inventory:', err);
      toast.error(err.response?.data?.error || 'Failed to check inventory');
        setInventoryCheckResult({
          success: false,
        message: err.response?.data?.error || 'Failed to check inventory',
        tradeOffersLink: 'https://steamcommunity.com/my/tradeoffers'
      });
    } finally {
      setInventoryCheckLoading(false);
    }
  };

  const handleCancelTrade = async () => {
    try {
      // Using the updateTradeStatus action with 'cancel' action
      await dispatch(updateTradeStatus({
        tradeId,
        action: 'cancel',
        data: { reason: cancelReason }
      })).unwrap();
      
          toast.success('Trade cancelled successfully');
        setCancelReason('');
    } catch (err) {
      console.error('Error cancelling trade:', err);
      toast.error(err?.message || 'Failed to cancel trade');
    }
  };

  const renderTradeActions = () => {
    if (!trade) return null;
    
    // If trade is in a final state, don't show actions
    if (['completed', 'cancelled', 'failed', 'rejected', 'expired'].includes(trade.status)) {
      return null;
    }
    
    return (
      <div className="trade-details-actions">
        {/* Seller actions */}
        {isSeller && trade.status === 'awaiting_seller' && (
          <>
                  <button
              className="trade-action-button trade-action-button-secondary"
              onClick={handleCheckInventory}
              disabled={inventoryCheckLoading}
            >
              {inventoryCheckLoading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                          <circle cx="12" cy="12" r="10"></circle>
                    <path d="M16 12a4 4 0 1 1-8 0"></path>
                        </svg>
                  Checking...
                      </>
                    ) : (
                      <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                  Verify Inventory
                      </>
                    )}
                  </button>

            <div style={{ flex: 1 }}></div>
            
              <button
              className="trade-action-button trade-action-button-danger"
              onClick={() => handleCancelTrade('Seller cancelled the trade')}
              disabled={approveLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Cancel Trade
              </button>
            
                  <button
              className="trade-action-button trade-action-button-primary"
              onClick={handleSellerApprove}
              disabled={approveLoading}
            >
              {approveLoading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M16 12a4 4 0 1 1-8 0"></path>
                  </svg>
                  Processing...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                  Approve Trade
                      </>
                    )}
                  </button>
          </>
        )}
        
        {/* Buyer actions */}
        {isBuyer && trade.status === 'awaiting_buyer' && (
          <>
                <button
              className="trade-action-button trade-action-button-danger"
              onClick={() => handleCancelTrade('Buyer cancelled the trade')}
              disabled={confirmLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              Report Issue
            </button>
            
            <button 
              className="trade-action-button trade-action-button-primary"
                  onClick={handleBuyerConfirm}
              disabled={confirmLoading}
                >
                  {confirmLoading ? (
                    <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M16 12a4 4 0 1 1-8 0"></path>
                  </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                  Confirm Receipt
                    </>
                  )}
                </button>
          </>
        )}
      </div>
    );
  };

  const renderStatusMessage = () => {
    if (!trade) return null;
    
    const statusMessage = getDefaultStatusMessage(trade.status, isSeller, isBuyer);
    let messageType = 'info';
    
    if (['completed'].includes(trade.status)) {
      messageType = 'success';
    } else if (['cancelled', 'failed', 'rejected', 'expired'].includes(trade.status)) {
      messageType = 'error';
    } else if (['awaiting_seller', 'awaiting_buyer'].includes(trade.status)) {
      messageType = 'warning';
    }
    
    return (
      <div className={`trade-status-message ${messageType}`}>
        <div className="trade-status-message-content">
          <div className="trade-status-message-icon">
            {messageType === 'success' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            ) : messageType === 'error' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            ) : messageType === 'warning' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
            )}
                </div>
          <div className="trade-status-message-text">{statusMessage}</div>
              </div>
            </div>
    );
  };
  
  const renderParticipants = () => {
    if (!trade) return null;
    
    return (
      <div className="trade-details-section">
        <h3 className="trade-details-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
          Trade Participants
                </h3>
                
        <div className="trade-participants-container">
          {/* Buyer Card */}
          <div className="trade-participant-card">
            <div className="trade-participant-header">
              <div className="trade-participant-avatar">
                <img
                  src={trade.buyer?.avatar || '/default-avatar.png'}
                  alt={trade.buyer?.displayName || 'Buyer'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-avatar.png';
                  }}
                />
                </div>
              <div className="trade-participant-info">
                <div className="trade-participant-role">Buyer {isBuyer && '(You)'}</div>
                <div className="trade-participant-name">{trade.buyer?.displayName || 'Unknown Buyer'}</div>
              </div>
            </div>
            
            <div className="trade-participant-details">
              <div className="trade-participant-detail">
                <span className="trade-participant-detail-label">Steam ID:</span>
                <span className="trade-participant-detail-value">{trade.buyer?.steamId || 'N/A'}</span>
          </div>
          
              <div className="trade-participant-detail">
                <span className="trade-participant-detail-label">Trade URL:</span>
                <span className="trade-participant-detail-value">
                  {trade.buyerTradeUrl ? 'Set' : 'Not Set'}
                </span>
        </div>
              
              <div className="trade-participant-detail">
                <span className="trade-participant-detail-label">Joined:</span>
                <span className="trade-participant-detail-value">
                  {trade.buyer?.createdAt 
                    ? new Date(trade.buyer.createdAt).toLocaleDateString() 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Seller Card */}
          <div className="trade-participant-card">
            <div className="trade-participant-header">
              <div className="trade-participant-avatar">
                <img
                  src={trade.seller?.avatar || '/default-avatar.png'}
                  alt={trade.seller?.displayName || 'Seller'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-avatar.png';
                  }}
                />
              </div>
              <div className="trade-participant-info">
                <div className="trade-participant-role">Seller {isSeller && '(You)'}</div>
                <div className="trade-participant-name">{trade.seller?.displayName || 'Unknown Seller'}</div>
                </div>
              </div>
              
            <div className="trade-participant-details">
              <div className="trade-participant-detail">
                <span className="trade-participant-detail-label">Steam ID:</span>
                <span className="trade-participant-detail-value">{trade.seller?.steamId || 'N/A'}</span>
              </div>
              
              <div className="trade-participant-detail">
                <span className="trade-participant-detail-label">Trade URL:</span>
                <span className="trade-participant-detail-value">
                  {trade.sellerTradeUrl ? 'Set' : 'Not Set'}
                </span>
                        </div>
                        
              <div className="trade-participant-detail">
                <span className="trade-participant-detail-label">Joined:</span>
                <span className="trade-participant-detail-value">
                  {trade.seller?.createdAt 
                    ? new Date(trade.seller.createdAt).toLocaleDateString() 
                    : 'N/A'}
                </span>
                          </div>
                            </div>
                            </div>
                          </div>
                        </div>
    );
  };

  // If loading, show loading spinner
  if (loading) {
    return (
      <div className="trade-details-container">
        <div className="trade-details-loading">
          <div className="trade-details-loading-spinner"></div>
          <div className="trade-details-loading-text">Loading trade details...</div>
                      </div>
                  </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className="trade-details-container">
        <div className="trade-status-message error">
          <div className="trade-status-message-content">
            <div className="trade-status-message-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
            </div>
            <div className="trade-status-message-text">
              {error.message}
              <button 
                className="trade-action-button trade-action-button-secondary"
                style={{ marginTop: '10px' }}
                onClick={handleRetryLoad}
              >
                Try Again
              </button>
                </div>
              </div>
            </div>
          </div>
    );
  }

  // If no trade data, show message
  if (!trade) {
    return (
      <div className="trade-details-container">
        <div className="trade-status-message warning">
          <div className="trade-status-message-content">
            <div className="trade-status-message-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
              </div>
            <div className="trade-status-message-text">
              Trade not found or you don't have permission to view it.
            </div>
          </div>
        </div>
    </div>
  );
  }

  // Render trade details
  return (
    <div className="trade-details-container">
      <TradeHeader trade={trade} userRoles={{ isBuyer, isSeller }} />
      <StatusTimeline trade={trade} />
      
      {renderStatusMessage()}
      <TradeItemDetails trade={trade} />
      {renderParticipants()}
      
      {renderTradeActions()}
    </div>
  );
};

export default TradeDetails;