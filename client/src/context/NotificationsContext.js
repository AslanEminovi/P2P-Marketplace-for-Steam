import React, { createContext } from "react";

// Create a Context for notifications
export const NotificationsContext = createContext({
  notifications: [],
  setNotifications: () => {},
  addNotification: () => {},
  removeNotification: () => {},
  clearAllNotifications: () => {},
});

export default NotificationsContext;
