import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatCurrency, API_URL } from '../config/constants';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import '../styles/TradeDetails.css';

// Status badge component
const StatusBadge = ({ status }) => {
  return (
    <div className={`trade-status-badge ${status.toLowerCase()}`}>
      {getStatusIcon(status)}
      <span>{getStatusText(status)}</span>
    </div>
  );
};

// Get status icon based on status
const getStatusIcon = (status) => {
  switch(status.toLowerCase()) {
    case 'completed':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'cancelled':
    case 'failed':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'awaiting_seller':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'offer_sent':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'awaiting_confirmation':
    case 'accepted':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
};

// Add a visual timeline component for trade status
const StatusTimeline = ({ trade }) => {
  // Define the trade flow steps in order
  const steps = [
    { status: 'awaiting_seller', label: 'Offer Sent' },
    { status: 'accepted', label: 'Seller Accepted' },
    { status: 'offer_sent', label: 'Steam Offer Sent' },
    { status: 'awaiting_confirmation', label: 'Buyer Confirmation' },
    { status: 'completed', label: 'Completed' }
  ];
  
  // Find current step index
  const currentIndex = steps.findIndex(step => step.status === trade.status);
  const isCancelled = trade.status === 'cancelled' || trade.status === 'failed';
  
  if (isCancelled) {
    return (
      <div className="trade-notification trade-notification-danger">
        <div className="trade-notification-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="trade-notification-content">
          <div className="trade-notification-title">
            This trade has been {trade.status === 'cancelled' ? 'cancelled' : 'failed'}
          </div>
          <div className="trade-notification-message">
            {trade.statusHistory.find(sh => sh.status === trade.status)?.message || 
             "The trade was terminated before completion."}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="trade-timeline">
      <div className="trade-timeline-line"></div>
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isPending = index > currentIndex;
        
        let dotClass = isPending ? '' : isActive ? 'active' : 'completed';
        
        return (
          <div key={step.status} className="trade-timeline-item">
            <div className={`trade-timeline-dot ${dotClass}`}></div>
            <div className="trade-timeline-content">
              <div className="trade-timeline-status">
                {step.label}
                {isCompleted && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="trade-timeline-time">
                {isCompleted || isActive ? 
                  new Date(trade.statusHistory.find(sh => sh.status === step.status)?.timestamp || trade.createdAt).toLocaleString() : 
                  'Pending'}
              </div>
              {(isCompleted || isActive) && trade.statusHistory.find(sh => sh.status === step.status)?.message && (
                <div className="trade-timeline-note">
                  {trade.statusHistory.find(sh => sh.status === step.status)?.message}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Improved Trade UI for item details section
const TradeItemDetails = ({ item, trade, price }) => {
  const rarity = item?.rarity || trade?.itemRarity || 'Unknown';
  const wear = item?.wear || trade?.itemWear || 'Unknown';
  const imageUrl = item?.imageUrl || trade?.itemImage || 'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEGegouTxTgsSxQt5M1V_eNC-VZzY89ssYDjGIzw1B_Z7PlMmQzJVGaVaUJC_Q7-Q28UiRh7pQ7VoLj9ewDKw_us4PAN7coOopJTMDWXvSGMF_860g60agOe8ONpyK-i3vuaGgCUg25_ToQnOKE6bBunMsoYhg/360fx360f';
  
  return (
    <div className="trade-item-card">
      <div className="trade-item-header">
        <div className="trade-item-image-container">
          <img 
            src={imageUrl}
            alt={item.marketHashName || "CS2 Item"}
            className="trade-item-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTcePMQFc1nqWSMU5OD2NwOx3sIyShXOjLx2Sk5MbV5MsLD3k3xgfPYDG25bm-Wfw3vUsU9SLPWZ2yp-zWh5OqTE2nIQu4rFl9RKfEEpzdJbsiIaRpp3dUVu2u_0UZyDBl9JNNWfADjmyRCMLwnXeL51Cg/360fx360f';
            }}
          />
        </div>
        
        <h2 className="trade-item-name">
          {item.marketHashName || trade.itemName || 'Unknown Item'}
        </h2>
        
        <div className="trade-item-badges">
          <div className="trade-item-badge" style={{ color: getRarityColor(rarity) }}>
            {rarity}
          </div>
          
          <div className="trade-item-badge">
            {wear}
          </div>
        </div>
        
        <div className="trade-item-price">
          {formatCurrency(price)}
        </div>
      </div>
      
      <div className="trade-item-details-container">
        <div className="trade-participants-container">
          <div className="trade-participant">
            <div className="trade-participant-avatar">
              <img 
                src={trade.seller?.avatar || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'} 
                alt={trade.seller?.displayName || 'Unknown'}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';
                }}
              />
            </div>
            <div className="trade-participant-info">
              <span className="trade-participant-role">Seller</span>
              <span className="trade-participant-name">{trade.seller?.displayName || 'Unknown Seller'}</span>
            </div>
          </div>
          
          <div className="trade-participant">
            <div className="trade-participant-avatar">
              <img 
                src={trade.buyer?.avatar || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'} 
                alt={trade.buyer?.displayName || 'Unknown'}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';
                }}
              />
            </div>
            <div className="trade-participant-info">
              <span className="trade-participant-role">Buyer</span>
              <span className="trade-participant-name">{trade.buyer?.displayName || 'Unknown Buyer'}</span>
            </div>
          </div>
        </div>
        
        {trade.steamTradeOfferId && (
          <div className="trade-links">
            <a 
              href={`https://steamcommunity.com/tradeoffer/${trade.steamTradeOfferId}`} 
              target="_blank"
              rel="noopener noreferrer"
              className="trade-link"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 7L13.5 15.5L8.5 10.5L2 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 7H22V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              View Steam Trade Offer
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

const TradeDetails = ({ tradeId }) => {
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [steamOfferUrl, setSteamOfferUrl] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [steamStatus, setSteamStatus] = useState(null);
  const [confirmForceOverride, setConfirmForceOverride] = useState(false);
  const [sellerConfirmation, setSellerConfirmation] = useState(false);
  const [inventoryCheckLoading, setInventoryCheckLoading] = useState(false);
  const [inventoryCheckResult, setInventoryCheckResult] = useState(null);
  const [canConfirmReceived, setCanConfirmReceived] = useState(false);
  const [tradeOffersUrl, setTradeOffersUrl] = useState('');
  const [sendingLoading, setSendingLoading] = useState(false);
  const [sellerWaitingForBuyer, setSellerWaitingForBuyer] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const retryAttempted = useRef(false);
  const [isCheckingInventory, setIsCheckingInventory] = useState(false);
  const [assetId, setAssetId] = useState('');

  useEffect(() => {
    if (tradeId) {
      loadTradeDetails();
    }
  }, [tradeId]);

  // Set up auto-refresh for trade details
  useEffect(() => {
    // Initial load
    loadTradeDetails();

    // Set up refresh interval (every 15 seconds)
    const refreshInterval = setInterval(() => {
      if (trade && !loading && 
          trade.status !== 'completed' && 
          trade.status !== 'cancelled' && 
          trade.status !== 'failed') {
        // Only auto-refresh for active trades
        console.log('Auto-refreshing trade details...');
        loadTradeDetails();
      }
    }, 15000);

    // Clean up the interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [tradeId]); // Only re-run if tradeId changes

  const loadTradeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`Loading trade details for ID: ${tradeId}`);
      const response = await axios.get(`${API_URL}/trades/${tradeId}`, {
        withCredentials: true,
        timeout: 15000 // 15 second timeout
      });
      
      // Check if we received a valid response
      if (!response.data || !response.data._id) {
        console.error('Invalid or empty trade data received:', response.data);
        throw new Error('Received invalid trade data from server');
      }
      
      // Ensure the trade has item data - provide fallbacks if missing
      const trade = response.data;
      
      // If item is missing, create a fallback item with any available data
      if (!trade.item || typeof trade.item !== 'object') {
        console.warn('Trade missing item data, creating fallback:', trade);
        trade.item = {
          marketHashName: trade.itemName || 'Unknown Item',
          imageUrl: trade.itemImage || 'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEGegouTxTgsSxQt5M1V_eNC-VZzY89ssYDjGIzw1B_Z7PlMmQzJVGaVaUJC_Q7-Q28UiRh7pQ7VoLj9ewDKw_us4PAN7coOopJTMDWXvSGMF_860g60agOe8ONpyK-i3vuaGgCUg25_ToQnOKE6bBunMsoYhg/360fx360f',
          wear: trade.itemWear || 'Unknown',
          rarity: trade.itemRarity || 'Unknown',
          assetId: trade.assetId || 'Unknown'
        };
      }
      
      // Ensure buyer and seller objects exist
      if (!trade.buyer || typeof trade.buyer !== 'object') {
        trade.buyer = { displayName: 'Unknown Buyer', avatar: '' };
      }
      
      if (!trade.seller || typeof trade.seller !== 'object') {
        trade.seller = { displayName: 'Unknown Seller', avatar: '' };
      }
      
      setTrade(trade);
      console.log('Trade details loaded:', trade);
      
      // Set UI states based on trade status
      if (trade.status === 'offer_sent') {
        setSellerWaitingForBuyer(true);
      }
      
      try {
        // Check if current user is buyer or seller
        const currentUser = await axios.get(`${API_URL}/users/profile`, {
          withCredentials: true
        });
        
        const userId = currentUser.data._id;
        setIsBuyer(userId === trade.buyer._id);
        setIsSeller(userId === trade.seller._id);
      } catch (profileError) {
        console.error('Error loading user profile:', profileError);
        // Continue even if this part fails - we can still show trade details
      }
      
      // Reset loading states based on status
      if (trade.status === 'completed' || 
          trade.status === 'cancelled' || 
          trade.status === 'failed') {
        setCanConfirmReceived(false);
        setConfirmLoading(false);
        setSendingLoading(false);
        setApproveLoading(false);
        // Reset inventory check result when trade is completed, cancelled, or failed
        setInventoryCheckResult(null);
        setIsCheckingInventory(false);
      }
    } catch (err) {
      console.error('Error loading trade details:', err);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to load trade details. Please refresh the page.';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 404) {
          errorMessage = 'Trade not found. The trade may have been deleted or you do not have access to it.';
        } else {
          errorMessage = err.response.data?.error || `Server error (${err.response.status}): ${errorMessage}`;
        }
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from server. Please check your internet connection and try again.';
      } else if (err.message) {
        // Something happened in setting up the request that triggered an Error
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      toast.error(
        `${errorMessage} Please check your Steam trade offers.`,
        { duration: 10000 }
      );
      
      // If the error contains a tradeOffersLink, set it
      if (err.response?.data?.tradeOffersLink) {
        setTradeOffersUrl(err.response.data.tradeOffersLink);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSellerApprove = async () => {
    try {
      setApproveLoading(true);
      
      console.log(`Seller approving trade ${tradeId}`);
      const response = await axios.put(`${API_URL}/trades/${tradeId}/seller-approve`, {}, {
        withCredentials: true
      });
      
      console.log('Seller approve response:', response.data);
      
      if (window.showNotification) {
        window.showNotification(
          'Trade Approved',
          'You have approved this trade. Please send the trade offer to the buyer.',
          'SUCCESS'
        );
      }
      
      // Immediately update the UI without requiring refresh
      setTrade(prevTrade => ({
        ...prevTrade,
        status: 'accepted',
        statusHistory: [
          ...prevTrade.statusHistory || [],
          { status: 'accepted', timestamp: new Date().toISOString() }
        ]
      }));
      
      // Refresh the trade details to get the latest status
      await loadTradeDetails();
    } catch (err) {
      console.error('Error approving trade:', err);
      setError(err.response?.data?.error || 'Failed to approve trade');
      
      if (window.showNotification) {
        window.showNotification(
          'Error',
          err.response?.data?.error || 'Failed to approve trade',
          'ERROR'
        );
      }
    } finally {
      setApproveLoading(false);
    }
  };

  const handleSellerConfirmSent = async () => {
    setSendingLoading(true);
    try {
      // Validate that they've entered a trade offer ID or URL
      if (!steamOfferUrl || steamOfferUrl.trim() === '') {
        toast.warning('Please enter the Steam trade offer ID or URL to help the buyer identify your offer');
        setSendingLoading(false);
        return;
      }
      
      const response = await axios.put(
        `${API_URL}/trades/${trade._id}/seller-sent`,
        { steamOfferUrl },
        { withCredentials: true }
      );
      
      if (response.data?.success) {
        toast.success('Successfully marked the trade offer as sent. The buyer has been notified.');
        // Update the local state to reflect the status change
        setTrade({
          ...trade,
          status: 'offer_sent', 
          statusHistory: [
            ...trade.statusHistory,
            {
              status: 'offer_sent',
              timestamp: new Date(),
              note: 'Seller sent trade offer'
            }
          ]
        });
        // Force a refresh of the trade data
        await loadTradeDetails();
      }
    } catch (err) {
      console.error('Error confirming sent:', err);
      
      let errorMessage = 'Failed to update trade status';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      toast.error(errorMessage);
    } finally {
      setSendingLoading(false);
    }
  };

  const handleBuyerConfirm = async () => {
    try {
      setConfirmLoading(true);
      setError(null);

      console.log(`Buyer confirming receipt for trade ${tradeId}`);
      const response = await axios.put(`${API_URL}/trades/${tradeId}/buyer-confirm`, {}, {
        withCredentials: true
      });

      console.log('Buyer confirm response:', response.data);
      
      if (window.showNotification) {
        window.showNotification(
          'Success',
          'You have confirmed receipt of the item!',
          'SUCCESS'
        );
      }
      
      // Immediately update the UI without requiring refresh
      setTrade(prevTrade => ({
        ...prevTrade,
        status: 'completed',
        completedAt: new Date().toISOString(),
        statusHistory: [
          ...prevTrade.statusHistory || [],
          { status: 'completed', timestamp: new Date().toISOString() }
        ]
      }));
      
      // Refresh the trade details to get the latest status
      await loadTradeDetails();
    } catch (err) {
      console.error('Error confirming receipt:', err);
      
      // Get more descriptive error message
      let errorMessage = 'Failed to confirm receipt';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
        
        // Add a more helpful message if the error is about trade status
        if (errorMessage.includes("Cannot confirm receipt for a trade")) {
          errorMessage += ". Please check that you have accepted the Steam trade offer first.";
        }
      }
      
      setError(errorMessage);
      
      toast.error(
        `${errorMessage} Please check your Steam trade offers.`,
        { duration: 10000 }
      );
      
      // If the error contains a tradeOffersLink, set it
      if (err.response?.data?.tradeOffersLink) {
        setTradeOffersUrl(err.response.data.tradeOffersLink);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCheckInventory = async () => {
    setIsCheckingInventory(true);
    try {
      console.log("Checking if item has been transferred...");
      const response = await axios.get(`${API_URL}/trades/${trade._id}/verify-inventory`);
      
      // Check if the response has data
      if (response.data) {
        // Create a consistent result object
        const resultData = {
          ...response.data,
          itemRemovedFromSellerInventory: response.data.success, // Set this based on success flag
          canConfirmReceived: response.data.success, // Enable confirm only if success is true
          message: response.data.message || (response.data.success 
            ? "Item has left the seller's inventory" 
            : `Item with Asset ID ${response.data.assetId || trade.assetId} is still in seller's inventory`)
        };
        
        // Store the result of the check
        setInventoryCheckResult(resultData);
        
        // Update asset ID display if available
        if (response.data.assetId) {
          setAssetId(response.data.assetId);
        }
        
        // If success is true, item is no longer in seller's inventory
        if (response.data.success) {
          toast.success(resultData.message);
          // Enable confirm button only if the item is no longer in seller's inventory
          setCanConfirmReceived(true);
        } else {
          // Item is still in seller's inventory
          toast.error(
            `${resultData.message} Please check your Steam trade offers.`, 
            { duration: 10000 }
          );
          setCanConfirmReceived(false);
        }
      } else {
        // No response data
        toast.error("Received invalid response when checking inventory status");
        setInventoryCheckResult({
          success: false,
          itemRemovedFromSellerInventory: false,
          canConfirmReceived: false,
          message: "Received invalid response when checking inventory status",
          assetId: assetId || trade.assetId
        });
        setCanConfirmReceived(false);
      }
    } catch (error) {
      console.error("Error checking inventory:", error);
      
      // Get the asset ID if available in the error response or fallback to current values
      const errorAssetId = error.response?.data?.assetId || assetId || trade.assetId;
      if (errorAssetId) {
        setAssetId(errorAssetId);
      }
      
      // Get the Steam trade offers link if available in the error response
      const tradeOffersLink = error.response?.data?.tradeOffersLink || "https://steamcommunity.com/my/tradeoffers";
      
      // Create error message with link to Steam trade offers
      let errorMsg = `Failed to verify inventory status for Asset ID ${errorAssetId || "unknown"}. `;
      
      // Add more specific error details if available
      if (error.response?.data?.error) {
        errorMsg += error.response.data.error;
      } else if (error.message) {
        errorMsg += error.message;
      }
      
      // Set consistent error state
      setInventoryCheckResult({
        success: false,
        itemRemovedFromSellerInventory: false,
        canConfirmReceived: false,
        error: errorMsg,
        message: errorMsg,
        assetId: errorAssetId
      });
      
      // Use simple string for toast instead of JSX when there's an error
      toast.error(errorMsg + " Please check your Steam trade offers.", { duration: 10000 });
      
      setCanConfirmReceived(false);
    } finally {
      setIsCheckingInventory(false);
    }
  };

  const handleCheckSteamStatus = async () => {
    setIsVerifying(true);
    setSteamStatus(null);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/trades/${tradeId}/check-steam-status`, {
        withCredentials: true
      });
      
      setSteamStatus(response.data);
      
      // If the trade status has changed, refresh the whole trade
      if (response.data.status === 'accepted' && trade.status !== 'completed') {
        loadTradeDetails();
      }
    } catch (err) {
      console.error('Error checking Steam status:', err);
      setError(err.response?.data?.error || 'Failed to check Steam trade status');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelTrade = async () => {
    try {
      setApproveLoading(true);
      const response = await axios.post(`${API_URL}/trades/${trade._id}/cancel`, {
        reason: cancelReason
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        toast.success('Trade cancelled successfully');
        loadTradeDetails();
      } else {
        toast.error(response.data.message || 'Failed to cancel trade');
      }
    } catch (error) {
      console.error('Error cancelling trade:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel trade');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleApproveTrade = async () => {
    try {
      setApproveLoading(true);
      const response = await axios.post(`${API_URL}/trades/${trade._id}/approve`, {}, {
        withCredentials: true
      });
      
      if (response.data.success) {
        toast.success('Trade approved successfully');
        loadTradeDetails();
      } else {
        toast.error(response.data.message || 'Failed to approve trade');
      }
    } catch (error) {
      console.error('Error approving trade:', error);
      toast.error(error.response?.data?.message || 'Failed to approve trade');
    } finally {
      setApproveLoading(false);
    }
  };
  
  const handleSubmitTradeOffer = async () => {
    if (!steamOfferUrl) {
      toast.error('Please enter a valid Steam trade offer URL');
      return;
    }
    
    try {
      setSendingLoading(true);
      
      // Extract trade offer ID from URL
      const regex = /tradeoffer\/(\d+)/;
      const match = steamOfferUrl.match(regex);
      
      if (!match || !match[1]) {
        toast.error('Invalid Steam trade offer URL format');
        setSendingLoading(false);
        return;
      }
      
      const tradeOfferId = match[1];
      
      const response = await axios.post(`${API_URL}/trades/${trade._id}/submit-offer`, {
        steamTradeOfferId: tradeOfferId
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        toast.success('Trade offer submitted successfully');
        setSteamOfferUrl('');
        loadTradeDetails();
      } else {
        toast.error(response.data.message || 'Failed to submit trade offer');
      }
    } catch (error) {
      console.error('Error submitting trade offer:', error);
      toast.error(error.response?.data?.message || 'Failed to submit trade offer');
    } finally {
      setSendingLoading(false);
    }
  };
  
  const checkInventoryForItem = async () => {
    try {
      setIsCheckingInventory(true);
      
      const response = await axios.get(`${API_URL}/trades/${trade._id}/check-inventory`, {
        withCredentials: true
      });
      
      if (response.data) {
        setInventoryCheckResult(response.data);
        
        if (response.data.found) {
          toast.success('Item found in your inventory!');
          setCanConfirmReceived(true);
        } else {
          toast.error('Item not found in your inventory yet. Please accept the Steam trade offer first.');
        }
      }
    } catch (error) {
      console.error('Error checking inventory:', error);
      toast.error(error.response?.data?.message || 'Failed to check inventory');
    } finally {
      setIsCheckingInventory(false);
    }
  };
  
  const handleConfirmTrade = async () => {
    try {
      setConfirmLoading(true);
      
      const response = await axios.post(`${API_URL}/trades/${trade._id}/confirm`, {
        forceConfirm: confirmForceOverride
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        toast.success('Trade confirmed successfully');
        loadTradeDetails();
      } else {
        toast.error(response.data.message || 'Failed to confirm trade');
      }
    } catch (error) {
      console.error('Error confirming trade:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm trade');
    } finally {
      setConfirmLoading(false);
    }
  };

  const renderTradeActions = () => {
    // Both roles can cancel active trades
    if (trade && (trade.status === 'awaiting_seller' || trade.status === 'accepted') && 
       (isBuyer || isSeller)) {
      return (
        <div className="trade-status-container">
          <div className="trade-actions">
            <h3 className="trade-action-title">Cancel Trade</h3>
            <p className="trade-action-description">
              Are you sure you want to cancel this trade? This action cannot be undone.
            </p>
            <div className="trade-input-group">
              <label htmlFor="cancelReason" className="trade-input-label">Reason for cancellation (optional)</label>
              <textarea 
                id="cancelReason"
                className="trade-input trade-textarea"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain why you're cancelling this trade..."
              />
            </div>
            <div className="trade-button-group">
              <button 
                className="trade-button trade-button-danger"
                onClick={handleCancelTrade}
                disabled={approveLoading}
              >
                {approveLoading ? (
                  <>
                    <div className="trade-spinner"></div>
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Cancel Trade</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // Seller action for pending trades
    if (trade && trade.status === 'awaiting_seller' && isSeller) {
      return (
        <div className="trade-status-container">
          <div className="trade-actions">
            <h3 className="trade-action-title">Respond to Trade Request</h3>
            <p className="trade-action-description">
              A buyer has sent a request to purchase your item. You can accept or decline this request.
            </p>
            <div className="trade-button-group">
              <button 
                className="trade-button trade-button-primary"
                onClick={handleApproveTrade}
                disabled={approveLoading}
              >
                {approveLoading ? (
                  <>
                    <div className="trade-spinner"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Accept Request</span>
                  </>
                )}
              </button>
              <button 
                className="trade-button trade-button-outline"
                onClick={handleCancelTrade}
                disabled={approveLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Decline Request</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // Seller needs to send trade offer
    if (trade && trade.status === 'accepted' && isSeller) {
      return (
        <div className="trade-status-container">
          <div className="trade-actions">
            <h3 className="trade-action-title">Send Steam Trade Offer</h3>
            <p className="trade-action-description">
              You've accepted the buyer's trade request. Now you need to send them a Steam trade offer.
            </p>
            
            <div className="trade-input-group">
              <label htmlFor="steamTradeUrl" className="trade-input-label">Steam Trade Offer URL</label>
              <input 
                type="text"
                id="steamTradeUrl"
                className="trade-input"
                value={steamOfferUrl}
                onChange={(e) => setSteamOfferUrl(e.target.value)}
                placeholder="https://steamcommunity.com/tradeoffer/..."
              />
            </div>
            
            <div className="trade-button-group">
              <button 
                className="trade-button trade-button-primary"
                onClick={handleSubmitTradeOffer}
                disabled={sendingLoading || !steamOfferUrl}
              >
                {sendingLoading ? (
                  <>
                    <div className="trade-spinner"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Submit Trade Offer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // Buyer needs to verify trade received
    if (trade && trade.status === 'offer_sent' && isBuyer) {
      return (
        <div className="trade-status-container">
          <div className="trade-actions">
            <h3 className="trade-action-title">Confirm Trade Received</h3>
            <p className="trade-action-description">
              The seller has sent you a Steam trade offer. Check your Steam trade offers and confirm when you've received your item.
            </p>
            
            {inventoryCheckResult && (
              <div className={`trade-notification ${inventoryCheckResult.found ? 'trade-notification-success' : 'trade-notification-info'}`}>
                <div className="trade-notification-icon">
                  {inventoryCheckResult.found ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="trade-notification-content">
                  <div className="trade-notification-title">
                    {inventoryCheckResult.found ? 'Item Found in Inventory!' : 'Item Not Found Yet'}
                  </div>
                  <div className="trade-notification-message">
                    {inventoryCheckResult.found 
                      ? 'We detected the item in your inventory. You can now confirm the trade.'
                      : 'We couldn\'t find the item in your inventory yet. Please check your Steam trade offers and accept it first.'}
                  </div>
                </div>
              </div>
            )}
            
            <div className="trade-button-group">
              <a 
                href={`https://steamcommunity.com/tradeoffer/${trade.steamTradeOfferId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="trade-button trade-button-primary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>View Steam Trade Offer</span>
              </a>
              
              <button
                className="trade-button trade-button-outline"
                onClick={checkInventoryForItem}
                disabled={isCheckingInventory}
              >
                {isCheckingInventory ? (
                  <>
                    <div className="trade-spinner"></div>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Check Inventory</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="trade-button-group">
              <button
                className="trade-button trade-button-success"
                onClick={handleConfirmTrade}
                disabled={confirmLoading || (!inventoryCheckResult?.found && !confirmForceOverride)}
              >
                {confirmLoading ? (
                  <>
                    <div className="trade-spinner"></div>
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Confirm Trade Complete</span>
                  </>
                )}
              </button>
            </div>
            
            {!inventoryCheckResult?.found && (
              <div className="trade-input-group">
                <label className="trade-input-label">
                  <input
                    type="checkbox"
                    checked={confirmForceOverride}
                    onChange={(e) => setConfirmForceOverride(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  I've received the item but it's not being detected automatically
                </label>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (trade && trade.status === 'offer_sent' && isSeller) {
      return (
        <div className="trade-status-container">
          <div className="trade-actions">
            <h3 className="trade-action-title">Waiting for Buyer</h3>
            <p className="trade-action-description">
              You've sent a Steam trade offer to the buyer. Waiting for them to accept the trade and confirm receipt.
            </p>
            
            <div className="trade-notification trade-notification-info">
              <div className="trade-notification-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="trade-notification-content">
                <div className="trade-notification-title">Trade Offer Sent</div>
                <div className="trade-notification-message">
                  You sent trade offer #{trade.steamTradeOfferId}. The buyer needs to accept it and confirm receipt.
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Completed, cancelled or failed trades
    if (trade && ['completed', 'cancelled', 'failed'].includes(trade.status)) {
      const isCompleted = trade.status === 'completed';
      
      return (
        <div className="trade-status-container">
          <div className="trade-actions">
            <h3 className="trade-action-title">
              {isCompleted ? 'Trade Completed' : 'Trade Ended'}
            </h3>
            <p className="trade-action-description">
              {isCompleted 
                ? 'This trade has been successfully completed. The item has been transferred and the transaction is now finalized.'
                : `This trade has been ${trade.status}. No further action is needed.`}
            </p>
          </div>
        </div>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="trade-loading-overlay">
        <div className="trade-loading-spinner"></div>
        <div className="trade-loading-text">Loading trade details...</div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="trade-notification trade-notification-info">
        <div className="trade-notification-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="trade-notification-content">
          <div className="trade-notification-title">No trade found</div>
          <div className="trade-notification-message">No trade found with ID: {tradeId}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="trade-details-content">
      {/* Main content */}
      <div>
        {/* Status timeline */}
        <div className="trade-status-container">
          <div className="trade-status-header">
            <StatusBadge status={trade.status} />
            <div className="trade-status-date">
              Last updated: {new Date(trade.updatedAt || trade.createdAt).toLocaleString()}
            </div>
          </div>
          <StatusTimeline trade={trade} />
        </div>
        
        {/* Trade actions */}
        {renderTradeActions()}
      </div>
      
      {/* Sidebar */}
      <div>
        {/* Item details */}
        <TradeItemDetails 
          item={trade.item} 
          trade={trade} 
          price={trade.price}
        />
      </div>
    </div>
  );
};

// Helper function to determine rarity color
const getRarityColor = (rarity) => {
  rarity = (rarity || '').toLowerCase();
  
  if (rarity.includes('consumer') || rarity.includes('common')) return '#b0c3d9';
  if (rarity.includes('industrial') || rarity.includes('uncommon')) return '#5e98d9';
  if (rarity.includes('mil-spec') || rarity.includes('rare')) return '#4b69ff';
  if (rarity.includes('restricted') || rarity.includes('mythical')) return '#8847ff';
  if (rarity.includes('classified') || rarity.includes('legendary')) return '#d32ce6';
  if (rarity.includes('covert') || rarity.includes('ancient') || rarity.includes('immortal')) return '#eb4b4b';
  if (rarity.includes('contraband')) return '#e4ae39';
  
  return '#b0c3d9'; // Default color (light blue/gray)
};

// Helper functions - these should be placed at the file level, outside of any component

// This line is to identify where to place the code
const getStatusText = (status) => {
  switch (status.toLowerCase()) {
    case 'awaiting_seller':
      return 'Purchase Offer Sent';
    case 'accepted':
      return 'Seller Accepted';
    case 'offer_sent':
      return 'Steam Trade Offer Sent';
    case 'awaiting_confirmation':
      return 'Awaiting Buyer Confirmation';
    case 'completed':
      return 'Trade Completed';
    case 'cancelled':
      return 'Trade Cancelled';
    case 'failed':
      return 'Trade Failed';
    default:
      return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  }
};

const getDefaultStatusMessage = (status) => {
  switch (status.toLowerCase()) {
    case 'awaiting_seller':
      return 'Buyer has sent a purchase offer';
    case 'accepted':
      return 'Seller has accepted the purchase offer';
    case 'offer_sent':
      return 'Seller has sent a Steam trade offer';
    case 'awaiting_confirmation':
      return 'Waiting for buyer to confirm receipt';
    case 'completed':
      return 'Trade has been successfully completed';
    case 'cancelled':
      return 'Trade has been cancelled';
    case 'failed':
      return 'Trade has failed';
    default:
      return 'Status updated';
  }
};

export default TradeDetails;