import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService';
import { formatDistanceToNow } from 'date-fns';

const LiveActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const feedRef = useRef(null);
  const dropdownRef = useRef(null);
  const maxActivitiesShown = 5; // Show more activities

  // Connect to socket if not already connected
  useEffect(() => {
    console.log('[LiveActivityFeed] Initializing and checking socket connection');
    
    if (!socketService.isConnected()) {
      console.log('[LiveActivityFeed] Socket not connected, connecting...');
      socketService.connect();
    } else {
      console.log('[LiveActivityFeed] Socket already connected');
    }

    const onConnect = () => {
      console.log('[LiveActivityFeed] Socket connected event');
    };

    const onDisconnect = () => {
      console.log('[LiveActivityFeed] Socket disconnected event');
    };

    socketService.onConnected(onConnect);
    socketService.onDisconnected(onDisconnect);

    return () => {
      socketService.onConnected(null);
      socketService.onDisconnected(null);
    };
  }, []);

  // Listen for activity events
  useEffect(() => {
    console.log('[LiveActivityFeed] Setting up event listeners');
    
    const handleUserActivity = (activity) => {
      console.log('[LiveActivityFeed] User activity received:', activity);
      
      if (!activity) return;
      
      const enhancedActivity = {
        ...activity,
        timestamp: activity.timestamp || new Date().toISOString(),
        id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        user: {
          name: activity.user || 'User',
          avatar: activity.userAvatar || '/default-avatar.png'
        },
        item: {
          name: activity.itemName || 'Item',
          image: activity.itemImage || '/default-item.png'
        },
        price: activity.price || 0,
        type: activity.type || 'activity'
      };
      
      setActivities(prev => {
        console.log('[LiveActivityFeed] Adding new user activity to state');
        return [enhancedActivity, ...prev].slice(0, 20);
      });
    };

    const handleMarketActivity = (activity) => {
      console.log('[LiveActivityFeed] Market activity received:', activity);
      
      if (!activity) return;
      
      // Convert the server's format to our expected format
      const enhancedActivity = {
        ...activity,
        timestamp: activity.timestamp || new Date().toISOString(),
        id: `market-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        user: {
          name: typeof activity.user === 'string' ? activity.user : (activity.user?.name || 'User'),
          avatar: activity.userAvatar || activity.user?.avatar || '/default-avatar.png'
        },
        item: {
          name: activity.itemName || activity.item?.name || 'Item',
          image: activity.itemImage || activity.item?.image || '/default-item.png'
        },
        price: parseFloat(activity.price) || 0,
        type: activity.type || 'listing'
      };
      
      setActivities(prev => {
        console.log('[LiveActivityFeed] Adding new market activity to state. Current count:', prev.length);
        // Add new activity and limit to 20 recent items
        return [enhancedActivity, ...prev].slice(0, 20);
      });
    };

    // Debug broadcast a test activity after 3 seconds
    setTimeout(() => {
      console.log('[LiveActivityFeed] Broadcasting test activity');
      socketService.emit('request_test_activity', {});
    }, 3000);

    // Clear any existing listeners to prevent duplicates
    socketService.off('user_activity');
    socketService.off('market_activity');
    
    // Register the listeners
    socketService.on('user_activity', handleUserActivity);
    socketService.on('market_activity', handleMarketActivity);

    // Add click outside listener to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      console.log('[LiveActivityFeed] Cleaning up event listeners');
      socketService.off('user_activity', handleUserActivity);
      socketService.off('market_activity', handleMarketActivity);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
  };

  const closeActivityDetails = () => {
    setSelectedActivity(null);
  };

  const toggleVisibility = () => {
    setVisible(!visible);
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
      case 'sale':  
        return '#8b5cf6'; // purple
      case 'offer':
        return '#fbbf24'; // yellow
      default:
        return '#9ca3af'; // gray
    }
  };

  return (
    <>
      {/* Live Feed Container - button positioned on right side */}
      <div 
        ref={dropdownRef}
        className="live-feed-container"
        style={{
          position: 'absolute',
          top: '80px', // Increased from 72px to move it further down
          right: '20px',
          zIndex: 30, // Lower z-index than navbar (which is likely 40+)
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end'
        }}
      >
        {/* Live Feed Button - styled similar to My Listings */}
        <button 
          className="live-feed-button"
          onClick={toggleVisibility}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 16px',
            backgroundColor: 'rgba(31, 43, 69, 0.95)',
            color: '#e2e8f0',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.95)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.8)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(31, 43, 69, 0.95)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
          }}
        >
          <span 
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#4ade80',
              display: 'inline-block',
              marginRight: '8px'
            }}
          ></span>
          Live Feed
          <span style={{ 
            marginLeft: '6px',
            transform: visible ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}>
            ▼
          </span>
        </button>
      </div>

      {/* Live Feed Dropdown Content - Full width version */}
      <div 
        className="live-feed-dropdown-content"
        style={{
          position: 'fixed',
          top: '80px', // Positioned right below navbar
          left: '0',
          right: '0',
          width: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.85)', // More transparent
          backdropFilter: 'blur(5px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          maxHeight: visible ? '400px' : '0px',
          opacity: visible ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.3s ease',
          borderBottom: visible ? '1px solid rgba(59, 130, 246, 0.2)' : 'none',
          zIndex: 29 // Lower than the button
        }}
      >
        <div 
          className="live-feed-content"
          ref={feedRef}
          style={{
            padding: visible ? '15px' : '0 15px',
            maxWidth: '1200px', // Match navbar width constraint
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center',
            transition: 'padding 0.3s ease'
          }}
        >
          {activities.length > 0 ? (
            activities.slice(0, maxActivitiesShown).map((activity, index) => (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(31, 43, 69, 0.8)',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${getActivityColor(activity.type)}`,
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  marginBottom: '2px',
                  width: 'calc(100% / 3 - 12px)', // 3 per row with gap
                  minWidth: '300px',
                  maxWidth: '380px',
                  flexGrow: 1,
                  animation: `fade-in 0.5s ease-out ${index * 0.1}s backwards`
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.9)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(31, 43, 69, 0.8)';
                  e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <style>
                  {`
                    @keyframes fade-in {
                      from { opacity: 0; transform: translateY(10px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}
                </style>
                <div 
                  className="avatar"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginRight: '12px',
                    flexShrink: 0,
                    border: '2px solid rgba(255, 255, 255, 0.1)'
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

                {(activity.type === 'listing' || activity.type === 'new_listing') && (
                  <div style={{ display: 'flex', flexGrow: 1, flexWrap: 'wrap' }}>
                    <div style={{ 
                      color: '#4ade80', 
                      fontWeight: 'bold', 
                      fontSize: '14px', 
                      marginRight: '5px' 
                    }}>
                      {activity.user?.name || 'User'}
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '14px', marginRight: '5px' }}>
                      listed
                    </div>
                    <div style={{ 
                      color: '#e2e8f0', 
                      fontWeight: 'bold', 
                      fontSize: '14px',
                      marginRight: '5px'
                    }}>
                      {activity.item?.name || activity.itemName || 'Item'}
                    </div>
                    <div style={{ 
                      color: '#4ade80', 
                      fontWeight: 'bold', 
                      fontSize: '14px', 
                      marginLeft: 'auto' 
                    }}>
                      ${typeof activity.price === 'number' ? activity.price.toFixed(2) : '0.00'}
                    </div>
                  </div>
                )}

                {(activity.type === 'purchase' || activity.type === 'sale') && (
                  <div style={{ display: 'flex', flexGrow: 1, flexWrap: 'wrap' }}>
                    <div style={{ 
                      color: '#8b5cf6', 
                      fontWeight: 'bold', 
                      fontSize: '14px', 
                      marginRight: '5px' 
                    }}>
                      {activity.user?.name || 'User'}
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '14px', marginRight: '5px' }}>
                      bought
                    </div>
                    <div style={{ 
                      color: '#e2e8f0', 
                      fontWeight: 'bold', 
                      fontSize: '14px',
                      marginRight: '5px'
                    }}>
                      {activity.item?.name || activity.itemName || 'Item'}
                    </div>
                    <div style={{ 
                      color: '#e2e8f0', 
                      fontSize: '14px', 
                      marginRight: '5px' 
                    }}>
                      from
                    </div>
                    <div style={{ 
                      color: '#fb923c', 
                      fontWeight: 'bold', 
                      fontSize: '14px' 
                    }}>
                      {activity.seller?.name || 'Seller'}
                    </div>
                  </div>
                )}

                <div 
                  className="timestamp"
                  style={{
                    color: '#94a3b8',
                    fontSize: '12px',
                    marginLeft: '10px',
                    flexShrink: 0
                  }}
                >
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </div>
              </div>
            ))
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#e2e8f0',
              fontSize: '16px',
              width: '100%'
            }}>
              No recent marketplace activity
            </div>
          )}

          {activities.length > 0 && (
            <div 
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                marginTop: '10px',
                paddingTop: '10px',
                textAlign: 'center',
                width: '100%'
              }}
            >
              <button 
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#3b82f6',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: '8px 15px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.25)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                }}
              >
                View all activities
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedActivity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onClick={closeActivityDetails}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '500px',
              backgroundColor: 'rgba(31, 43, 69, 0.95)',
              borderRadius: '12px',
              boxShadow: '0 0 30px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              animation: 'scale-in 0.2s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            <style>
              {`
                @keyframes scale-in {
                  from { transform: scale(0.9); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
              `}
            </style>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.5)'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#ffffff'
              }}>
                {selectedActivity.type === 'listing' ? 'Item Listed' : 
                 selectedActivity.type === 'purchase' || selectedActivity.type === 'sale' ? 'Item Purchased' : 
                 'Activity Details'}
              </h3>
              <button
                onClick={closeActivityDetails}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '20px' }}>
              {selectedActivity.item && (
                <div style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '10px',
                  padding: '15px',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
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
                      fontSize: '16px', 
                      marginBottom: '6px' 
                    }}>
                      {selectedActivity.item.name || selectedActivity.itemName || 'Unknown Item'}
                    </h4>
                    {selectedActivity.price && (
                      <div style={{ 
                        color: '#4ade80', 
                        fontWeight: '700', 
                        fontSize: '18px' 
                      }}>
                        ${typeof selectedActivity.price === 'number' ? selectedActivity.price.toFixed(2) : '0.00'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '10px',
                padding: '15px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <h4 style={{ 
                  color: '#94a3b8', 
                  fontWeight: '600', 
                  fontSize: '14px', 
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {selectedActivity.type === 'purchase' || selectedActivity.type === 'sale' ? 'Transaction Details' : 'User Details'}
                </h4>
                
                {/* User/buyer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: (selectedActivity.type === 'purchase' || selectedActivity.type === 'sale') ? '10px' : '0',
                  backgroundColor: 'rgba(31, 43, 69, 0.6)',
                  padding: '10px 15px',
                  borderRadius: '8px',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginRight: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.1)'
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
                      fontSize: '15px' 
                    }}>
                      {selectedActivity.user?.name || 'Unknown User'}
                    </div>
                    <div style={{ 
                      color: '#94a3b8', 
                      fontSize: '13px' 
                    }}>
                      {selectedActivity.type === 'listing' ? 'Seller' : 'Buyer'}
                    </div>
                  </div>
                </div>
                
                {/* Seller (for purchase) */}
                {(selectedActivity.type === 'purchase' || selectedActivity.type === 'sale') && selectedActivity.seller && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(31, 43, 69, 0.6)',
                    padding: '10px 15px',
                    borderRadius: '8px',
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      marginRight: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.1)'
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
                        fontSize: '15px' 
                      }}>
                        {selectedActivity.seller.name || 'Unknown Seller'}
                      </div>
                      <div style={{ 
                        color: '#94a3b8', 
                        fontSize: '13px' 
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
                fontSize: '14px',
                textAlign: 'center',
                padding: '5px',
                backgroundColor: 'rgba(15, 23, 42, 0.3)',
                borderRadius: '6px'
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