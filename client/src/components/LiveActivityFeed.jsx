import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService';
import { formatDistanceToNow } from 'date-fns';

// Accept props to allow customization from different usage contexts
const LiveActivityFeed = (props) => {
  // If props.isControlled is true, then the parent component controls the visibility
  const isControlled = props.isOpen !== undefined && props.onToggle !== undefined;
  
  // Use either controlled or internal state based on props
  const [activities, setActivities] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState(null);
  const [debug, setDebug] = useState({});
  const feedRef = useRef(null);
  const dropdownRef = useRef(null);
  const maxActivitiesShown = 5;
  
  // Use the rendered attribute to track if this component is duplicated
  const [isAlreadyMounted, setIsAlreadyMounted] = useState(false);

  // Check if another instance of LiveActivityFeed is already rendered
  useEffect(() => {
    // Use a global window variable to track instances
    if (window.__liveActivityFeedMounted) {
      setIsAlreadyMounted(true);
      
      // If this component is in App.jsx (global), don't render it if a marketplace specific one exists
      if (!isControlled) {
        console.log('[LiveActivityFeed] Another instance is already mounted, not rendering global instance');
        return; // Don't render anything else from this component
      }
    } else {
      window.__liveActivityFeedMounted = true;
      console.log('[LiveActivityFeed] First instance mounted');
    }

    return () => {
      // Cleanup when unmounting
      if (!isAlreadyMounted) {
        window.__liveActivityFeedMounted = false;
        console.log('[LiveActivityFeed] Instance unmounted');
      }
    };
  }, [isControlled, isAlreadyMounted]);

  // Connect to socket if not already connected
  useEffect(() => {
    // Don't initialize if this is a duplicate uncontrolled instance
    if (isAlreadyMounted && !isControlled) return;
    
    console.log('[LiveActivityFeed] Component mounted');
    
    // Always try to connect when component mounts
    socketService.connect();

    const onConnect = () => {
      console.log('[LiveActivityFeed] Socket connected successfully');
      setIsConnected(true);
      setDebug(prev => ({ ...prev, lastConnected: new Date() }));
    };

    const onDisconnect = () => {
      console.log('[LiveActivityFeed] Socket disconnected');
      setIsConnected(false);
      setDebug(prev => ({ ...prev, lastDisconnected: new Date() }));
    };

    socketService.onConnected(onConnect);
    socketService.onDisconnected(onDisconnect);
    
    // Check initial connection state
    const connected = socketService.isConnected();
    setIsConnected(connected);
    setDebug(prev => ({ 
      ...prev, 
      initialConnectionState: connected ? 'connected' : 'disconnected',
      componentMounted: new Date()
    }));

    return () => {
      // Don't cleanup if this is a duplicate uncontrolled instance
      if (isAlreadyMounted && !isControlled) return;
      
      console.log('[LiveActivityFeed] Cleaning up connection listeners');
      socketService.onConnected(null);
      socketService.onDisconnected(null);
    };
  }, [isAlreadyMounted, isControlled]);

  // Listen for activity events
  useEffect(() => {
    // Don't set up listeners if this is a duplicate uncontrolled instance
    if (isAlreadyMounted && !isControlled) return;
    
    console.log('[LiveActivityFeed] Setting up activity event listeners');
    
    const handleMarketActivity = (activity) => {
      console.log('[LiveActivityFeed] Market activity received:', activity);
      setLastActivity({ type: 'market', data: activity, time: new Date() });
      setDebug(prev => ({ 
        ...prev, 
        lastMarketActivity: new Date(),
        marketActivityReceived: (prev.marketActivityReceived || 0) + 1,
        lastMarketActivityData: activity
      }));
      
      if (!activity) {
        console.warn('[LiveActivityFeed] Received null/undefined market activity');
        return;
      }
      
      try {
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
          console.log('[LiveActivityFeed] Adding new market activity. Current count:', prev.length);
          return [enhancedActivity, ...prev].slice(0, 20);
        });
      } catch (error) {
        console.error('[LiveActivityFeed] Error processing market activity:', error);
        console.error('Activity data that caused error:', activity);
        setDebug(prev => ({ 
          ...prev, 
          lastError: { time: new Date(), message: error.message, data: activity }
        }));
      }
    };

    const handleUserActivity = (activity) => {
      console.log('[LiveActivityFeed] User activity received:', activity);
      setLastActivity({ type: 'user', data: activity, time: new Date() });
      setDebug(prev => ({ 
        ...prev, 
        lastUserActivity: new Date(),
        userActivityReceived: (prev.userActivityReceived || 0) + 1,
        lastUserActivityData: activity
      }));
      
      if (!activity) {
        console.warn('[LiveActivityFeed] Received null/undefined user activity');
        return;
      }
      
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

    // Make sure to clean existing listeners to prevent duplicates
    socketService.off('user_activity');
    socketService.off('market_activity');
    
    // Register the listeners
    socketService.on('user_activity', handleUserActivity);
    socketService.on('market_activity', handleMarketActivity);

    // Request a test activity after 2 seconds
    const timer = setTimeout(() => {
      console.log('[LiveActivityFeed] Requesting test market activity');
      socketService.emitTestActivity();
    }, 2000);

    // Add click outside listener to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // If controlled by parent, call the toggle function
        if (isControlled) {
          if (props.isOpen) {
            props.onToggle();
          }
        } else {
          setVisible(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Add reconnection logic
    const reconnectInterval = setInterval(() => {
      if (!socketService.isConnected()) {
        console.log('[LiveActivityFeed] Attempting reconnection...');
        socketService.connect();
      }
    }, 10000); // Try reconnecting every 10 seconds if disconnected

    return () => {
      // Don't clean up if this is a duplicate uncontrolled instance
      if (isAlreadyMounted && !isControlled) return;
      
      console.log('[LiveActivityFeed] Cleaning up event listeners');
      socketService.off('user_activity', handleUserActivity);
      socketService.off('market_activity', handleMarketActivity);
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
      clearInterval(reconnectInterval);
    };
  }, [isAlreadyMounted, isControlled, props]);

  // Debug button to request test activities
  const requestTestActivity = () => {
    console.log('[LiveActivityFeed] Manually requesting test activity');
    socketService.emitTestActivity();
    setDebug(prev => ({ ...prev, manualTestRequested: new Date() }));
  };

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
  };

  const closeActivityDetails = () => {
    setSelectedActivity(null);
  };

  const toggleVisibility = () => {
    // If controlled by parent, call the toggle function
    if (isControlled) {
      props.onToggle();
    } else {
      setVisible(!visible);
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
      case 'sale':  
        return '#8b5cf6'; // purple
      case 'offer':
        return '#fbbf24'; // yellow
      default:
        return '#9ca3af'; // gray
    }
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const reconnectSocket = () => {
    console.log('[LiveActivityFeed] Manual reconnection requested');
    socketService.disconnect();
    setTimeout(() => {
      socketService.connect();
    }, 500);
    setDebug(prev => ({ ...prev, manualReconnectRequested: new Date() }));
  };
  
  // Don't render if this is a duplicate uncontrolled instance
  if (isAlreadyMounted && !isControlled) {
    return null;
  }
  
  // Get actual visibility state based on whether the component is controlled or not
  const isVisible = isControlled ? props.isOpen : visible;

  return (
    <>
      {/* Live Feed Container */}
      <div 
        ref={dropdownRef}
        className="live-feed-container"
        style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end'
        }}
      >
        {/* Live Feed Button */}
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
              backgroundColor: isConnected ? '#4ade80' : '#f87171', // Green if connected, red if disconnected
              display: 'inline-block',
              marginRight: '8px'
            }}
          ></span>
          Live Feed
          <span style={{ 
            marginLeft: '6px',
            transform: isVisible ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}>
            ▼
          </span>
        </button>
        
        {/* Debug buttons in dev mode */}
        {process.env.NODE_ENV !== 'production' && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            marginTop: '4px', 
            gap: '4px' 
          }}>
            <button 
              onClick={requestTestActivity}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: '#374151',
                color: '#e2e8f0',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Test Activity
            </button>
            
            <button 
              onClick={reconnectSocket}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: '#374151',
                color: '#e2e8f0',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reconnect
            </button>
          </div>
        )}
        
        {/* Connection status debug info */}
        {process.env.NODE_ENV !== 'production' && (
          <div style={{ 
            marginTop: '4px', 
            fontSize: '10px',
            color: '#e2e8f0',
            backgroundColor: 'rgba(31, 41, 55, 0.8)',
            padding: '4px',
            borderRadius: '4px',
            maxWidth: '200px'
          }}>
            <div>Socket: {isConnected ? 'Connected' : 'Disconnected'}</div>
            <div>Activities: {activities.length}</div>
            {lastActivity && (
              <div>
                Last: {lastActivity.type} ({Math.round((Date.now() - lastActivity.time) / 1000)}s ago)
              </div>
            )}
            <div>
              Market: {debug.marketActivityReceived || 0} / User: {debug.userActivityReceived || 0}
            </div>
          </div>
        )}
      </div>

      {/* Live Feed Dropdown Content */}
      <div 
        className="live-feed-dropdown-content"
        style={{
          position: 'fixed',
          top: '80px',
          left: '0',
          right: '0',
          width: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(5px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          maxHeight: isVisible ? '400px' : '0px',
          opacity: isVisible ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.3s ease',
          borderBottom: isVisible ? '1px solid rgba(59, 130, 246, 0.2)' : 'none',
          zIndex: 29
        }}
      >
        <div 
          className="live-feed-content"
          ref={feedRef}
          style={{
            padding: '16px',
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <h3 style={{ 
            fontSize: '16px', 
            color: '#e2e8f0', 
            marginBottom: '12px',
            textAlign: 'center' 
          }}>
            Recent Activities
          </h3>
          
          {activities.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#94a3b8', 
              padding: '16px',
              fontSize: '14px'
            }}>
              No recent activities to display. 
              {!isConnected && (
                <div style={{ marginTop: '8px', color: '#f87171' }}>
                  Socket disconnected. Reconnecting...
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
              width: '100%'
            }}>
              {activities.slice(0, maxActivitiesShown).map((activity, index) => (
                <div
                  key={activity.id || index}
                  onClick={() => handleActivityClick(activity)}
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    borderRadius: '8px',
                    padding: '12px',
                    borderLeft: `3px solid ${getActivityColor(activity.type)}`,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    animation: 'fadeIn 0.5s',
                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '8px',
                    gap: '8px'
                  }}>
                    <img 
                      src={activity.user?.avatar || '/default-avatar.png'} 
                      alt="User" 
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%',
                        objectFit: 'cover' 
                      }}
                    />
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: 'bold',
                      color: '#e2e8f0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '120px'
                    }}>
                      {activity.user?.name || 'User'}
                    </span>
                  </div>
                
                  <div style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    marginBottom: '8px'
                  }}>
                    {activity.type === 'listing' ? 'Listed' : 
                     activity.type === 'purchase' ? 'Purchased' : 
                     activity.type === 'offer' ? 'Made an offer for' : 
                     'Activity'}
                  </div>
                  
                  {activity.item && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '8px',
                      gap: '8px'
                    }}>
                      <img 
                        src={activity.item.image || '/default-item.png'} 
                        alt="Item" 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '4px',
                          objectFit: 'cover',
                          background: 'rgba(15, 23, 42, 0.5)'
                        }}
                      />
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 'bold',
                          color: '#e2e8f0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '150px'
                        }}>
                          {activity.item.name || 'Item'}
                        </span>
                        {activity.price > 0 && (
                          <span style={{ 
                            fontSize: '11px', 
                            color: '#10b981',
                            fontWeight: 'bold'
                          }}>
                            {formatPrice(activity.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#64748b',
                    marginTop: 'auto'
                  }}>
                    {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : 'Just now'}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activities.length > maxActivitiesShown && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '12px'
            }}>
              <button style={{
                fontSize: '12px',
                color: '#3b82f6',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                outline: 'none'
              }}>
                View all activities
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            position: 'relative'
          }}>
            <button 
              onClick={closeActivityDetails}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
            
            <h3 style={{
              color: '#e2e8f0',
              marginBottom: '16px',
              borderBottom: '1px solid #334155',
              paddingBottom: '10px'
            }}>
              Activity Details
            </h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <img 
                  src={selectedActivity.user?.avatar || '/default-avatar.png'}
                  alt="User"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#e2e8f0'
                  }}>
                    {selectedActivity.user?.name || 'User'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#94a3b8'
                  }}>
                    {selectedActivity.timestamp ? 
                      new Date(selectedActivity.timestamp).toLocaleString() : 
                      'Just now'}
                  </div>
                </div>
              </div>
              
              {selectedActivity.item && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '8px'
                }}>
                  <img 
                    src={selectedActivity.item.image || '/default-item.png'}
                    alt="Item"
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '4px',
                      objectFit: 'cover',
                      background: 'rgba(15, 23, 42, 0.5)'
                    }}
                  />
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#e2e8f0'
                    }}>
                      {selectedActivity.item.name || 'Item'}
                    </div>
                    {selectedActivity.price > 0 && (
                      <div style={{
                        fontSize: '14px',
                        color: '#10b981',
                        fontWeight: 'bold'
                      }}>
                        {formatPrice(selectedActivity.price)}
                      </div>
                    )}
                    <div style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                      marginTop: '4px'
                    }}>
                      {selectedActivity.type === 'listing' ? 'Listed for sale' : 
                       selectedActivity.type === 'purchase' ? 'Purchased' : 
                       selectedActivity.type === 'offer' ? 'Offer made' : 
                       'Activity'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveActivityFeed; 