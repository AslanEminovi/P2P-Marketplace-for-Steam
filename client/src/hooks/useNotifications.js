import { useState, useCallback } from "react";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  // Add a new notification
  const addNotification = useCallback((notification) => {
    const id = notification.id || Date.now().toString();
    const newNotification = {
      ...notification,
      id,
      timestamp: notification.timestamp || new Date(),
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto-remove notification after timeout if specified
    if (notification.timeout) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.timeout);
    }

    return id;
  }, []);

  // Remove a notification by ID
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    setNotifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };
};

export default useNotifications;
