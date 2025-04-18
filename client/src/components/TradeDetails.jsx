import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatCurrency, API_URL } from '../config/constants';
import { Button, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';

// Redux imports
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchTradeDetails, 
  updateTradeStatus,
  selectCurrentTrade, 
  selectTradeDetailsLoading, 
  selectTradesError,
  resetCurrentTrade
} from '../redux/slices/tradesSlice';

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
            {getDefaultStatusMessage(trade.status, trade.isUserSeller, trade.isUserBuyer)}
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
  // Redux hooks
  const dispatch = useDispatch();
  const trade = useSelector(selectCurrentTrade);
  const loading = useSelector(selectTradeDetailsLoading);
  const reduxError = useSelector(selectTradesError);

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
  const retryAttempted = useRef(false);
  
  // Additional state for seller waiting status
  const sellerWaitingForBuyer = trade?.status === 'awaiting_buyer' && trade?.isUserSeller;

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

  // Load trade details from Redux
  useEffect(() => {
    if (tradeId) {
      dispatch(fetchTradeDetails(tradeId));
    }
    
    // Cleanup function to reset current trade on unmount
    return () => {
      dispatch(resetCurrentTrade());
    };
  }, [tradeId, dispatch]);

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
                          <path d="M5.45 5.11L2 12v6a2 2 0 0 1-2 2h16a2 2 0 0 1 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
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

  if (loading && !trade) {
    return (
      <div className="trade-details-loading">
        <div className="spinner"></div>
        <p>Loading trade details...</p>
      </div>
    );
  }

  if (error && !trade) {
    return (
      <div className="trade-details-error">
        <h3>Error Loading Trade</h3>
        <p>{error}</p>
        <button 
          className="trade-details-retry" 
          onClick={() => dispatch(fetchTradeDetails(tradeId))}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="trade-details-not-found">
        <h3>Trade Not Found</h3>
        <p>The requested trade could not be found or you don't have permission to view it.</p>
      </div>
    );
  }

  // Render the rest of the component (existing code)
  return (
    <div className="trade-details-container">
      {/* Trade header with user role information */}
      <TradeHeader trade={trade} userRoles={{ isBuyer, isSeller }} />

      {/* Error section */}
      {error && (
        <div className="trade-details-error-message">
          <p>{error}</p>
          {tradeOffersUrl && (
            <a 
              href={tradeOffersUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="trade-details-steam-link"
            >
              Check Your Steam Trade Offers
            </a>
          )}
        </div>
      )}

      {/* Trade content */}
      <div className="trade-details-content">
        {/* Main content */}
        <div className="trade-details-main">
          {/* Status timeline */}
          <StatusTimeline trade={trade} />
          
          {/* Trade information and actions */}
          {renderTradeActions()}
        </div>

        {/* Sidebar */}
        <div className="trade-details-sidebar">
          {/* Item details */}
          <TradeItemDetails 
            item={trade.item} 
            trade={trade} 
            price={trade.price}
          />
        </div>
      </div>
    </div>
  );
};

export default TradeDetails;