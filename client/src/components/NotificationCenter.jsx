import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from '../utils/languageUtils';
import OfferActionMenu from './OfferActionMenu';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import { FaTimes } from 'react-icons/fa';

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
  const [isSidePanelVisible, setIsSidePanelVisible] = useState(false);
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
  const handleViewAllNotifications = () => {
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

  // Side panel for notifications (mobile or detailed view)
  const SidePanel = ({ visible, onClose, children }) => {
    return visible ? (
      <div 
        ref={sidePanelRef}
        style={{
          position: 'fixed',
          top: '70px', // Align exactly at the bottom of navbar
          right: '0',
          width: '380px',
          height: 'calc(100vh - 70px)', // Full height minus navbar height
          backgroundColor: 'rgba(21, 28, 43, 0.95)', // Match navbar color
          boxShadow: '-8px 0 25px rgba(0, 0, 0, 0.3), 0 0 15px rgba(51, 115, 242, 0.15)',
          overflowY: 'auto',
          zIndex: 1500,
          backdropFilter: 'blur(12px)',
          borderLeft: '1px solid rgba(51, 115, 242, 0.3)',
          borderBottom: '1px solid rgba(51, 115, 242, 0.3)',
          borderTopLeftRadius: '12px',
          borderBottomLeftRadius: '12px',
          padding: 0,
          margin: 0,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          opacity: visible ? 1 : 0
        }}
      >
        <div style={{ 
          padding: '18px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to bottom, rgba(51, 115, 242, 0.1), transparent)'
        }}>
          <h3 style={{ 
            margin: 0,
            color: '#fff',
            fontSize: '1.2rem',
            fontWeight: '600',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: '8px',
                backgroundColor: 'rgba(51, 115, 242, 0.2)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '3px 8px',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                {unreadCount}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#8a8f98',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '8px',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <FaTimes />
          </button>
        </div>
        <div style={{ padding: '12px' }}>
          {children}
        </div>
      </div>
    ) : null;
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }

    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type) => {
    const typeMap = {
      'success': '#4ade80',
      'error': '#ef4444',
      'info': '#38bdf8',
      'warning': '#f59e0b',
      'trade': '#8b5cf6',
      'offer': '#8b5cf6',
      'transaction': '#4ade80',
      'system': '#38bdf8'
    };
    
    return typeMap[type] || '#38bdf8';
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60 * 1000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    // Otherwise show the date
    return date.toLocaleDateString();
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (loading) return;
    
    try {
      await markAsRead(); // Call the existing function with no parameters to mark all as read
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

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
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: '0',
              width: '320px',
              maxHeight: '400px',
              backgroundColor: 'rgba(21, 28, 43, 0.95)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              border: '1px solid rgba(51, 115, 242, 0.3)',
              overflow: 'hidden',
              zIndex: 1600,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: '0', color: '#fff', fontSize: '1rem' }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span style={{
                      marginLeft: '8px',
                      backgroundColor: 'rgba(51, 115, 242, 0.2)', 
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <button
                  onClick={markAllAsRead}
                  disabled={loading || notifications.every(n => n.read)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: notifications.some(n => !n.read) ? '#3373f2' : '#585d6a',
                    cursor: notifications.some(n => !n.read) ? 'pointer' : 'default',
                    fontSize: '0.8rem',
                    padding: '0',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  Mark all read
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                  <div className="loading-spinner"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: '#8a8f98', 
                  fontSize: '0.9rem'
                }}>
                  No notifications
                </div>
              ) : (
                <div>
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: notification.read ? 'transparent' : 'rgba(51, 115, 242, 0.1)',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        display: 'flex',
                        alignItems: 'flex-start',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = notification.read 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(51, 115, 242, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = notification.read 
                          ? 'transparent' 
                          : 'rgba(51, 115, 242, 0.1)';
                      }}
                    >
                      {/* Notification Icon */}
                      <div style={{ marginRight: '12px', fontSize: '16px', color: getNotificationColor(notification.type) }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Notification Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#fff', 
                          fontWeight: notification.read ? 'normal' : 'bold',
                          marginBottom: '4px'
                        }}>
                          {notification.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#8a8f98' }}>
                          {notification.message}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#585d6a', marginTop: '4px' }}>
                          {formatTimeAgo(notification.createdAt)}
                        </div>
                      </div>
                      
                      {/* Unread Indicator */}
                      {!notification.read && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getNotificationColor(notification.type),
                          position: 'absolute',
                          top: '16px',
                          right: '16px'
                        }}></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              padding: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <button
                onClick={handleViewAllNotifications}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3373f2',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                View All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Side Panel */}
      {showAllNotifications && (
        <SidePanel visible={showAllNotifications} onClose={() => setShowAllNotifications(false)}>
          {allNotificationsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div className="spinner"></div>
            </div>
          ) : allNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#8a8f98' }}>
              No notifications to display
            </div>
          ) : (
            <div>
              {allNotifications.map((notification) => (
                <div
                  key={notification._id}
                  style={{
                    padding: '14px',
                    marginBottom: '8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                    backgroundColor: notification.read ? 'transparent' : 'rgba(51, 115, 242, 0.1)',
                    cursor: notification.link ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'flex-start',
                    transition: 'background-color 0.2s ease',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(51, 115, 242, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read 
                      ? 'transparent' 
                      : 'rgba(51, 115, 242, 0.1)';
                  }}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification._id);
                    }

                    if (notification.link) {
                      window.location.href = notification.link;
                    }

                    setShowAllNotifications(false);
                  }}
                >
                  <div style={{ 
                    marginRight: '14px', 
                    color: getNotificationColor(notification.type),
                    padding: '8px',
                    backgroundColor: `${getNotificationColor(notification.type)}10`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '14px', 
                      marginBottom: '4px', 
                      color: notification.read ? '#8a8f98' : '#fff',
                      fontWeight: notification.read ? 'normal' : 'bold'
                    }}>
                      {notification.title || notification.message}
                    </div>
                    {notification.title && (
                      <div style={{ fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>
                        {notification.message}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#8a8f98' }}>
                      {formatTimeAgo(notification.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SidePanel>
      )}
    </>
  );
};

export default NotificationCenter;