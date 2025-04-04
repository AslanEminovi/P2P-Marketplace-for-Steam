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
  // Define the trade flow steps in order
  const steps = [
    { 
      status: 'awaiting_seller', 
      label: 'Offer Sent',
      icon: (active) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 12h4"></path>
          <path d="M16 12h.01"></path>
          <path d="M12 16v.01"></path>
          <path d="M12 8v.01"></path>
        </svg>
      )
    },
    { 
      status: 'accepted', 
      label: 'Seller Accepted',
      icon: (active) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      )
    },
    { 
      status: 'offer_sent', 
      label: 'Steam Offer Sent',
      icon: (active) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      )
    },
    { 
      status: 'awaiting_confirmation', 
      label: 'Buyer Confirmation',
      icon: (active) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      )
    },
    { 
      status: 'completed', 
      label: 'Completed',
      icon: (active) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      ) 
    }
  ];
  
  // Find current step index
  const currentIndex = steps.findIndex(step => step.status === trade.status);
  const isCancelled = trade.status === 'cancelled' || trade.status === 'failed';
  
  if (isCancelled) {
    return (
      <div style={{
        padding: '16px 20px',
        backgroundColor: 'rgba(127, 29, 29, 0.2)',
        color: '#f87171',
        borderRadius: '12px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        backdropFilter: 'blur(8px)'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <div>
          <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '4px' }}>
            Trade {trade.status === 'cancelled' ? 'Cancelled' : 'Failed'}
          </div>
          <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>
            {trade.status === 'cancelled' 
              ? 'This trade was cancelled and cannot be resumed.' 
              : 'This trade failed to complete. Please contact support if you need assistance.'}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ 
      marginBottom: '30px',
      backgroundColor: 'rgba(17, 24, 39, 0.4)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(55, 65, 81, 0.5)',
      backdropFilter: 'blur(8px)'
    }}>
      <h3 style={{ 
        color: '#f1f1f1', 
        margin: '0 0 20px 0',
        fontSize: '1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
        Trade Progress
      </h3>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        marginBottom: '20px'
      }}>
        {/* Timeline connector */}
        <div style={{
          position: 'absolute',
          height: '3px',
          background: 'linear-gradient(90deg, #4ade80 0%, #4ade80 ' + 
            (currentIndex >= 0 ? ((currentIndex / (steps.length - 1)) * 100) + '%' : '0%') + 
            ', #374151 ' + 
            (currentIndex >= 0 ? ((currentIndex / (steps.length - 1)) * 100) + '%' : '0%') + 
            ', #374151 100%)',
          top: '50%',
          left: '24px',
          right: '24px',
          transform: 'translateY(-50%)',
          zIndex: 1,
          borderRadius: '4px'
        }} />
        
        {/* Timeline steps */}
        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.status} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              zIndex: 2
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: isActive ? '#10b981' : '#374151',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '12px',
                transition: 'all 0.5s ease',
                boxShadow: isActive ? '0 0 12px rgba(16, 185, 129, 0.7)' : 'none',
                border: isActive ? '2px solid rgba(16, 185, 129, 0.8)' : '2px solid rgba(55, 65, 81, 0.8)',
                transform: isCurrent ? 'scale(1.15)' : 'scale(1)'
              }}>
                {isCompleted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : step.icon(isActive)}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: isActive ? '#e5e7eb' : '#9ca3af',
                textAlign: 'center',
                width: '80px',
                transition: 'all 0.3s ease',
                fontWeight: isCurrent ? '600' : '400'
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Current status info */}
      <div style={{
        backgroundColor: 'rgba(31, 41, 55, 0.5)',
        padding: '12px 16px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '12px'
      }}>
        <div style={{
          backgroundColor: getStatusBgColor(trade.status),
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: getStatusColor(trade.status),
          flexShrink: 0
        }}>
          {getStatusIcon(trade.status)}
        </div>
        <div>
          <div style={{ color: '#e5e7eb', fontWeight: '500', marginBottom: '4px' }}>
            {getStatusText(trade.status)}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
            {getDefaultStatusMessage(trade.status)}
          </div>
        </div>
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
      marginBottom: '24px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        backgroundColor: 'rgba(31, 41, 55, 0.7)',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
        <h3 style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: '600',
          color: '#f1f1f1'
        }}>
          Item Details
        </h3>
      </div>
      
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
          marginBottom: '20px',
          backgroundColor: 'rgba(17, 24, 39, 0.7)',
          borderRadius: '12px',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
          border: `1px solid ${getRarityBorderColor(rarity)}`
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.3)',
            backgroundImage: `radial-gradient(circle at center, ${getRarityColor(rarity)}22 0%, transparent 70%)`,
            zIndex: 1
          }} />
          
          <img 
            src={imageUrl}
            alt={item.marketHashName}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              position: 'relative',
              zIndex: 2,
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))',
              transition: 'transform 0.3s ease-in-out',
              transform: 'scale(1.05)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.15)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1.05)';
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTcePMQFc1nqWSMU5OD2NwOx3sIyShXOjLx2Sk5MbV5MsLD3k3xgfPYDG25bm-Wfw3vUsU9SLPWZ2yp-zWh5OqTE2nIQu4rFl9RKfEEpzdJbsiIaRpp3dUVu2u_0UZyDBl9JNNWfADjmyRCMLwnXeL51Cg/360fx360f';
            }}
          />
        </div>
        
        <h2 style={{
          color: '#f1f1f1',
          margin: '0 0 16px 0',
          fontSize: '1.35rem',
          fontWeight: '600',
          textAlign: 'center',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          {item.marketHashName || 'Unknown Item'}
        </h2>
        
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: 'rgba(31, 41, 55, 0.5)',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: getRarityColor(rarity),
            border: `1px solid ${getRarityColor(rarity)}55`
          }}>
            {rarity}
          </div>
          
          <div style={{
            backgroundColor: 'rgba(31, 41, 55, 0.5)',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: '#d1d5db',
            border: '1px solid rgba(209, 213, 219, 0.3)'
          }}>
            {wear}
          </div>
        </div>
        
        <div style={{
          fontSize: '1.8rem',
          fontWeight: '700',
          color: '#10b981',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          background: 'linear-gradient(90deg, #10b981, #4ade80)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {formatCurrency(price)}
        </div>
      </div>
    </div>
  );
};

