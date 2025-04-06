import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

// Add the CSS at the beginning of the file
const styles = `
  .live-activity-feed-container {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  
  .activity-feed-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: rgba(31, 43, 69, 0.95);
    color: #e2e8f0;
    border: 1px solid rgba(59, 130, 246, 0.5);
    border-radius: 8px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }
  
  .activity-feed-button:hover {
    background-color: rgba(51, 65, 85, 0.95);
    border-color: rgba(59, 130, 246, 0.8);
  }
  
  .activity-feed-button.active {
    background-color: rgba(51, 65, 85, 0.95);
    border-color: rgba(59, 130, 246, 0.8);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  .connection-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }
  
  .connection-dot.connected {
    background-color: #4ade80;
  }
  
  .connection-dot.disconnected {
    background-color: #f87171;
  }
  
  .activity-feed-dropdown {
    position: absolute;
    top: 45px;
    right: 0;
    width: 320px;
    background-color: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 1px solid rgba(59, 130, 246, 0.2);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }
  
  .feed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .feed-header h3 {
    margin: 0;
    font-size: 16px;
    color: #e2e8f0;
  }
  
  .feed-header .test-activity-btn,
  .feed-header .close-button {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .feed-header .test-activity-btn:hover,
  .feed-header .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
  }
  
  .close-button {
    font-size: 18px;
  }
  
  .activity-list {
    max-height: 350px;
    overflow-y: auto;
    padding: 8px;
  }
  
  .no-activities {
    text-align: center;
    color: #94a3b8;
    padding: 24px 16px;
  }
  
  .no-activities p {
    margin: 0 0 8px 0;
    font-size: 14px;
  }
  
  .no-activities small {
    font-size: 12px;
    opacity: 0.7;
  }
  
  .activity-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background-color: rgba(30, 41, 59, 0.7);
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .activity-item:hover {
    background-color: rgba(30, 41, 59, 0.9);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  .activity-avatar img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .activity-content {
    flex: 1;
    min-width: 0;
  }
  
  .activity-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
  }
  
  .activity-user {
    font-size: 12px;
    font-weight: bold;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }
  
  .activity-time {
    font-size: 11px;
    color: #94a3b8;
  }
  
  .activity-details {
    font-size: 12px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .activity-type {
    font-weight: 500;
  }
  
  .activity-price {
    color: #4ade80;
    font-weight: 500;
  }
  
  .activity-item-image img {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    object-fit: contain;
    background-color: rgba(15, 23, 42, 0.5);
  }
  
  .connection-status {
    padding: 10px 16px;
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .connection-status .connected {
    color: #4ade80;
  }
  
  .connection-status .disconnected {
    color: #f87171;
    cursor: pointer;
    text-decoration: underline;
  }
  
  .activity-detail-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1010;
  }
  
  .activity-detail-content {
    background-color: rgba(21, 28, 43, 0.95);
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(59, 130, 246, 0.3);
    position: relative;
  }
  
  .activity-detail-content h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    color: #e2e8f0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 10px;
  }
  
  .activity-detail-content .close-button {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 24px;
    cursor: pointer;
    transition: color 0.2s ease;
  }
  
  .activity-detail-content .close-button:hover {
    color: #e2e8f0;
  }
  
  .detail-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
  }
  
  .detail-label {
    font-size: 14px;
    color: #94a3b8;
  }
  
  .detail-value {
    font-size: 14px;
    color: #e2e8f0;
    font-weight: 500;
    text-align: right;
  }
`;

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
  
  // Get actual visibility state based on whether the component is controlled or not
  const isVisible = isControlled ? props.isOpen : visible;

  return (
    !isAlreadyMounted || isControlled ? (
      <>
        {/* Add the styles to the DOM */}
        <style>{styles}</style>
        
        <div className="live-activity-feed-container" ref={feedRef}>
          <button 
            className={`activity-feed-button ${isVisible ? 'active' : ''}`}
            onClick={toggleVisibility}
            aria-label="Toggle activity feed"
            title="View recent activities"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
            <span className="label">Activities</span>
            {isConnected && (
              <span className="connection-dot connected" title="Connected to real-time updates"></span>
            )}
            {!isConnected && (
              <span className="connection-dot disconnected" title="Disconnected - click to reconnect" onClick={reconnectSocket}></span>
            )}
          </button>
          
          <AnimatePresence>
            {isVisible && (
              <motion.div 
                className="activity-feed-dropdown"
                ref={dropdownRef}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="feed-header">
                  <h3>Recent Activities</h3>
                  <button onClick={requestTestActivity} className="test-activity-btn" title="Generate test activity">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 0 1-9 9"></path>
                      <path d="M3 12a9 9 0 0 1 9-9"></path>
                      <path d="M21 12a9 9 0 0 0-9 9"></path>
                      <path d="M3 12a9 9 0 0 0 9-9"></path>
                    </svg>
                  </button>
                  <button className="close-button" onClick={toggleVisibility}>×</button>
                </div>
                
                <div className="activity-list">
                  {activities.length === 0 ? (
                    <div className="no-activities">
                      <p>No recent activities to display</p>
                      <small>New marketplace activities will appear here</small>
                    </div>
                  ) : (
                    activities.slice(0, maxActivitiesShown).map((activity, index) => (
                      <motion.div 
                        key={activity.id || index}
                        className="activity-item"
                        onClick={() => handleActivityClick(activity)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.3,
                          delay: index * 0.05
                        }}
                      >
                        <div className="activity-avatar">
                          <img 
                            src={activity.user?.avatar || '/default-avatar.png'} 
                            alt="" 
                            onError={(e) => {
                              e.target.src = '/default-avatar.png';
                            }}
                          />
                        </div>
                        <div className="activity-content">
                          <div className="activity-top">
                            <span className="activity-user">{activity.user?.name || 'User'}</span>
                            <span className="activity-time">
                              {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="activity-details">
                            <span 
                              className="activity-type"
                              style={{ color: getActivityColor(activity.type) }}
                            >
                              {activity.type === 'listing' ? 'listed' : 
                               activity.type === 'purchase' ? 'purchased' : 
                               activity.type === 'cancelled' ? 'cancelled' : 
                               'interacted with'}
                            </span>
                            <span className="activity-item-name">
                              {activity.item?.name || 'an item'}
                            </span>
                            {activity.price > 0 && (
                              <span className="activity-price">
                                for ${formatPrice(activity.price)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="activity-item-image">
                          <img 
                            src={activity.item?.image} 
                            alt="" 
                            onError={(e) => {
                              e.target.src = '/default-item.png';
                            }}
                          />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
                
                <div className="connection-status">
                  {isConnected ? (
                    <span className="connected">Connected to real-time updates</span>
                  ) : (
                    <span className="disconnected" onClick={reconnectSocket}>
                      Disconnected - click to reconnect
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Activity detail view */}
          <AnimatePresence>
            {selectedActivity && (
              <motion.div 
                className="activity-detail-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="activity-detail-content">
                  <button className="close-button" onClick={closeActivityDetails}>×</button>
                  <h3>Activity Details</h3>
                  {/* More detailed view of the activity here */}
                  <div className="detail-grid">
                    <div className="detail-row">
                      <span className="detail-label">User:</span>
                      <span className="detail-value">{selectedActivity.user?.name || 'Unknown'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Action:</span>
                      <span className="detail-value" style={{ color: getActivityColor(selectedActivity.type) }}>
                        {selectedActivity.type === 'listing' ? 'Listed Item' : 
                         selectedActivity.type === 'purchase' ? 'Purchased Item' : 
                         selectedActivity.type === 'cancelled' ? 'Cancelled Listing' : 
                         'Activity'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Item:</span>
                      <span className="detail-value">{selectedActivity.item?.name || 'Unknown Item'}</span>
                    </div>
                    {selectedActivity.price > 0 && (
                      <div className="detail-row">
                        <span className="detail-label">Price:</span>
                        <span className="detail-value">${formatPrice(selectedActivity.price)}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">
                        {new Date(selectedActivity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    ) : null // Render nothing if this is a duplicate uncontrolled instance
  );
};

export default LiveActivityFeed; 