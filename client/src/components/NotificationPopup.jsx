import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import '../styles/NotificationPopup.css';

const NotificationPopup = ({ notifications, removeNotification }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'SUCCESS':
        return <FaCheckCircle className="notification-icon success" />;
      case 'ERROR':
        return <FaExclamationCircle className="notification-icon error" />;
      case 'WARNING':
        return <FaExclamationTriangle className="notification-icon warning" />;
      case 'INFO':
      default:
        return <FaInfoCircle className="notification-icon info" />;
    }
  };

  const getTypeClass = (type) => {
    switch (type) {
      case 'SUCCESS':
        return 'success';
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'INFO':
      default:
        return 'info';
    }
  };

  return (
    <div className="notification-container">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            className={`notification-popup ${getTypeClass(notification.type)}`}
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <div className="notification-content">
              {getIcon(notification.type)}
              <div className="notification-text">
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
              </div>
              <button
                className="close-button"
                onClick={() => removeNotification(notification.id)}
                aria-label="Close notification"
              >
                <FaTimes />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationPopup; 