// Main trade header component
const TradeHeader = ({ trade, userRoles }) => {
  // Display user roles clearly for debugging purposes
  const { isBuyer, isSeller } = userRoles;
  
  return (
    <div style={{
      backgroundColor: 'rgba(17, 24, 39, 0.5)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(55, 65, 81, 0.5)',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <h2 style={{
            margin: 0,
            color: '#f1f1f1',
            fontSize: '1.5rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.6 11.6L22 7v10l-6.4-4.5v-1"></path>
              <path d="M15.6 15.9L8 21V11l7.6 5.1"></path>
              <path d="M15.6 11.6L8 6v5"></path>
              <path d="M15.6 5.1L22 9l-6.4 3.6-7.6-5.1L15.6 5.1z"></path>
            </svg>
            Trade #{trade._id.substring(0, 8)}
          </h2>
          <div style={{
            fontSize: '0.9rem',
            color: '#d1d5db',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Created {new Date(trade.createdAt).toLocaleString()}
          </div>
          
          {/* Add user role information for debugging */}
          <div style={{
            fontSize: '0.85rem',
            backgroundColor: 'rgba(17, 24, 39, 0.7)',
            padding: '4px 10px',
            borderRadius: '6px',
            marginTop: '10px',
            color: isBuyer ? '#93c5fd' : (isSeller ? '#4ade80' : '#d1d5db')
          }}>
            Your Role: {isBuyer ? 'Buyer' : (isSeller ? 'Seller' : 'Viewer')}
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
              User ID: {trade.userId || 'Unknown'}
            </div>
          </div>
        </div>
        <StatusBadge status={trade.status} />
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
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [user, setUser] = useState(null);

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
    
    // Set a timeout that will show a retry button if the request takes too long
    const timeoutId = setTimeout(() => {
      setLoadingTimeout(true);
    }, 15000); // 15 seconds timeout
    
    try {
      console.log(`Loading trade details for ID: ${tradeId}`);
      const response = await axios.get(`${API_URL}/trades/${tradeId}`, {
        withCredentials: true
      });
      
      clearTimeout(timeoutId);
      setLoadingTimeout(false);
      
      console.log('Trade details loaded:', response.data);
      
      // Structure the data appropriately
      const tradeData = response.data;
      
      // Use server-provided flags if available, otherwise determine locally
      if (typeof tradeData.isUserBuyer === 'boolean') {
        setIsBuyer(tradeData.isUserBuyer);
      } else if (tradeData.buyer && user) {
        const isBuyer = tradeData.buyer._id === user.id;
        setIsBuyer(isBuyer);
        // Ensure this flag is available in the trade object
        tradeData.isUserBuyer = isBuyer;
      }
      
      if (typeof tradeData.isUserSeller === 'boolean') {
        setIsSeller(tradeData.isUserSeller);
      } else if (tradeData.seller && user) {
        const isSeller = tradeData.seller._id === user.id;
        setIsSeller(isSeller);
        // Ensure this flag is available in the trade object
        tradeData.isUserSeller = isSeller;
      }
      
      console.log(`User roles: isBuyer=${tradeData.isUserBuyer}, isSeller=${tradeData.isUserSeller}`);
      
      setTrade(tradeData);
      
      // If the trade is cancelled or completed, we can clear the form state
      if (['cancelled', 'completed', 'failed'].includes(tradeData.status)) {
        setSteamOfferUrl('');
        setCancelReason('');
      }
      
    } catch (err) {
      clearTimeout(timeoutId);
      setLoadingTimeout(false);
      
      console.error('Error loading trade details:', err);
      const errorMessage = err.response?.data?.error || 'Failed to load trade details. Please refresh the page and try again.';
      setError(errorMessage);
      
      // Show error notification
      if (window.showNotification) {
        window.showNotification(
          'Error',
          errorMessage,
          'ERROR'
        );
      } else {
        toast.error(errorMessage);
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
        // Add protection against toast being undefined
        if (typeof toast?.warning === 'function') {
          toast.warning('Please enter the Steam trade offer ID or URL to help the buyer identify your offer');
        } else {
          console.error('Please enter the Steam trade offer ID or URL to help the buyer identify your offer');
          alert('Please enter the Steam trade offer ID or URL to help the buyer identify your offer');
        }
        setSendingLoading(false);
        return;
      }
      
      const response = await axios.put(
        `${API_URL}/trades/${trade._id}/seller-sent`,
        { steamOfferUrl },
        { withCredentials: true }
      );
      
      if (response.data?.success) {
        // Add protection against toast being undefined
        if (typeof toast?.success === 'function') {
          toast.success('Successfully marked the trade offer as sent. The buyer has been notified.');
        } else {
          console.log('Successfully marked the trade offer as sent. The buyer has been notified.');
          alert('Successfully marked the trade offer as sent. The buyer has been notified.');
        }
        
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
      
      // Add protection against toast being undefined
      if (typeof toast?.error === 'function') {
        toast.error(errorMessage);
      } else {
        console.error(errorMessage);
        alert(errorMessage);
      }
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
    console.log(`Attempting to cancel trade: ${tradeId}`);
    
    try {
      // Ensure the reason is valid
      const cancelData = {
        reason: cancelReason || 'No reason provided'
      };
      
      // Make API call with explicit credentials setting
      const response = await axios({
        method: 'put',
        url: `${API_URL}/trades/${tradeId}/cancel`,
        data: cancelData,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Cancel trade response:', response.data);
      
      if (response.data.success) {
        // Show success notification
        if (window.showNotification) {
          window.showNotification(
            'Trade Cancelled',
            'The trade has been successfully cancelled.',
            'SUCCESS'
          );
        } else {
          toast.success('Trade cancelled successfully');
        }
        
        setCancelReason('');
        
        // Hide the modal immediately
        const modal = document.getElementById('cancelModal');
        if (modal) modal.classList.remove('visible');
        
        // Reload the trade details to show the updated status
        loadTradeDetails();
        
        // Redirect to trades page after a short delay
        setTimeout(() => {
          window.location.href = '/trades';
        }, 1500);
      } else {
        throw new Error(response.data.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Error cancelling trade:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to cancel trade. Please try again.';
      setError(errorMessage);
      
      // Show error notification
      if (window.showNotification) {
        window.showNotification(
          'Error',
          errorMessage,
          'ERROR'
        );
      } else {
        toast.error(errorMessage);
      }
      
      // Keep the modal open to allow retry
      const modal = document.getElementById('cancelModal');
      if (modal) modal.classList.add('visible');
    } finally {
      setLoading(false);
    }
  };

  const renderTradeActions = () => {
    if (!trade || loading) return null;
    
    // Based on trade status and user role, show different action buttons
    if (trade.status === 'completed' || trade.status === 'cancelled' || trade.status === 'failed') {
      return null; // No actions for completed/cancelled/failed trades
    }
    
    return (
      <div style={{
        backgroundColor: 'rgba(17, 24, 39, 0.4)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(55, 65, 81, 0.5)',
        marginBottom: '24px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(8px)'
      }}>
        <h3 style={{ 
          color: '#f1f1f1', 
          margin: '0 0 20px 0',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
          Trade Actions
        </h3>

        {/* Debug info for role detection */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#9ca3af',
          marginBottom: '16px'
        }}>
          <div>Your User ID: {user?.id || localStorage.getItem('userId') || 'Unknown'}</div>
          <div>Buyer ID: {trade.buyer?._id || 'Unknown'}</div>
          <div>Seller ID: {trade.seller?._id || 'Unknown'}</div>
          <div>Is Buyer: {trade.isUserBuyer ? 'Yes' : 'No'}</div>
          <div>Is Seller: {trade.isUserSeller ? 'Yes' : 'No'}</div>
        </div>

        {/* Seller actions */}
        {trade.isUserSeller && (
          <div>
            {trade.status === 'awaiting_seller' && (
              <button
                onClick={handleSellerApprove}
                disabled={approveLoading}
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#f1f1f1',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  cursor: approveLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  width: '100%',
                  fontSize: '1.05rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                  opacity: approveLoading ? '0.7' : '1',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {approveLoading ? (
                  <>
                    <div className="spinner" style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      borderTopColor: 'white'
                    }} />
                    Processing...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Accept Purchase Offer
                  </>
                )}
              </button>
            )}

            {trade.status === 'accepted' && (
              <div>
                <div style={{
                  backgroundColor: 'rgba(30, 64, 175, 0.2)',
                  color: '#93c5fd',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: '0 0 12px 0', fontWeight: '500' }}>
                    Please send a Steam trade offer to the buyer
                  </p>
                  <a 
                    href={trade.buyer?.tradeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      color: '#3b82f6',
                      textDecoration: 'none',
                      display: 'block',
                      padding: '8px',
                      backgroundColor: 'rgba(17, 24, 39, 0.5)',
                      borderRadius: '4px',
                      wordBreak: 'break-all',
                      marginBottom: '12px'
                    }}
                  >
                    {trade.buyer?.tradeUrl}
                  </a>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      color: '#f1f1f1', 
                      display: 'block', 
                      marginBottom: '8px',
                      fontSize: '0.9rem' 
                    }}>
                      Trade Offer ID/URL (optional):
                    </label>
                    <input
                      type="text"
                      value={steamOfferUrl}
                      onChange={(e) => setSteamOfferUrl(e.target.value)}
                      placeholder="Enter Steam trade offer ID or URL"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: 'rgba(17, 24, 39, 0.5)',
                        border: '1px solid rgba(55, 65, 81, 0.7)',
                        borderRadius: '6px',
                        color: '#f1f1f1',
                        outline: 'none',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={handleSellerConfirmSent}
                    disabled={sendingLoading || sellerWaitingForBuyer}
                    style={{
                      backgroundColor: sellerWaitingForBuyer ? '#10b981' : '#3b82f6',
                      color: '#f1f1f1',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      cursor: sendingLoading || sellerWaitingForBuyer ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      width: '100%',
                      fontSize: '1rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      opacity: sendingLoading ? '0.7' : '1'
                    }}
                  >
                    {sendingLoading ? (
                      <>
                        <div className="spinner" style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid rgba(255,255,255,0.2)',
                          borderRadius: '50%',
                          borderTopColor: 'white'
                        }} />
                        Sending...
                      </>
                    ) : sellerWaitingForBuyer ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Waiting for buyer...
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                        </svg>
                        I've Sent the Trade Offer
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {(['awaiting_seller', 'accepted', 'created'].includes(trade.status)) && (
              <button
                onClick={() => {
                  setCancelReason('');
                  const modal = document.getElementById('cancelModal');
                  if (modal) modal.classList.add('visible');
                }}
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.9)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  width: '100%',
                  fontWeight: '500',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: trade.status === 'accepted' ? '16px' : '0',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(185, 28, 28, 1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Cancel Trade
              </button>
            )}
          </div>
        )}

        {/* Buyer actions */}
        {trade.isUserBuyer && (
          <div>
            {trade.status === 'offer_sent' && (
              <div>
                <div style={{
                  backgroundColor: 'rgba(30, 64, 175, 0.2)',
                  color: '#93c5fd',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: '0 0 12px 0', fontWeight: '500' }}>
                    The seller has sent you a Steam trade offer
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>
                    Please check your Steam trade offers and accept the offer before confirming receipt below.
                  </p>
                  
                  {trade.steamTradeOfferId && (
                    <a
                      href={`https://steamcommunity.com/tradeoffer/${trade.steamTradeOfferId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#3b82f6',
                        textDecoration: 'none',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(17, 24, 39, 0.5)',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                      View Steam Trade Offer
                    </a>
                  )}
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <button
                    onClick={handleCheckInventory}
                    disabled={isCheckingInventory}
                    style={{
                      backgroundColor: 'rgba(31, 41, 55, 0.7)',
                      color: '#e5e7eb',
                      border: '1px solid rgba(55, 65, 81, 0.7)',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      cursor: isCheckingInventory ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      width: '100%',
                      fontSize: '0.9rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      opacity: isCheckingInventory ? '0.7' : '1'
                    }}
                  >
                    {isCheckingInventory ? (
                      <>
                        <div className="spinner" style={{
                          width: '18px',
                          height: '18px',
                          border: '2px solid rgba(255,255,255,0.2)',
                          borderRadius: '50%',
                          borderTopColor: 'white'
                        }} />
                        Checking...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Verify Item Received
                      </>
                    )}
                  </button>
                </div>
                
                {inventoryCheckResult && (
                  <div style={{
                    backgroundColor: inventoryCheckResult.canConfirmReceived ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: inventoryCheckResult.canConfirmReceived ? '#10b981' : '#ef4444',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>
                      {inventoryCheckResult.message}
                    </p>
                  </div>
                )}
                
                <button
                  onClick={handleBuyerConfirm}
                  disabled={confirmLoading || !canConfirmReceived}
                  style={{
                    backgroundColor: canConfirmReceived ? '#10b981' : 'rgba(156, 163, 175, 0.5)',
                    color: '#f1f1f1',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    cursor: confirmLoading || !canConfirmReceived ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    width: '100%',
                    fontSize: '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    opacity: confirmLoading ? '0.7' : '1'
                  }}
                >
                  {confirmLoading ? (
                    <>
                      <div className="spinner" style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        borderTopColor: 'white'
                      }} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      Confirm Item Received
                    </>
                  )}
                </button>
              </div>
            )}
            
            {(['awaiting_seller', 'created', 'offer_sent'].includes(trade.status)) && (
              <button
                onClick={() => {
                  setCancelReason('');
                  const modal = document.getElementById('cancelModal');
                  if (modal) modal.classList.add('visible');
                }}
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.9)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  width: '100%',
                  fontWeight: '500',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(185, 28, 28, 1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Cancel Trade
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {loading ? (
        <div style={{
          height: '300px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          backgroundColor: 'rgba(17, 24, 39, 0.4)',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(55, 65, 81, 0.5)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
        }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(79, 70, 229, 0.3)',
            borderTop: '3px solid #818cf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ color: '#d1d5db', fontSize: '1rem', fontWeight: '500' }}>
            Loading trade details...
          </div>
          
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : error && !trade ? (
        <div style={{
          padding: '24px',
          backgroundColor: 'rgba(127, 29, 29, 0.3)',
          color: '#f87171',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: '600' }}>Error Loading Trade</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '1rem', opacity: '0.9' }}>{error}</p>
            <button
              onClick={loadTradeDetails}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <polyline points="23 20 23 14 17 14"></polyline>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
              Retry
            </button>
          </div>
        </div>
      ) : trade ? (
        <div style={{
          backgroundColor: 'rgba(31, 41, 55, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(55, 65, 81, 0.5)'
        }}>
          {/* Trade header with user role information */}
          <TradeHeader trade={trade} userRoles={{ isBuyer, isSeller }} />

          {error && (
            <div style={{
              backgroundColor: 'rgba(127, 29, 29, 0.3)',
              color: '#f87171',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '1rem' }}>Error</div>
                <div style={{ fontSize: '0.95rem' }}>{error}</div>
                {tradeOffersUrl && (
                  <a 
                    href={tradeOffersUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#f87171',
                      textDecoration: 'none',
                      marginTop: '10px',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      padding: '6px 12px',
                      backgroundColor: 'rgba(127, 29, 29, 0.2)',
                      borderRadius: '6px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(127, 29, 29, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(127, 29, 29, 0.2)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Check Your Steam Trade Offers
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Trade Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 350px',
            gap: '30px'
          }}>
            {/* Main content */}
            <div>
              {/* Status timeline */}
              <StatusTimeline trade={trade} />
              
              {/* Display role debugging information */}
              <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.4)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                border: '1px solid rgba(55, 65, 81, 0.3)',
                color: '#d1d5db',
                fontSize: '0.9rem'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#f1f1f1' }}>Role Information</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ 
                    padding: '4px 10px', 
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                    borderRadius: '6px',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    Buyer ID: {trade.buyer?._id || 'Unknown'}
                  </div>
                  <div style={{ 
                    padding: '4px 10px', 
                    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    Seller ID: {trade.seller?._id || 'Unknown'}
                  </div>
                  <div style={{ 
                    padding: '4px 10px', 
                    backgroundColor: isBuyer ? 'rgba(59, 130, 246, 0.3)' : 'rgba(107, 114, 128, 0.2)', 
                    borderRadius: '6px',
                    border: `1px solid ${isBuyer ? 'rgba(59, 130, 246, 0.4)' : 'rgba(107, 114, 128, 0.3)'}`,
                    fontWeight: isBuyer ? '500' : '400'
                  }}>
                    Is Buyer: {isBuyer ? 'Yes' : 'No'}
                  </div>
                  <div style={{ 
                    padding: '4px 10px', 
                    backgroundColor: isSeller ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.2)', 
                    borderRadius: '6px',
                    border: `1px solid ${isSeller ? 'rgba(16, 185, 129, 0.4)' : 'rgba(107, 114, 128, 0.3)'}`,
                    fontWeight: isSeller ? '500' : '400'
                  }}>
                    Is Seller: {isSeller ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
              
              {/* Trade information */}
              <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.4)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid rgba(55, 65, 81, 0.5)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(8px)'
              }}>
                <h3 style={{ 
                  color: '#f1f1f1', 
                  margin: '0 0 20px 0',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  Trade Help
                </h3>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  color: '#d1d5db',
                  fontSize: '0.95rem',
                  backgroundColor: 'rgba(31, 41, 55, 0.5)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(55, 65, 81, 0.5)'
                }}>
                  <p style={{ margin: 0, lineHeight: '1.6' }}>
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
                      gap: '8px',
                      marginTop: '8px',
                      padding: '10px 16px',
                      backgroundColor: 'rgba(17, 24, 39, 0.5)',
                      borderRadius: '8px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(17, 24, 39, 0.7)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(17, 24, 39, 0.5)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Open Steam Trade Offers
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </div>
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
                border: '1px solid rgba(55, 65, 81, 0.5)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(8px)'
              }}>
                <h3 style={{ 
                  color: '#f1f1f1', 
                  margin: '0 0 20px 0',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  Trade Help
                </h3>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  color: '#d1d5db',
                  fontSize: '0.95rem',
                  backgroundColor: 'rgba(31, 41, 55, 0.5)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(55, 65, 81, 0.5)'
                }}>
                  <p style={{ margin: 0, lineHeight: '1.6' }}>
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
                      gap: '8px',
                      marginTop: '8px',
                      padding: '10px 16px',
                      backgroundColor: 'rgba(17, 24, 39, 0.5)',
                      borderRadius: '8px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(17, 24, 39, 0.7)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(17, 24, 39, 0.5)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Open Steam Trade Offers
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trade actions */}
          {renderTradeActions()}
        </div>
      ) : (
        <div style={{
          backgroundColor: 'rgba(31, 41, 55, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '1100px',
          margin: '0 auto',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(55, 65, 81, 0.5)'
        }}>
          <TradeHeader trade={trade} userRoles={{ isBuyer, isSeller }} />

          {error && (
            <div style={{
              backgroundColor: 'rgba(127, 29, 29, 0.3)',
              color: '#f87171',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '1rem' }}>Error</div>
                <div style={{ fontSize: '0.95rem' }}>{error}</div>
                {tradeOffersUrl && (
                  <a 
                    href={tradeOffersUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#f87171',
                      textDecoration: 'none',
                      marginTop: '10px',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      padding: '6px 12px',
                      backgroundColor: 'rgba(127, 29, 29, 0.2)',
                      borderRadius: '6px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(127, 29, 29, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(127, 29, 29, 0.2)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Check Your Steam Trade Offers
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Trade Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 350px',
            gap: '30px'
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
                border: '1px solid rgba(55, 65, 81, 0.5)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(8px)'
              }}>
                <h3 style={{ 
                  color: '#f1f1f1', 
                  margin: '0 0 20px 0',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  Trade Help
                </h3>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  color: '#d1d5db',
                  fontSize: '0.95rem',
                  backgroundColor: 'rgba(31, 41, 55, 0.5)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(55, 65, 81, 0.5)'
                }}>
                  <p style={{ margin: 0, lineHeight: '1.6' }}>
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
                      gap: '8px',
                      marginTop: '8px',
                      padding: '10px 16px',
                      backgroundColor: 'rgba(17, 24, 39, 0.5)',
                      borderRadius: '8px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(17, 24, 39, 0.7)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(17, 24, 39, 0.5)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Open Steam Trade Offers
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </div>
              
              {/* Status history */}
              {trade.statusHistory && (
                <div style={{
                  backgroundColor: 'rgba(17, 24, 39, 0.4)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                  border: '1px solid rgba(55, 65, 81, 0.5)',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(8px)'
                }}>
                  <h3 style={{ 
                    color: '#f1f1f1', 
                    margin: '0 0 20px 0',
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    Status History
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {trade.statusHistory.map((entry, index) => (
                      <div 
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '16px',
                          padding: '16px',
                          backgroundColor: 'rgba(31, 41, 55, 0.5)',
                          borderRadius: '12px',
                          border: '1px solid rgba(55, 65, 81, 0.5)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {index < trade.statusHistory.length - 1 && (
                          <div style={{
                            position: 'absolute',
                            left: '27px',
                            top: '48px',
                            bottom: '-16px',
                            width: '2px',
                            backgroundColor: 'rgba(55, 65, 81, 0.8)',
                            zIndex: 1
                          }} />
                        )}
                        
                        <div style={{
                          backgroundColor: getStatusBgColor(entry.status),
                          color: getStatusColor(entry.status),
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRadius: '50%',
                          flexShrink: 0,
                          boxShadow: `0 0 12px ${getStatusBgColor(entry.status)}80`,
                          border: `2px solid ${getStatusColor(entry.status)}`,
                          zIndex: 2
                        }}>
                          {getStatusIcon(entry.status)}
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            color: '#f1f1f1',
                            marginBottom: '8px',
                            fontWeight: '600',
                            fontSize: '1.05rem'
                          }}>
                            {getStatusText(entry.status)}
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            <div style={{ 
                              color: '#9ca3af', 
                              fontSize: '0.9rem',
                              flex: '1',
                              minWidth: '200px' 
                            }}>
                              {entry.message || getDefaultStatusMessage(entry.status)}
                            </div>
                            <div style={{ 
                              color: '#9ca3af', 
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: 'rgba(17, 24, 39, 0.5)',
                              padding: '4px 10px',
                              borderRadius: '6px'
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
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
                border: '1px solid rgba(55, 65, 81, 0.5)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(8px)'
              }}>
                <h3 style={{ 
                  color: '#f1f1f1', 
                  margin: '0 0 20px 0',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  Trade Help
                </h3>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  color: '#d1d5db',
                  fontSize: '0.95rem',
                  backgroundColor: 'rgba(31, 41, 55, 0.5)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(55, 65, 81, 0.5)'
                }}>
                  <p style={{ margin: 0, lineHeight: '1.6' }}>
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
                      gap: '8px',
                      marginTop: '8px',
                      padding: '10px 16px',
                      backgroundColor: 'rgba(17, 24, 39, 0.5)',
                      borderRadius: '8px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(17, 24, 39, 0.7)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(17, 24, 39, 0.5)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Open Steam Trade Offers
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            overflowY: 'auto',
            backdropFilter: 'blur(5px)'
          }}
          onClick={(e) => {
            if (e.target.id === 'cancelModal') {
              e.target.classList.remove('visible');
            }
          }}>
            <div style={{
              backgroundColor: 'rgba(31, 41, 55, 0.95)',
              padding: '30px',
              borderRadius: '16px',
              maxWidth: '550px',
              width: '100%',
              position: 'relative',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '15px',
                marginBottom: '24px'
              }}>
                <div style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.2)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(220, 38, 38, 0.3)'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
                <div>
                  <h3 style={{ 
                    color: '#f1f1f1', 
                    marginTop: '0',
                    marginBottom: '8px',
                    fontSize: '1.5rem',
                    fontWeight: '600' 
                  }}>Cancel Trade</h3>
                  <p style={{ 
                    color: '#9ca3af',
                    margin: '0',
                    fontSize: '1rem',
                    lineHeight: '1.5' 
                  }}>
                    Are you sure you want to cancel this trade? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label 
                  htmlFor="cancelReason" 
                  style={{ 
                    display: 'block', 
                    color: '#e5e7eb', 
                    marginBottom: '10px',
                    fontSize: '0.95rem',
                    fontWeight: '500'
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
                    padding: '14px',
                    backgroundColor: 'rgba(31, 41, 55, 0.7)',
                    border: '1px solid rgba(75, 85, 99, 0.5)',
                    borderRadius: '8px',
                    color: '#f1f1f1',
                    minHeight: '100px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    resize: 'vertical'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(79, 70, 229, 0.6)';
                    e.target.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <button
                  onClick={() => {
                    const modal = document.getElementById('cancelModal');
                    if (modal) modal.classList.remove('visible');
                  }}
                  style={{
                    backgroundColor: 'rgba(31, 41, 55, 0.7)',
                    color: '#e5e7eb',
                    border: '1px solid rgba(75, 85, 99, 0.5)',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    width: '48%',
                    fontSize: '0.95rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = 'rgba(31, 41, 55, 0.9)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'rgba(31, 41, 55, 0.7)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Go Back
                </button>
                <button
                  onClick={handleCancelTrade}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#9ca3af' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    width: '48%',
                    fontSize: '0.95rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#b91c1c';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 15px rgba(220, 38, 38, 0.35)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.25)';
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <div className="spinner" style={{
                        display: 'inline-block',
                        width: '18px',
                        height: '18px',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        borderTopColor: 'white',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                      Yes, Cancel Trade
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions - these should be placed at the file level, outside of any component

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

// Helper function to get rarity border color (slightly darker than the main color)
const getRarityBorderColor = (rarity) => {
  const color = getRarityColor(rarity);
  
  // Create a slightly darker version of the color for the border
  if (color.startsWith('#')) {
    // Simple darkening for hex colors
    return color + '99';
  }
  
  return color;
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
  const iconProps = { width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  
  switch (status) {
    case 'completed':
      return <svg {...iconProps} viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
    case 'awaiting_seller':
      return <svg {...iconProps} viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"></circle><polyline points="12 9 12 12 14 14"></polyline></svg>;
    case 'offer_sent':
      return <svg {...iconProps} viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
    case 'awaiting_confirmation':
      return <svg {...iconProps} viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
    case 'cancelled':
    case 'failed':
      return <svg {...iconProps} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
    default:
      return <svg {...iconProps} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
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

const getStatusText = (status) => {
  switch (status) {
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

export default TradeDetails;