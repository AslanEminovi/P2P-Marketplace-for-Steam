import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from '../utils/languageUtils';
import OfferActionMenu from './OfferActionMenu';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';

// Define notification types and their associated colors/icons
const NOTIFICATION_TYPES = {
  SUCCESS: {
    bgColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: '#4ade80',
    iconColor: '#4ade80',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    )
  },
  ERROR: {
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    iconColor: '#ef4444',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    )
  },
  INFO: {
    bgColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
    iconColor: '#38bdf8',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    )
  },
  WARNING: {
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    iconColor: '#f59e0b',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    )
  },
  TRADE: {
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8b5cf6',
    iconColor: '#8b5cf6',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.70711 15.2929C4.07714 15.9229 4.52331 17 5.41421 17H17M17 17C15.8954 17 15 17.8954 15 19C15 20.1046 15.8954 21 17 21C18.1046 21 19 20.1046 19 19C19 17.8954 18.1046 17 17 17ZM9 19C9 20.1046 8.10457 21 7 21C5.89543 21 5 20.1046 5 19C5 17.8954 5.89543 17 7 17C8.10457 17 9 17.8954 9 19Z" />
      </svg>
    )
  }
};

const NotificationCenter = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeOfferMenu, setActiveOfferMenu] = useState(null);
  const dropdownRef = useRef(null);
  const { t } = useTranslation();

  // Audio will be implemented later
  const [notificationSounds] = useState({
    success: null,
    error: null,
    info: null,
    trade: null,
  });

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set up socket listener for real-time notifications
  useEffect(() => {
    if (user) {
      // Initial fetch of notifications
      fetchNotifications();

      // Listen for new trade offers
      const handleNewTradeOffer = (data) => {
        console.log('New trade offer received:', data);
        
        if (data.sellerId === user._id || data.buyerId === user._id) {
          const newNotification = {
            _id: Date.now().toString(),
            title: data.sellerId === user._id ? 
              `New Offer on Your Item` : 
              'Your Offer Was Sent',
            message: data.sellerId === user._id ? 
              `${data.buyerName} wants to buy your ${data.itemName}` : 
              `You made an offer on ${data.sellerName}'s ${data.itemName}`,
            type: 'trade',
            link: '/trades',
            read: false,
            createdAt: new Date().toISOString(),
            relatedItemId: data.itemId,
            offerId: data.offerId
          };
          
          addNotification(
            newNotification.title,
            newNotification.message,
            newNotification.type,
            newNotification.link
          );
        }
      };

      // Listen for trade status updates
      const handleTradeStatusUpdate = (data) => {
        console.log('Trade status update received:', data);
        
        if (data.sellerId === user._id || data.buyerId === user._id) {
          let title, message;
          
          if (data.status === 'completed') {
            title = data.sellerId === user._id ? 
              'Item Sold Successfully' : 
              'Purchase Completed';
            message = data.sellerId === user._id ? 
              `Your ${data.itemName} was purchased by ${data.buyerName}` : 
              `You successfully purchased ${data.itemName} from ${data.sellerName}`;
          } else if (data.status === 'cancelled') {
            title = 'Trade Cancelled';
            message = `The trade for ${data.itemName} was cancelled`;
          }
          
          if (title && message) {
            addNotification(
              title,
              message,
              'trade',
              '/trades'
            );
          }
        }
      };

      // Register socket listeners
      socketService.on('newTradeOffer', handleNewTradeOffer);
      socketService.on('tradeStatusUpdate', handleTradeStatusUpdate);

      // Refresh notifications every minute when dropdown is open
      const interval = setInterval(() => {
        if (isOpen) {
          fetchNotifications();
        }
      }, 60000);

      return () => {
        // Clean up socket listeners and interval
        socketService.off('newTradeOffer', handleNewTradeOffer);
        socketService.off('tradeStatusUpdate', handleTradeStatusUpdate);
        clearInterval(interval);
      };
    }
  }, [user, isOpen]);

  const fetchNotifications = async () => {
    if (loading) return; // Prevent multiple concurrent requests

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/user/notifications`, {
        withCredentials: true,
        params: { limit: 10, offset: 0 }
      });

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new notification (for demo and testing)
  const addNotification = useCallback((title, message, type = 'INFO', link = null) => {
    const id = Date.now();
    const newNotification = {
      _id: id,
      title,
      message,
      type: type.toLowerCase(),
      link,
      read: false,
      createdAt: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Sound effects will be implemented later
    // Placeholder for future sound implementation

    return id;
  }, [notificationSounds]);

  const markAsRead = async (notificationId) => {
    try {
      // For API integration
      if (notificationId && typeof notificationId === 'string') {
        await axios.put(`${API_URL}/user/notifications/read`, {
          notificationIds: [notificationId],
          markAll: false
        }, {
          withCredentials: true
        });
      } else if (!notificationId) {
        await axios.put(`${API_URL}/user/notifications/read`, {
          notificationIds: null,
          markAll: true
        }, {
          withCredentials: true
        });
      }

      // Update local notification state - Fix for marking all as read
      if (notificationId) {
        setNotifications(notifications.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        // Fix to properly update all notifications to read status
        setNotifications(prevNotifications =>
          prevNotifications.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);

    // Demo notifications - will be removed in production
    if (!isOpen && notifications.length === 0) {
      setTimeout(() => {
        addNotification(
          'Welcome to CS2 Marketplace',
          'Welcome to the largest CS2 marketplace in Georgia!',
          'SUCCESS'
        );
      }, 1000);

      setTimeout(() => {
        addNotification(
          'New Trade Offer',
          'You received a new trade offer for your AWP | Asiimov',
          'TRADE',
          '/trades'
        );
      }, 3000);
    }
  };

  // Modified notification icon function to use new types
  const getNotificationIcon = (type) => {
    // Map API notification types to our defined types
    const typeMap = {
      'success': 'SUCCESS',
      'error': 'ERROR',
      'info': 'INFO',
      'warning': 'WARNING',
      'trade': 'TRADE',
      'offer': 'TRADE',
      'transaction': 'SUCCESS',
      'system': 'INFO'
    };

    const mappedType = typeMap[type] || 'INFO';
    const notificationType = NOTIFICATION_TYPES[mappedType];

    return (
      <span style={{ color: notificationType?.iconColor || '#f1f1f1' }}>
        {notificationType?.icon || NOTIFICATION_TYPES.INFO.icon}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()];
    }

    // Otherwise show the date
    return date.toLocaleDateString();
  };

  // Make this function available globally
  useEffect(() => {
    window.showNotification = addNotification;
    return () => {
      window.showNotification = undefined;
    };
  }, [addNotification]);

  // Add CSS for animations
  useEffect(() => {
    // Add the CSS to the document head
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .spinner {
        animation: spin 1s linear infinite;
      }
      @keyframes bell-ring {
        0% { transform: rotate(0); }
        10% { transform: rotate(10deg); }
        20% { transform: rotate(-10deg); }
        30% { transform: rotate(10deg); }
        40% { transform: rotate(-10deg); }
        50% { transform: rotate(0); }
        100% { transform: rotate(0); }
      }
      .bell-animation {
        animation: bell-ring 2s infinite;
        animation-delay: 5s;
      }
      @keyframes pulse {
        0% { transform: scale(0.8); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(0.8); opacity: 0.8; }
      }
      .pulse {
        animation: pulse 2s infinite;
      }
      .notification-item:hover {
        transform: scale(1.02);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', marginRight: '10px' }}>
      {/* Notification Bell Button without Animation */}
      <button
        onClick={toggleDropdown}
        className={unreadCount > 0 ? "bell-animation" : ""}
        style={{
          position: 'relative',
          backgroundColor: isOpen ? 'rgba(76, 44, 166, 0.8)' : 'rgba(45, 27, 105, 0.6)',
          border: 'none',
          color: '#f1f1f1',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background-color 0.3s ease, transform 0.2s ease',
          boxShadow: isOpen ? '0 0 15px rgba(76, 44, 166, 0.5)' : 'none',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.0201 2.91C8.71009 2.91 6.02009 5.6 6.02009 8.91V11.8C6.02009 12.41 5.76009 13.34 5.45009 13.86L4.30009 15.77C3.59009 16.95 4.08009 18.26 5.38009 18.7C9.69009 20.14 14.3401 20.14 18.6501 18.7C19.8601 18.3 20.3901 16.87 19.7301 15.77L18.5801 13.86C18.2801 13.34 18.0201 12.41 18.0201 11.8V8.91C18.0201 5.61 15.3201 2.91 12.0201 2.91Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" />
          <path d="M13.8699 3.2C13.5599 3.11 13.2399 3.04 12.9099 3C11.9499 2.88 11.0299 2.95 10.1699 3.2C10.4599 2.46 11.1799 1.94 12.0199 1.94C12.8599 1.94 13.5799 2.46 13.8699 3.2Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.02 19.06C15.02 20.71 13.67 22.06 12.02 22.06C11.2 22.06 10.44 21.72 9.9 21.18C9.36 20.64 9.02 19.88 9.02 19.06" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--gaming-accent-blue)',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel without Animation - Fixed positioning issue */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',  // Aligned to the right of the notification button
            width: '350px',
            backgroundColor: 'rgba(45, 27, 105, 0.9)',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            marginTop: '15px',
            zIndex: 1000,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <h3 style={{
              color: '#f1f1f1',
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>
              {t('common.notifications')}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                style={{
                  backgroundColor: 'transparent',
                  color: '#4ade80',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(74, 222, 128, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '10px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
          }}>
            {loading && notifications.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#94a3b8'
                }}
              >
                <div className="spinner" style={{
                  display: 'inline-block',
                  width: '30px',
                  height: '30px',
                  border: '3px solid rgba(255, 255, 255, 0.1)',
                  borderTop: '3px solid #4ade80',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '10px'
                }} />
                <p>{t('notifications.loading')}</p>
              </div>
            ) : error ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#ef4444'
                }}
              >
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '200px'
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginBottom: '16px', opacity: 0.7 }}
                >
                  <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  <path d="M3 9l9 6 9-6"></path>
                </svg>
                <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>{t('notifications.empty')}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>New notifications will appear here</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={notification._id}
                  className="notification-item"
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: notification.read
                      ? 'rgba(45, 27, 105, 0.5)'
                      : 'rgba(76, 44, 166, 0.2)',
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    borderRadius: '12px',
                    margin: '8px 0',
                    boxShadow: notification.read ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification._id);
                    }
                  }}
                >
                  <div style={{
                    display: 'flex'
                  }}>
                    <div
                      style={{
                        marginRight: '12px',
                        padding: '8px',
                        backgroundColor: notification.read
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(76, 44, 166, 0.8)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: notification.read
                          ? 'none'
                          : '0 0 15px rgba(76, 44, 166, 0.3)',
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        alignSelf: 'flex-start'
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px'
                      }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#f1f1f1'
                        }}>
                          {notification.title}
                        </h4>

                        {/* Add action buttons for offer notifications */}
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
                                  // Remove this notification from the list
                                  setNotifications(prevNotifications =>
                                    prevNotifications.filter(n => n._id !== notification._id)
                                  );
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: '6px'
                      }}>
                        <p style={{
                          color: notification.read ? '#94a3b8' : '#d1d5db',
                          margin: '0',
                          fontSize: '13px',
                          lineHeight: '1.4'
                        }}>
                          {notification.message}
                        </p>

                        <span style={{
                          color: '#9ca3af',
                          fontSize: '11px',
                          marginLeft: '10px',
                          flexShrink: 0
                        }}>
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>

                      {notification.link && (
                        <div>
                          <Link
                            to={notification.link}
                            style={{
                              color: '#4ade80',
                              fontSize: '13px',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              marginTop: '4px',
                              fontWeight: '500'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              if (!notification.read) {
                                markAsRead(notification._id);
                              }
                              // Prevent default only if it's not a valid link
                              if (!notification.link.startsWith('/')) {
                                e.preventDefault();
                                console.error('Invalid notification link:', notification.link);
                              }
                            }}
                          >
                            {t('notifications.viewDetails')}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!notification.read && (
                    <div
                      className="pulse"
                      style={{
                        position: 'absolute',
                        top: '15px',
                        right: '16px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#4ade80',
                        boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer - Fixed "notifications.viewAll" text to "All notifications" */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
              }}
            >
              <Link
                to="/profile"
                style={{
                  color: '#cbd5e1',
                  textDecoration: 'none',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setIsOpen(false)}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.target.style.color = '#f1f1f1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#cbd5e1';
                }}
              >
                All notifications
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;