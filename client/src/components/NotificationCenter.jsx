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
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [allNotifications, setAllNotifications] = useState([]);
  const [allNotificationsLoading, setAllNotificationsLoading] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const dropdownRef = useRef(null);
  const sidePanelRef = useRef(null);
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

  // Check if user is a first-time visitor
  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');

    if (!hasVisitedBefore && user) {
      // Show welcome notification only for first-time visitors
      // This notification will not be added to the notifications panel
      setTimeout(() => {
        showWelcomeNotification();
        localStorage.setItem('hasVisitedBefore', 'true');
      }, 1500);
    }
  }, [user]);

  // Set up socket listener for real-time notifications
  useEffect(() => {
    if (user) {
      // Initial fetch of notifications
      fetchNotifications();

      // Listen for new trade offers - only real ones from server
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

  // Welcome notification - only for first visit, not added to panel
  const showWelcomeNotification = () => {
    setWelcomeShown(true);
    setTimeout(() => setWelcomeShown(false), 5000);
  };

  // Function to add a new notification
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

      // Update local state
      if (notificationId) {
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, read: true } : n
          )
        );

        setAllNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, read: true } : n
          )
        );

        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        // Mark all as read
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );

        setAllNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );

        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      fetchNotifications();
    }
  };

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
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .notification-dropdown {
        animation: fadeIn 0.2s ease-out;
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        z-index: 1000;
      }
      
      .notification-side-panel {
        animation: slideIn 0.3s ease-out;
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        z-index: 1100;
      }
      
      .pulse {
        animation: pulse 2s infinite;
      }
      
      .welcome-notification {
        animation: fadeIn 0.5s ease-out;
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 1200;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add this function to fetch all notifications
  const fetchAllNotifications = async () => {
    if (allNotificationsLoading) return;

    setAllNotificationsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/user/notifications`, {
        withCredentials: true,
        params: { limit: 50, offset: 0 } // Get more notifications for the all view
      });

      setAllNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Error fetching all notifications:', err);
    } finally {
      setAllNotificationsLoading(false);
    }
  };

  // Handle opening the side panel with all notifications
  const handleViewAllNotifications = (e) => {
    e.preventDefault();
    setShowAllNotifications(true);
    fetchAllNotifications();
    setIsOpen(false); // Close the dropdown
  };

  // Effect to handle clicking outside the side panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidePanelRef.current &&
        !sidePanelRef.current.contains(event.target) &&
        showAllNotifications) {
        setShowAllNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAllNotifications]);

  return (
    <>
      {/* Welcome notification - only shown on first visit */}
      {welcomeShown && (
        <div
          className="welcome-notification"
          style={{
            backgroundColor: 'rgba(31, 41, 55, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            maxWidth: '320px',
            zIndex: 1200
          }}
        >
          <div
            style={{
              marginRight: '12px',
              padding: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.3)',
              width: '36px',
              height: '36px'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>

          <div>
            <h4 style={{ margin: '0 0 4px 0', color: '#f1f1f1', fontSize: '16px' }}>
              Welcome to CS2 Marketplace
            </h4>
            <p style={{ margin: 0, color: '#d1d5db', fontSize: '14px' }}>
              Thanks for joining! Buy and sell CS2 items safely.
            </p>
          </div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <button
          onClick={toggleDropdown}
          style={{
            backgroundColor: unreadCount > 0 ? 'rgba(76, 44, 166, 0.2)' : 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease',
            marginLeft: '10px'
          }}
          aria-label="Notifications"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: unreadCount > 0 ? '#a78bfa' : '#94a3b8'
            }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>

          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '0',
                right: '0',
                backgroundColor: '#f43f5e',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px #151C2B'
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div
            className="notification-dropdown"
            ref={dropdownRef}
            style={{
              backgroundColor: '#1f2937',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              width: '320px',
              maxHeight: '550px',
              overflowY: 'auto',
              zIndex: 1000
            }}
          >
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                color: '#f1f1f1',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                {t('notifications.title')}
                {unreadCount > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    backgroundColor: 'rgba(76, 44, 166, 0.2)',
                    color: '#a78bfa',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </h3>

              {unreadCount > 0 && (
                <button
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => markAsRead()}
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

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
                notifications.map(notification => (
                  <div
                    key={notification._id}
                    style={{
                      position: 'relative',
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: notification.read ? 'transparent' : 'rgba(76, 44, 166, 0.1)',
                      borderRadius: '8px',
                      border: `1px solid ${notification.read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(76, 44, 166, 0.2)'}`,
                      boxShadow: notification.read ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification._id);
                      }

                      if (notification.link) {
                        window.location.href = notification.link;
                      }

                      setIsOpen(false);
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

                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '4px'
                        }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: '600',
                            color: notification.read ? '#e5e7eb' : '#f1f1f1'
                          }}>
                            {notification.title}
                          </h4>
                          <span style={{
                            fontSize: '11px',
                            color: '#9ca3af',
                            marginLeft: '8px'
                          }}>
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>

                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: notification.read ? '#94a3b8' : '#d1d5db',
                          lineHeight: '1.5'
                        }}>
                          {notification.message}
                        </p>
                      </div>
                    </div>

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

            {/* Add View All button at the bottom of dropdown */}
            {notifications.length > 0 && (
              <div
                style={{
                  padding: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center'
                }}
              >
                <button
                  onClick={handleViewAllNotifications}
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
                    transition: 'all 0.2s ease',
                    background: 'none',
                    border: 'none',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.target.style.color = '#f1f1f1';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#cbd5e1';
                  }}
                >
                  View All Notifications
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Side Panel for All Notifications */}
      {showAllNotifications && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: 0,
            width: '400px',
            maxWidth: '90vw',
            height: 'calc(100vh - 70px)',
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            boxShadow: '-5px 0 25px rgba(0, 0, 0, 0.3)',
            zIndex: 999,
            overflowY: 'auto',
            backdropFilter: 'blur(8px)',
            transition: 'transform 0.3s ease-in-out',
            transform: showAllNotifications ? 'translateX(0)' : 'translateX(100%)',
            borderTopLeftRadius: '12px',
            borderBottomLeftRadius: '12px'
          }}
          ref={sidePanelRef}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <h3 style={{ 
              color: '#f1f1f1', 
              margin: 0, 
              fontSize: '16px',
              fontWeight: '600'
            }}>
              All Notifications
            </h3>
            <button
              onClick={() => setShowAllNotifications(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#f1f1f1',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                style={{
                  backgroundColor: 'rgba(74, 222, 128, 0.2)',
                  color: '#4ade80',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  marginBottom: '20px',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17 4 12"></path>
                </svg>
                Mark All as Read
              </button>
            )}

            {allNotificationsLoading ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 0'
                }}
              >
                <div className="spinner" style={{
                  display: 'inline-block',
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(255, 255, 255, 0.1)',
                  borderTop: '3px solid #4ade80',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '15px'
                }} />
                <p style={{ color: '#94a3b8' }}>Loading notifications...</p>
              </div>
            ) : allNotifications.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 0',
                  color: '#94a3b8'
                }}
              >
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginBottom: '20px', opacity: 0.7 }}
                >
                  <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  <path d="M3 9l9 6 9-6"></path>
                </svg>
                <h3 style={{ margin: '0 0 10px 0' }}>No notifications yet</h3>
                <p style={{ margin: 0, opacity: 0.7 }}>You'll see your notifications here when you receive them</p>
              </div>
            ) : (
              allNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className="notification-item"
                  style={{
                    padding: '15px',
                    marginBottom: '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: notification.read
                      ? 'transparent'
                      : 'rgba(76, 44, 166, 0.1)',
                    borderRadius: '8px',
                    border: `1px solid ${notification.read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(76, 44, 166, 0.2)'}`,
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    boxShadow: notification.read ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification._id);
                    }

                    if (notification.link) {
                      window.location.href = notification.link;
                      setShowAllNotifications(false);
                    }
                  }}
                >
                  <div style={{ display: 'flex' }}>
                    <div
                      style={{
                        marginRight: '15px',
                        padding: '10px',
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
                        width: '42px',
                        height: '42px',
                        minWidth: '42px',
                        alignSelf: 'flex-start'
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '6px'
                      }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#f1f1f1'
                        }}>
                          {notification.title}
                        </h4>

                        <span style={{
                          color: '#9ca3af',
                          fontSize: '12px',
                          marginLeft: '10px',
                          flexShrink: 0
                        }}>
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>

                      <p style={{
                        color: notification.read ? '#94a3b8' : '#d1d5db',
                        margin: '0 0 8px 0',
                        fontSize: '14px',
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
                              fontSize: '14px',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              marginTop: '6px',
                              fontWeight: '500'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAllNotifications(false);
                              if (!notification.read) {
                                markAsRead(notification._id);
                              }
                            }}
                          >
                            View Details
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        </div>
      )}
    </>
  );
};

export default NotificationCenter;