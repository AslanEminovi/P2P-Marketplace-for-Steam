import React, { useState, useEffect, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import { FaExclamationCircle, FaInfoCircle, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import socketService from '../services/socketService';

// Define notification types as constants
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  ALERT: 'alert'
};

const NotificationCenter = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { t } = useTranslation();
  const [hasWelcomeNotification, setHasWelcomeNotification] = useState(false);

  // Fetch notifications on component mount
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      
      // Check if first-time user
      checkFirstTimeUser();
    }
  }, [user?.id]);

  // Set up real-time notifications with socket
  useEffect(() => {
    if (user?.id && socketService) {
      // Listen for new notifications
      socketService.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        // Show toast for important notifications
        if (notification.type === NOTIFICATION_TYPES.ALERT || 
            notification.type === NOTIFICATION_TYPES.ERROR) {
          toast[notification.type === NOTIFICATION_TYPES.ALERT ? 'warning' : 'error'](
            notification.message,
            { autoClose: 5000 }
          );
        }
      });

      return () => {
        socketService.off('new_notification');
      };
    }
  }, [user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
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

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications`, { 
        withCredentials: true 
      });
      
      if (response.data && Array.isArray(response.data)) {
        setNotifications(response.data);
        const unread = response.data.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const checkFirstTimeUser = async () => {
    try {
      // Get user metadata or preferences that would indicate if they've seen the welcome message
      const response = await axios.get(`${API_URL}/users/preferences`, {
        withCredentials: true
      });
      
      const isFirstTime = !response.data?.hasSeenWelcome;
      
      if (isFirstTime && !hasWelcomeNotification) {
        // Add welcome notification if it's first time
        const welcomeNotification = {
          id: 'welcome',
          type: NOTIFICATION_TYPES.INFO,
          title: t('notifications.welcomeTitle'),
          message: t('notifications.welcomeMessage'),
          createdAt: new Date().toISOString(),
          read: false
        };
        
        setNotifications(prev => [welcomeNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        setHasWelcomeNotification(true);
        
        // Mark user as having seen welcome message
        await axios.patch(`${API_URL}/users/preferences`, {
          hasSeenWelcome: true
        }, { withCredentials: true });
      }
    } catch (error) {
      console.error('Error checking first-time user status:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      // For welcome notification we don't need to call API
      if (notificationId === 'welcome') {
        setNotifications(prev => 
          prev.map(n => n.id === 'welcome' ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return;
      }
      
      await axios.patch(`${API_URL}/notifications/${notificationId}/read`, {}, {
        withCredentials: true
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch(`${API_URL}/notifications/mark-all-read`, {}, {
        withCredentials: true
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Handle different notification types/actions
    switch (notification.action) {
      case 'view_trade':
        window.location.href = `/trades/${notification.actionId}`;
        break;
      case 'view_item':
        window.location.href = `/item/${notification.actionId}`;
        break;
      default:
        // Just close the dropdown for notifications without specific actions
        setIsOpen(false);
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return <FaCheckCircle className="text-green-500" />;
      case NOTIFICATION_TYPES.WARNING:
        return <FaExclamationTriangle className="text-yellow-500" />;
      case NOTIFICATION_TYPES.ERROR:
        return <FaTimesCircle className="text-red-500" />;
      case NOTIFICATION_TYPES.ALERT:
        return <FaExclamationCircle className="text-orange-500" />;
      case NOTIFICATION_TYPES.INFO:
      default:
        return <FaInfoCircle className="text-blue-500" />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('notifications.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
    
    return date.toLocaleDateString();
  };

  return (
    <div className="relative z-30" ref={dropdownRef}>
      <button
        className="relative p-2 text-gray-300 hover:text-white focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <FaBell className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-gray-800 rounded-md shadow-lg py-1 z-50">
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400">
              <FaBell className="mx-auto text-3xl mb-2 opacity-30" />
              <p>{t('notifications.empty')}</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${
                    !notification.read ? 'bg-gray-750' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-300 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="ml-2 mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .notification-panel {
          max-height: 70vh;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #4b5563 #1f2937;
        }
        .notification-panel::-webkit-scrollbar {
          width: 6px;
        }
        .notification-panel::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .notification-panel::-webkit-scrollbar-thumb {
          background-color: #4b5563;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default NotificationCenter;