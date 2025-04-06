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
  const maxActivitiesShown = 5; // Number of activities visible in the feed

  useEffect(() => {
    const handleUserActivity = (activity) => {
      if (!activity) return;
      
      const enhancedActivity = {
        ...activity,
        timestamp: activity.timestamp || new Date().toISOString(),
        id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
      
      setActivities(prev => [enhancedActivity, ...prev].slice(0, 50));
    };

    const handleMarketActivity = (activity) => {
      if (!activity) return;
      
      const enhancedActivity = {
        ...activity,
        timestamp: activity.timestamp || new Date().toISOString(),
        id: `market-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
      
      setActivities(prev => [enhancedActivity, ...prev].slice(0, 50));
    };

    // Sample data for development - remove in production
    const sampleActivities = [
      {
        id: 'sample-1',
        type: 'listing',
        user: {
          name: 'JohnDoe',
          avatar: 'https://avatars.steamstatic.com/b5bd56c1aa4d05210e5726a63f9432965e9f3240_full.jpg'
        },
        item: {
          name: 'AWP | Dragon Lore (Factory New)',
          image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17P7NdShB49CmhZODqPrxN7LEmyUJ7JUmi7mToI6m0Qzj_hJpY2CncoKQcVRoN1mFrle3k-_t0Je4vsvJzyd8pGB8shyytnIw'
        },
        price: 1249.99,
        message: 'JohnDoe listed AWP | Dragon Lore for $1,249.99',
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString() // 2 minutes ago
      },
      {
        id: 'sample-2',
        type: 'purchase',
        user: {
          name: 'SteamTrader',
          avatar: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
        },
        seller: {
          name: 'Pixel8',
          avatar: 'https://avatars.steamstatic.com/b5bd56c1aa4d05210e5726a63f9432965e9f3240_full.jpg'
        },
        item: {
          name: 'Butterfly Knife | Fade (Factory New)',
          image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4GGqPP7I6vdk3lu-M1wmeyQyoD8j1yg5RVtMmzyJoPHdAU3YVuD8lW7k-bogJG87snNnyRjuHJz53_D30vgPi-G8xQ'
        },
        price: 879.95,
        message: 'SteamTrader purchased Butterfly Knife | Fade from Pixel8 for $879.95',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
      },
      {
        id: 'sample-3',
        type: 'listing',
        user: {
          name: 'CSGOLover',
          avatar: 'https://avatars.steamstatic.com/3272e27b4006068c095a6b7f5c636b5a67b1013b_full.jpg'
        },
        item: {
          name: 'AK-47 | Fire Serpent (Minimal Wear)',
          image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV086jloKOhcj8NrrHj1Rd6dd2j6eUrI2t2wK3rkptMW73coDGdQA9N1HT-gO_xOjn15Hv6Z2ay3JquiZ0-z-DyAJbcvlJ'
        },
        price: 425.50,
        message: 'CSGOLover listed AK-47 | Fire Serpent for $425.50',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 minutes ago
      }
    ];

    setActivities(sampleActivities);

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
        return 'rgba(74, 222, 128, 0.8)'; // green
      case 'logout':
        return 'rgba(248, 113, 113, 0.8)'; // red
      case 'listing':
        return 'rgba(59, 130, 246, 0.8)'; // blue
      case 'purchase':
        return 'rgba(139, 92, 246, 0.8)'; // purple
      case 'offer':
        return 'rgba(251, 191, 36, 0.8)'; // yellow
      default:
        return 'rgba(156, 163, 175, 0.8)'; // gray
    }
  };

  return (
    <div 
      className="live-feed-container"
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderBottom: '1px solid rgba(49, 62, 80, 0.5)',
        height: visible ? '60px' : '30px',
        overflow: 'hidden',
        transition: 'height 0.3s ease',
        zIndex: 40
      }}
    >
      <div 
        className="live-feed-toggle"
        onClick={toggleVisibility}
        style={{
          position: 'absolute',
          right: '20px',
          bottom: '0px',
          padding: '2px 10px',
          fontSize: '12px',
          backgroundColor: 'rgba(51, 115, 242, 0.2)',
          color: '#e2e8f0',
          cursor: 'pointer',
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
          border: '1px solid rgba(49, 62, 80, 0.5)',
          borderBottom: 'none',
          zIndex: 42
        }}
      >
        {visible ? 'Hide' : 'Show'} Live Feed
      </div>

      <div 
        className="live-feed-title"
        style={{
          position: 'absolute',
          left: '20px',
          top: '0',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          color: '#e2e8f0',
          fontWeight: 'bold',
          fontSize: '14px',
          zIndex: 41
        }}
      >
        <span 
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#4ade80',
            display: 'inline-block',
            marginRight: '8px',
            animation: 'pulse 1.5s infinite'
          }}
        ></span>
        LIVE ACTIVITY
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `}
      </style>

      <div 
        className="live-feed-content"
        ref={feedRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '60px',
          width: '100%',
          overflowX: 'hidden',
          padding: '0 20px',
          position: 'relative',
          paddingTop: '30px'
        }}
      >
        <AnimatePresence mode="popLayout">
          {visible && activities.slice(0, maxActivitiesShown).map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 30, 
                duration: 0.5,
                delay: index * 0.1
              }}
              onClick={() => handleActivityClick(activity)}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '40px',
                backgroundColor: 'rgba(31, 43, 69, 0.6)',
                margin: '0 10px',
                padding: '5px 15px',
                borderRadius: '20px',
                border: `1px solid ${getActivityColor(activity.type)}`,
                cursor: 'pointer',
                minWidth: '280px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0
              }}
            >
              <div className="avatar"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  marginRight: '10px',
                  flexShrink: 0
                }}
              >
                <img 
                  src={activity.user?.avatar || 'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98m2pxUyzFu-wp_MuW0ZzZ1TQzbPqdfUPw5-wn_ADQz59Jna9QD9L5-cA-G4YDGMe18MtAaHJHUDP6OYA3640w0iKlfKsKIp3vt3SjsZxJbURm05Hh0n_jHGtzx4YZs/96fx96f'}
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
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '12px', marginRight: '8px' }}>
                    <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{activity.user?.name || 'User'}</span> listed
                  </div>
                  <div 
                    className="item-image"
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginRight: '6px',
                      flexShrink: 0
                    }}
                  >
                    <img 
                      src={activity.item?.image || 'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98m2pxUyzFu-wp_MuW0ZzZ1TQzbPqdfUPw5-wn_ADQz59Jna9QD9L5-cA-G4YDGMe18MtAaHJHUDP6OYA3640w0iKlfKsKIp3vt3SjsZxJbURm05Hh0n_jHGtzx4YZs/96fx96f'}
                      alt={activity.item?.name || 'Item'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '12px', fontWeight: 'bold', marginRight: '8px' }}>
                    <span title={activity.item?.name}>{(activity.item?.name || 'Item').length > 15 ? (activity.item?.name || 'Item').substring(0, 15) + '...' : (activity.item?.name || 'Item')}</span>
                  </div>
                  <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '12px', flexShrink: 0 }}>
                    ${activity.price?.toFixed(2) || '0.00'}
                  </div>
                </div>
              )}

              {activity.type === 'purchase' && (
                <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflow: 'hidden' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '12px', marginRight: '8px' }}>
                    <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{activity.user?.name || 'User'}</span> bought
                  </div>
                  <div 
                    className="item-image"
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginRight: '6px',
                      flexShrink: 0
                    }}
                  >
                    <img 
                      src={activity.item?.image || 'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98m2pxUyzFu-wp_MuW0ZzZ1TQzbPqdfUPw5-wn_ADQz59Jna9QD9L5-cA-G4YDGMe18MtAaHJHUDP6OYA3640w0iKlfKsKIp3vt3SjsZxJbURm05Hh0n_jHGtzx4YZs/96fx96f'}
                      alt={activity.item?.name || 'Item'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0', fontSize: '12px', marginRight: '4px' }}>
                    from <span style={{ color: '#fb923c', fontWeight: 'bold' }}>{activity.seller?.name || 'Seller'}</span>
                  </div>
                  <div style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '12px', flexShrink: 0 }}>
                    ${activity.price?.toFixed(2) || '0.00'}
                  </div>
                </div>
              )}

              <div 
                className="timestamp"
                style={{
                  color: '#94a3b8',
                  fontSize: '10px',
                  marginLeft: '10px',
                  flexShrink: 0
                }}
              >
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showSidePanel && selectedActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 50,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={handleCloseSidePanel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              style={{
                width: '500px',
                backgroundColor: 'rgba(31, 43, 69, 0.95)',
                borderRadius: '16px',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Activity detail header */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px' 
                }}>
                  <span style={{ 
                    color: getActivityColor(selectedActivity.type),
                    fontSize: '24px'
                  }}>
                    {getActivityIcon(selectedActivity.type)}
                  </span>
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
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '5px'
                  }}
                >
                  ×
                </button>
              </div>
              
              {/* Activity content */}
              <div style={{ padding: '20px' }}>
                {/* Item section */}
                {selectedActivity.item && (
                  <div style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
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
                      alignItems: 'center'
                    }}>
                      <img 
                        src={selectedActivity.item.image} 
                        alt={selectedActivity.item.name}
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
                        marginBottom: '5px' 
                      }}>
                        {selectedActivity.item.name}
                      </h4>
                      {selectedActivity.price && (
                        <div style={{ 
                          color: '#4ade80', 
                          fontWeight: '700', 
                          fontSize: '18px' 
                        }}>
                          ${selectedActivity.price.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Users involved */}
                <div style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <h4 style={{ 
                    color: '#94a3b8', 
                    fontWeight: '600', 
                    fontSize: '14px', 
                    marginBottom: '15px',
                    textTransform: 'uppercase'
                  }}>
                    {selectedActivity.type === 'purchase' ? 'Transaction Details' : 'User Details'}
                  </h4>
                  
                  {/* User/buyer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: selectedActivity.type === 'purchase' ? '15px' : '0',
                    backgroundColor: 'rgba(31, 43, 69, 0.4)',
                    padding: '10px',
                    borderRadius: '8px',
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      marginRight: '10px'
                    }}>
                      <img 
                        src={selectedActivity.user?.avatar} 
                        alt={selectedActivity.user?.name}
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
                        fontSize: '14px' 
                      }}>
                        {selectedActivity.user?.name}
                      </div>
                      <div style={{ 
                        color: '#94a3b8', 
                        fontSize: '12px' 
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
                      padding: '10px',
                      borderRadius: '8px',
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        marginRight: '10px'
                      }}>
                        <img 
                          src={selectedActivity.seller.avatar} 
                          alt={selectedActivity.seller.name}
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
                          fontSize: '14px' 
                        }}>
                          {selectedActivity.seller.name}
                        </div>
                        <div style={{ 
                          color: '#94a3b8', 
                          fontSize: '12px' 
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {new Date(selectedActivity.timestamp).toLocaleString()} ({formatDistanceToNow(new Date(selectedActivity.timestamp), { addSuffix: true })})
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveActivityFeed; 