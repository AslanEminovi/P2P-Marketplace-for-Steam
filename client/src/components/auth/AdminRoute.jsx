import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ user, children }) => {
  console.log("AdminRoute check - User:", user);
  console.log("AdminRoute check - isAdmin:", user?.isAdmin);

  if (!user || !user.isAdmin) {
    console.log("AdminRoute - Access denied, redirecting to home");
    return <Navigate to="/" replace />;
  }
  
  console.log("AdminRoute - Access granted");
  return children;
};

export default AdminRoute; 