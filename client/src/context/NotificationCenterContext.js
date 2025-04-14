import React, { createContext, useState } from "react";

const NotificationCenterContext = createContext({
  notifications: [],
  unreadCount: 0,
  showNotificationCenter: false,
  setShowNotificationCenter: () => {},
  markAllAsRead: () => {},
  markAsRead: () => {},
  refreshNotifications: () => {},
});

export const NotificationCenterContextProvider = ({ children }) => {
  const [notificationState, setNotificationState] = useState({
    notifications: [],
    unreadCount: 0,
    showNotificationCenter: false,
  });

  const setShowNotificationCenter = (show) => {
    setNotificationState((prev) => ({
      ...prev,
      showNotificationCenter: show,
    }));
  };

  const markAllAsRead = () => {
    setNotificationState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notif) => ({
        ...notif,
        read: true,
      })),
      unreadCount: 0,
    }));
  };

  const markAsRead = (id) => {
    setNotificationState((prev) => {
      const updatedNotifications = prev.notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      );

      const unreadCount = updatedNotifications.filter(
        (notif) => !notif.read
      ).length;

      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount,
      };
    });
  };

  const refreshNotifications = () => {
    // This would normally fetch notifications from an API
    // Simulating API call
    setTimeout(() => {
      setNotificationState((prev) => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
      }));
    }, 1000);
  };

  return (
    <NotificationCenterContext.Provider
      value={{
        ...notificationState,
        setShowNotificationCenter,
        markAllAsRead,
        markAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationCenterContext.Provider>
  );
};

export default NotificationCenterContext;
