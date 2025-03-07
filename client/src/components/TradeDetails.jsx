import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatCurrency, API_URL } from '../config/constants';
import { Button, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';

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
      case 'failed':
        return { bg: '#7f1d1d', text: '#f87171' };
      default:
        return { bg: '#374151', text: '#e5e7eb' };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'awaiting_seller':
        return 'Purchase Offer Sent';
      case 'accepted':
        return 'Seller Accepted - Waiting for Steam Trade Offer';
      case 'offer_sent':
        return 'Steam Trade Offer Created';
      case 'awaiting_confirmation':
        return 'Awaiting Your Confirmation';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status?.replace(/_/g, ' ') || 'Unknown';
    }
  };

  const colors = getStatusColor();
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
      {getStatusText()}
    </span>
  );
};

// Add a new visual timeline component for trade status
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
      <div style={{
        padding: '10px 16px',
        backgroundColor: 'rgba(127, 29, 29, 0.2)',
        color: '#f87171',
        borderRadius: '8px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        This trade has been {trade.status === 'cancelled' ? 'cancelled' : 'failed'}
      </div>
    );
  }
  
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        marginBottom: '6px'
      }}>
        {/* Timeline connector */}
        <div style={{
          position: 'absolute',
          height: '2px',
          backgroundColor: '#374151',
          top: '50%',
          left: '12px',
          right: '12px',
          transform: 'translateY(-50%)',
          zIndex: 1
        }} />
        
        {/* Timeline steps */}
        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCompleted = index < currentIndex;
          
          return (
            <div key={step.status} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              zIndex: 2
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: isActive ? '#4ade80' : '#374151',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 0 8px rgba(74, 222, 128, 0.6)' : 'none'
              }}>
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : index === currentIndex ? (
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: 'white' 
                  }} />
                ) : null}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: isActive ? '#e5e7eb' : '#9ca3af',
                textAlign: 'center',
                width: '70px',
                transition: 'all 0.3s ease'
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Improved Trade UI for item details section
const TradeItemDetails = ({ item, trade, price }) => {
  const rarity = item?.rarity || trade?.itemRarity || 'Unknown';
  const wear = item?.wear || trade?.itemWear || 'Unknown';
  const imageUrl = item?.imageUrl || trade?.itemImage || 'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEGegouTxTgsSxQt5M1V_eNC-VZzY89ssYDjGIzw1B_Z7PlMmQzJVGaVaUJC_Q7-Q28UiRh7pQ7VoLj9ewDKw_us4PAN7coOopJTMDWXvSGMF_860g60agOe8ONpyK-i3vuaGgCUg25_ToQnOKE6bBunMsoYhg/360fx360f';
  
  return (
    <div style={{
      backgroundColor: 'rgba(17, 24, 39, 0.4)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid rgba(55, 65, 81, 0.5)',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px'
      }}>
        <div style={{
          width: '200px',
          height: '150px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '16px',
          backgroundColor: 'rgba(17, 24, 39, 0.5)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <img 
            src={imageUrl}
            alt={item.marketHashName}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTcePMQFc1nqWSMU5OD2NwOx3sIyShXOjLx2Sk5MbV5MsLD3k3xgfPYDG25bm-Wfw3vUsU9SLPWZ2yp-zWh5OqTE2nIQu4rFl9RKfEEpzdJbsiIaRpp3dUVu2u_0UZyDBl9JNNWfADjmyRCMLwnXeL51Cg/360fx360f';
            }}
          />
        </div>
        
        <h2 style={{
          color: '#f1f1f1',
          margin: '0 0 8px 0',
          fontSize: '1.25rem',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {item.marketHashName || 'Unknown Item'}
        </h2>
        
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            backgroundColor: 'rgba(31, 41, 55, 0.5)',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            color: getRarityColor(rarity)
          }}>
            {rarity}
          </div>
          
          <div style={{
            backgroundColor: 'rgba(31, 41, 55, 0.5)',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            color: '#d1d5db'
          }}>
            {wear}
          </div>
        </div>
        
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#4ade80'
        }}>
          {formatCurrency(price)}
        </div>
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
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_URL}/trades/${tradeId}/cancel`, {
        reason: cancelReason
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setCancelReason('');
        loadTradeDetails();
      }
    } catch (err) {
      console.error('Error cancelling trade:', err);
      setError(err.response?.data?.error || 'Failed to cancel trade');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !trade) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderRadius: '50%',
          borderTopColor: '#4ade80',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  if (error && !trade) {
    return (
      <div style={{
        backgroundColor: '#7f1d1d',
        color: '#f87171',
        padding: '16px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!trade) {
    return (
      <div style={{
        backgroundColor: '#1f2937',
        padding: '16px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <p>No trade found with ID: {tradeId}</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      padding: '20px',
      maxWidth: '1000px',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#f1f1f1', margin: '0' }}>Trade #{trade._id.substring(0, 8)}</h2>
        <StatusBadge status={trade.status} />
      </div>

      {error && (
        <div style={{
          backgroundColor: '#7f1d1d',
          color: '#f87171',
          padding: '10px 16px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Show inventory check results */}
      {error && (
        <div className="alert alert-warning mt-3">
          <p>{error}</p>
          {tradeOffersUrl && (
            <p>
              <a href={tradeOffersUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
                <i className="fas fa-external-link-alt mr-1"></i> Check Your Steam Trade Offers
              </a>
            </p>
          )}
        </div>
      )}

      {/* Trade Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 350px',
        gap: '24px'
      }}>
        {/* Main content */}
        <div>
          {/* Status timeline */}
          <StatusTimeline trade={trade} />
          
          {/* Trade information */}
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(55, 65, 81, 0.5)'
          }}>
            <h3 style={{ 
              color: '#f1f1f1', 
              margin: '0 0 16px 0',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Trade Information
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              <div>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Seller
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  color: '#f1f1f1'
                }}>
                  <img 
                    src={trade.seller?.avatar || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'} 
                    alt={trade.seller?.displayName || 'Unknown'}
                    style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                  />
                  {trade.seller?.displayName || 'Unknown Seller'}
                </div>
              </div>
              
              <div>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Buyer
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  color: '#f1f1f1'
                }}>
                  <img 
                    src={trade.buyer?.avatar || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'} 
                    alt={trade.buyer?.displayName || 'Unknown'}
                    style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                  />
                  {trade.buyer?.displayName || 'Unknown Buyer'}
                </div>
              </div>
              
              <div>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Created
                </div>
                <div style={{ color: '#f1f1f1' }}>
                  {new Date(trade.createdAt).toLocaleString()}
                </div>
              </div>
              
              <div>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Trade ID
                </div>
                <div style={{ 
                  color: '#f1f1f1',
                  fontSize: '0.9rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {trade._id}
                </div>
              </div>
              
              {trade.steamTradeOfferId && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '4px' }}>
                    Steam Trade Offer
                  </div>
                  <div style={{ 
                    color: '#f1f1f1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <a 
                      href={`https://steamcommunity.com/tradeoffer/${trade.steamTradeOfferId}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#3b82f6',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      View on Steam
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Trade status history */}
          {trade.statusHistory && trade.statusHistory.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(17, 24, 39, 0.4)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(55, 65, 81, 0.5)',
              marginBottom: '24px'
            }}>
              <h3 style={{ 
                color: '#f1f1f1', 
                margin: '0 0 16px 0',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Status History
              </h3>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {trade.statusHistory.map((entry, index) => (
                  <div 
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: 'rgba(31, 41, 55, 0.5)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{
                      backgroundColor: getStatusBgColor(entry.status),
                      color: getStatusColor(entry.status),
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: '50%',
                      flexShrink: 0
                    }}>
                      {getStatusIcon(entry.status)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        color: '#f1f1f1',
                        marginBottom: '4px',
                        fontWeight: '500'
                      }}>
                        {getStatusText(entry.status)}
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                          {entry.message || getDefaultStatusMessage(entry.status)}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
          
          {/* Help and info */}
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.4)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(55, 65, 81, 0.5)'
          }}>
            <h3 style={{ 
              color: '#f1f1f1', 
              margin: '0 0 16px 0',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Trade Help
            </h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: '#d1d5db',
              fontSize: '0.9rem'
            }}>
              <p style={{ margin: 0 }}>
                If you're experiencing issues with this trade, make sure to check your Steam trade offers directly.
              </p>
              
              <a 
                href="https://steamcommunity.com/my/tradeoffers" 
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: '#3b82f6',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px'
                }}
              >
                Open Steam Trade Offers
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <div id="cancelModal" style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target.id === 'cancelModal') {
          e.target.style.display = 'none';
        }
      }}>
        <div style={{
          backgroundColor: '#1f2937',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%'
        }}
        onClick={(e) => e.stopPropagation()}>
          <h3 style={{ color: '#f1f1f1', marginTop: '0' }}>Cancel Trade</h3>
          <p style={{ color: '#d1d5db' }}>
            Are you sure you want to cancel this trade? This action cannot be undone.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="cancelReason" 
              style={{ 
                display: 'block', 
                color: '#d1d5db', 
                marginBottom: '8px' 
              }}
            >
              Reason for cancellation (optional):
            </label>
            <textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Explain why you're cancelling this trade..."
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                color: '#f1f1f1',
                minHeight: '80px'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => {
                const modal = document.getElementById('cancelModal');
                if (modal) modal.style.display = 'none';
              }}
              style={{
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                width: '48%'
              }}
            >
              Go Back
            </button>
            <button
              onClick={() => {
                handleCancelTrade();
                const modal = document.getElementById('cancelModal');
                if (modal) modal.style.display = 'none';
              }}
              disabled={loading}
              style={{
                backgroundColor: '#7f1d1d',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                width: '48%'
              }}
            >
              {loading ? 'Processing...' : 'Yes, Cancel Trade'}
            </button>
          </div>
        </div>
      </div>

      {/* Cancel reason form (hidden by default) */}
      <div id="cancel-reason" style={{ display: 'none', marginTop: '20px' }}>
        <h3 style={{ color: '#f1f1f1' }}>Cancel Trade</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Please provide a reason for cancelling this trade:
        </p>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '4px',
            color: '#f1f1f1',
            marginBottom: '16px',
            minHeight: '100px',
            resize: 'vertical'
          }}
          placeholder="Enter cancellation reason..."
        />
        <div>
          <button
            onClick={handleCancelTrade}
            disabled={loading || !cancelReason}
            style={{
              backgroundColor: '#ef4444',
              color: '#f1f1f1',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '4px',
              cursor: loading || !cancelReason ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              marginRight: '8px',
              opacity: loading || !cancelReason ? '0.7' : '1'
            }}
          >
            {loading ? 'Processing...' : 'Confirm Cancellation'}
          </button>
          <button
            onClick={() => document.getElementById('cancel-reason').style.display = 'none'}
            style={{
              backgroundColor: 'transparent',
              color: '#9ca3af',
              border: '1px solid #4b5563',
              padding: '10px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Back
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          #cancelModal {
            display: none;
          }
        `}
      </style>
    </div>
  );
};

// Helper function to determine rarity color
const getRarityColor = (rarity) => {
  const rarityColors = {
    'Consumer Grade': '#b0c3d9',
    'Industrial Grade': '#5e98d9',
    'Mil-Spec Grade': '#4b69ff',
    'Restricted': '#8847ff',
    'Classified': '#d32ee6',
    'Covert': '#eb4b4b',
    'Contraband': '#e4ae39',
    '★': '#e4ae39'  // For knives
  };
  
  return rarityColors[rarity] || '#b0c3d9';
};

// Helper function to get status color, background and icon
const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return '#4ade80';
    case 'awaiting_seller':
      return '#93c5fd';
    case 'offer_sent':
      return '#fde047';
    case 'awaiting_confirmation':
      return '#fdba74';
    case 'cancelled':
    case 'failed':
      return '#f87171';
    default:
      return '#e5e7eb';
  }
};

const getStatusBgColor = (status) => {
  switch (status) {
    case 'completed':
      return '#166534';
    case 'awaiting_seller':
      return '#1e40af';
    case 'offer_sent':
      return '#854d0e';
    case 'awaiting_confirmation':
      return '#9a3412';
    case 'cancelled':
    case 'failed':
      return '#7f1d1d';
    default:
      return '#374151';
  }
};

const getStatusIcon = (status) => {
  const iconProps = { width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  
  switch (status) {
    case 'completed':
      return <svg {...iconProps} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>;
    case 'awaiting_seller':
      return <svg {...iconProps} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
    case 'offer_sent':
      return <svg {...iconProps} viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
    case 'awaiting_confirmation':
      return <svg {...iconProps} viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
    case 'cancelled':
    case 'failed':
      return <svg {...iconProps} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
    default:
      return <svg {...iconProps} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>;
  }
};

const getDefaultStatusMessage = (status) => {
  switch (status) {
    case 'completed':
      return 'Trade successfully completed';
    case 'awaiting_seller':
      return 'Waiting for seller to accept';
    case 'accepted':
      return 'Seller accepted the offer';
    case 'offer_sent':
      return 'Steam trade offer was sent';
    case 'awaiting_confirmation':
      return 'Waiting for buyer confirmation';
    case 'cancelled':
      return 'Trade was cancelled';
    case 'failed':
      return 'Trade failed to complete';
    default:
      return 'Status updated';
  }
};

export default TradeDetails;