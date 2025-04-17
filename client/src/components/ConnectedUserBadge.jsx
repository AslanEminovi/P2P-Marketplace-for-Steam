import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { logout } from '../redux/slices/authSlice';
import { selectCurrentUser, selectIsAuthenticated } from '../redux/slices/authSlice';
import { selectUnreadCount } from '../redux/slices/notificationsSlice';

const ConnectedUserBadge = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const unreadNotifications = useSelector(selectUnreadCount);
  
  // If not authenticated, don't show anything
  if (!isAuthenticated || !user) {
    return null;
  }
  
  // Handle logout
  const handleLogout = () => {
    dispatch(logout());
  };
  
  return (
    <div className="connected-user-badge">
      <div className="user-avatar">
        <img 
          src={user.avatar || '/default-avatar.png'} 
          alt={user.displayName}
          className="avatar-image"
        />
        {unreadNotifications > 0 && (
          <span className="notification-badge">{unreadNotifications}</span>
        )}
      </div>
      
      <div className="user-info">
        <span className="user-name">{user.displayName}</span>
        
        <div className="user-actions">
          <Link to="/profile" className="action-link">Profile</Link>
          <Link to="/settings" className="action-link">Settings</Link>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </div>
      
      <style jsx>{`
        .connected-user-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          background-color: rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }
        
        .connected-user-badge:hover {
          background-color: rgba(255, 255, 255, 0.15);
        }
        
        .user-avatar {
          position: relative;
        }
        
        .avatar-image {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background-color: #f43f5e;
          color: white;
          font-size: 10px;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          padding: 0 4px;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-weight: 600;
          font-size: 14px;
          color: white;
        }
        
        .user-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }
        
        .action-link {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        
        .action-link:hover {
          color: white;
          text-decoration: underline;
        }
        
        .logout-button {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .logout-button:hover {
          color: #f43f5e;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default ConnectedUserBadge; 