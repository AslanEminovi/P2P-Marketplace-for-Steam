import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config/constants';
import OfferActionMenu from '../components/OfferActionMenu';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, offers, trades, system
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeOfferMenu, setActiveOfferMenu] = useState(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const ITEMS_PER_PAGE = 20;
  
  useEffect(() => {
    fetchNotifications();
  }, [filter, page]);
  
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = { 
        limit: ITEMS_PER_PAGE, 
        offset: page * ITEMS_PER_PAGE 
      };
      
      // Add filter if not 'all'
      if (filter === 'unread') {
        params.unreadOnly = true;
      } else if (filter !== 'all') {
        params.type = filter;
      }
      
      const response = await axios.get(`${API_URL}/user/notifications`, {
        withCredentials: true,
        params
      });
      
      setNotifications(response.data.notifications || []);
      setTotalNotifications(response.data.total || 0);
      setUnreadCount(response.data.unreadCount || 0);
      setHasMore((page + 1) * ITEMS_PER_PAGE < response.data.total);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };
  
  const markAsRead = async (notificationId) => {
    try {
      // If no ID is provided, mark all as read
      const requestData = notificationId 
        ? { notificationIds: [notificationId] } 
        : { markAll: true };
        
      await axios.put(`${API_URL}/user/notifications/read`, requestData, {
        withCredentials: true
      });
      
      // Update UI
      setNotifications(prev => 
        prev.map(notif => {
          if (!notificationId || notif._id === notificationId) {
            return { ...notif, read: true };
          }
          return notif;
        })
      );
      
      // Update unread count
      if (notificationId) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'offer':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        );
      case 'trade':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5"></path>
            <path d="M4 20 L21 3"></path>
            <path d="M21 16v5h-5"></path>
            <path d="M15 15 L3 3"></path>
          </svg>
        );
      case 'system':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        );
      case 'message':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        );
    }
  };
  
  const handleOfferAction = (notificationId, action, data) => {
    // Remove notification from the list
    setNotifications(prevNotifications => 
      prevNotifications.filter(n => n._id !== notificationId)
    );
    
    // Close offer menu
    setActiveOfferMenu(null);
    
    // Navigate to trade page if a trade was created
    if (action === 'accepted' && data?.tradeId) {
      navigate(`/trades/${data.tradeId}`);
    }
  };

  return (
    <div style={{
      padding: '30px',
      maxWidth: '1000px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{
          color: '#f1f1f1',
          margin: 0,
          fontSize: '1.75rem',
          fontWeight: '700'
        }}>Notifications</h1>
        
        {unreadCount > 0 && (
          <button
            onClick={() => markAsRead()}
            style={{
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
              color: '#4ade80',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.15)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.1)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
            Mark all as read
          </button>
        )}
      </div>
      
      {/* Filter tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '20px',
        gap: '15px',
        overflowX: 'auto',
        paddingBottom: '10px'
      }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'offer', label: 'Offers' },
          { id: 'trade', label: 'Trades' },
          { id: 'system', label: 'System' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setFilter(tab.id);
              setPage(0);
            }}
            style={{
              backgroundColor: filter === tab.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: filter === tab.id ? '#f1f1f1' : '#94a3b8',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: filter === tab.id ? '500' : 'normal',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Notifications list */}
      {loading && notifications.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 0',
          color: '#94a3b8'
        }}>
          <div 
            className="spinner"
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTop: '3px solid #4ade80',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '20px'
            }}
          />
          <p>Loading notifications...</p>
        </div>
      ) : error ? (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#f87171',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <p>{error}</p>
          <button
            onClick={fetchNotifications}
            style={{
              marginTop: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#94a3b8',
          marginTop: '20px',
          border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <h3 style={{ color: '#cbd5e1', marginBottom: '10px', fontWeight: '500' }}>
            No notifications found
          </h3>
          <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.95rem' }}>
            {filter !== 'all' 
              ? `You don't have any ${filter === 'unread' ? 'unread' : filter} notifications`
              : 'You don\'t have any notifications yet'}
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    backgroundColor: notification.read 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(74, 222, 128, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    gap: '15px',
                    position: 'relative',
                    borderLeft: notification.read 
                      ? '3px solid rgba(255, 255, 255, 0.1)' 
                      : '3px solid #4ade80',
                    cursor: notification.read ? 'default' : 'pointer'
                  }}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification._id);
                    }
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: notification.read ? '#94a3b8' : '#4ade80'
                  }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: notification.read ? '500' : '600',
                        color: notification.read ? '#cbd5e1' : '#f1f1f1'
                      }}>
                        {notification.title}
                      </h4>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{
                          color: '#9ca3af',
                          fontSize: '0.85rem'
                        }}>
                          {formatDate(notification.createdAt)}
                        </span>
                        
                        {notification.type === 'offer' && notification.relatedItemId && (
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveOfferMenu(activeOfferMenu === notification._id ? null : notification._id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#4ade80',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="19" cy="12" r="1"></circle>
                                <circle cx="5" cy="12" r="1"></circle>
                              </svg>
                            </button>
                            
                            {activeOfferMenu === notification._id && (
                              <OfferActionMenu 
                                offer={{
                                  itemId: notification.relatedItemId,
                                  offerId: notification.offerId
                                }}
                                onClose={() => {
                                  setActiveOfferMenu(null);
                                }}
                                onActionComplete={(action, data) => {
                                  handleOfferAction(notification._id, action, data);
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p style={{
                      color: notification.read ? '#94a3b8' : '#d1d5db',
                      margin: '0 0 10px 0',
                      fontSize: '0.95rem',
                      lineHeight: '1.5'
                    }}>
                      {notification.message}
                    </p>
                    
                    {notification.link && (
                      <div>
                        <Link
                          to={notification.link}
                          style={{
                            color: '#4ade80',
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: '500'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!notification.read) {
                              markAsRead(notification._id);
                            }
                          }}
                        >
                          View Details
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {/* Pagination */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '30px',
            color: '#94a3b8',
            fontSize: '0.9rem'
          }}>
            <span>
              Showing {page * ITEMS_PER_PAGE + 1} - {Math.min((page + 1) * ITEMS_PER_PAGE, totalNotifications)} of {totalNotifications}
            </span>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                disabled={page === 0}
                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                style={{
                  backgroundColor: page === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                  color: page === 0 ? '#64748b' : '#e2e8f0',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Previous
              </button>
              
              <button
                disabled={!hasMore}
                onClick={() => setPage(prev => prev + 1)}
                style={{
                  backgroundColor: !hasMore ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                  color: !hasMore ? '#64748b' : '#e2e8f0',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: !hasMore ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Notifications; 