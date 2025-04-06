import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import socketService from '../services/socketService';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const LiveActivityFeed = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [visible, setVisible] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const feedRef = useRef(null);
  const maxActivitiesShown = 4; // Reduced number for better fit

  useEffect(() => {
    const handleUserActivity = (activity) => {
      if (!activity) return;
      
      const enhancedActivity = {
        ...activity,
        timestamp: activity.timestamp || new Date().toISOString(),
        id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
      
      setActivities(prev => [enhancedActivity, ...prev].slice(0, 20));
    };

    const handleMarketActivity = (activity) => {
      if (!activity) return;
      
      const enhancedActivity = {
        ...activity,
        timestamp: activity.timestamp || new Date().toISOString(),
        id: `market-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
      
      setActivities(prev => [enhancedActivity, ...prev].slice(0, 20));
    };

    // Clear any existing listeners to prevent duplicates
    socketService.off('user_activity');
    socketService.off('market_activity');
    
    // Register the listeners
    socketService.on('user_activity', handleUserActivity);
    socketService.on('market_activity', handleMarketActivity);

    return () => {
      socketService.off('user_activity', handleUserActivity);
      socketService.off('market_activity', handleMarketActivity);
    };
  }, []);

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
    setShowSidePanel(true);
  };

  const handleCloseSidePanel = () => {
    setShowSidePanel(false);
    setSelectedActivity(null);
  };

  const toggleVisibility = () => {
    setVisible(!visible);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'join':
        return '👋';
      case 'logout':
        return '👋';
      case 'listing':
        return '📝';
      case 'purchase':
        return '💰';
      case 'offer':
        return '🤝';
      default:
        return '📢';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'join':
        return '#4ade80'; // green
      case 'logout':
        return '#f87171'; // red
      case 'listing':
        return '#3b82f6'; // blue
      case 'purchase':
        return '#8b5cf6'; // purple
      case 'offer':
        return '#fbbf24'; // yellow
      default:
        return '#9ca3af'; // gray
    }
  };

  // Only render if there are activities
  if (activities.length === 0) return null;

  return (
    <>
      <div 
        className="live-feed-container"
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(49, 62, 80, 0.5)',
          height: visible ? '40px' : '25px',
          overflow: 'hidden',
          transition: 'height 0.2s ease',
          zIndex: 40
        }}
      >
        <div 
          className="live-feed-toggle"
          onClick={toggleVisibility}
          style={{
            position: 'absolute',
            right: '10px',
            top: '0px',
            padding: '2px 8px',
            fontSize: '12px',
            color: '#e2e8f0',
            cursor: 'pointer',
            zIndex: 42
          }}
        >
          {visible ? 'Hide' : 'Show'}
        </div>

        <div 
          className="live-feed-title"
          style={{
            position: 'absolute',
            left: '10px',
            top: '0',
            height: '25px',
            display: 'flex',
            alignItems: 'center',
            color: '#e2e8f0',
            fontWeight: 'bold',
            fontSize: '12px',
            zIndex: 41
          }}
        >
          <span 
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#4ade80',
              display: 'inline-block',
              marginRight: '6px'
            }}
          ></span>
          LIVE
        </div>

        {visible && (
          <div 
            className="live-feed-content"
            ref={feedRef}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '40px',
              width: '100%',
              overflowX: 'hidden',
              paddingLeft: '70px',
              paddingRight: '60px',
              position: 'relative',
              whiteSpace: 'nowrap'
            }}
          >
            {activities.slice(0, maxActivitiesShown).map((activity) => (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '28px',
                  backgroundColor: 'rgba(31, 43, 69, 0.5)',
                  margin: '0 8px',
                  padding: '0 10px',
                  borderRadius: '14px',
                  borderLeft: `2px solid ${getActivityColor(activity.type)}`,
                  cursor: 'pointer',
                  maxWidth: '250px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 0
                }}
              >
                <div 
                  className="avatar"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginRight: '8px',
                    flexShrink: 0
                  }}
                >
                  <img 
                    src={activity.user?.avatar || '/default-avatar.png'}
                    alt={activity.user?.name || 'User'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>

                {activity.type === 'listing' && (
                  <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflow: 'hidden' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '11px', marginRight: '4px' }}>
                      <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{activity.user?.name || 'User'}</span>
                    </div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '11px', marginRight: '4px' }}>
                      listed
                    </div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold', marginRight: '4px' }}>
                      <span title={activity.item?.name}>{(activity.item?.name || 'Item').length > 10 ? (activity.item?.name || 'Item').substring(0, 10) + '...' : (activity.item?.name || 'Item')}</span>
                    </div>
                    <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>
                      ${activity.price?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                )}

                {activity.type === 'purchase' && (
                  <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflow: 'hidden' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '11px', marginRight: '4px' }}>
                      <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{activity.user?.name || 'User'}</span>
                    </div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '11px', marginRight: '4px' }}>
                      bought
                    </div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '11px', fontWeight: 'bold', marginRight: '4px' }}>
                      <span title={activity.item?.name}>{(activity.item?.name || 'Item').length > 10 ? (activity.item?.name || 'Item').substring(0, 10) + '...' : (activity.item?.name || 'Item')}</span>
                    </div>
                  </div>
                )}

                <div 
                  className="timestamp"
                  style={{
                    color: '#94a3b8',
                    fontSize: '9px',
                    marginLeft: '6px',
                    flexShrink: 0
                  }}
                >
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedActivity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onClick={handleCloseSidePanel}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '450px',
              backgroundColor: 'rgba(31, 43, 69, 0.95)',
              borderRadius: '12px',
              boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '15px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#ffffff'
              }}>
                {selectedActivity.type === 'listing' ? 'Item Listed' : 
                 selectedActivity.type === 'purchase' ? 'Item Purchased' : 
                 'Activity Details'}
              </h3>
              <button
                onClick={handleCloseSidePanel}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '15px' }}>
              {selectedActivity.item && (
                <div style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <img 
                      src={selectedActivity.item.image || '/default-item.png'} 
                      alt={selectedActivity.item.name || 'Item'}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                  <div>
                    <h4 style={{ 
                      color: '#ffffff', 
                      fontWeight: '600', 
                      fontSize: '14px', 
                      marginBottom: '4px' 
                    }}>
                      {selectedActivity.item.name || 'Unknown Item'}
                    </h4>
                    {selectedActivity.price && (
                      <div style={{ 
                        color: '#4ade80', 
                        fontWeight: '700', 
                        fontSize: '16px' 
                      }}>
                        ${selectedActivity.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <h4 style={{ 
                  color: '#94a3b8', 
                  fontWeight: '600', 
                  fontSize: '12px', 
                  marginBottom: '10px',
                  textTransform: 'uppercase'
                }}>
                  {selectedActivity.type === 'purchase' ? 'Transaction Details' : 'User Details'}
                </h4>
                
                {/* User/buyer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: selectedActivity.type === 'purchase' ? '8px' : '0',
                  backgroundColor: 'rgba(31, 43, 69, 0.4)',
                  padding: '8px',
                  borderRadius: '6px',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginRight: '8px'
                  }}>
                    <img 
                      src={selectedActivity.user?.avatar || '/default-avatar.png'} 
                      alt={selectedActivity.user?.name || 'User'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ 
                      color: '#ffffff', 
                      fontWeight: '600', 
                      fontSize: '13px' 
                    }}>
                      {selectedActivity.user?.name || 'Unknown User'}
                    </div>
                    <div style={{ 
                      color: '#94a3b8', 
                      fontSize: '11px' 
                    }}>
                      {selectedActivity.type === 'listing' ? 'Seller' : 'Buyer'}
                    </div>
                  </div>
                </div>
                
                {/* Seller (for purchase) */}
                {selectedActivity.type === 'purchase' && selectedActivity.seller && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(31, 43, 69, 0.4)',
                    padding: '8px',
                    borderRadius: '6px',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      marginRight: '8px'
                    }}>
                      <img 
                        src={selectedActivity.seller.avatar || '/default-avatar.png'} 
                        alt={selectedActivity.seller.name || 'Seller'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ 
                        color: '#ffffff', 
                        fontWeight: '600', 
                        fontSize: '13px' 
                      }}>
                        {selectedActivity.seller.name || 'Unknown Seller'}
                      </div>
                      <div style={{ 
                        color: '#94a3b8', 
                        fontSize: '11px' 
                      }}>
                        Seller
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Timestamp */}
              <div style={{ 
                color: '#94a3b8', 
                fontSize: '12px',
                textAlign: 'center'
              }}>
                {new Date(selectedActivity.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveActivityFeed; 