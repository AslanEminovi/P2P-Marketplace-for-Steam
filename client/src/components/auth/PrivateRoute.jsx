import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ user, children }) => {
  if (!user) {
    console.log("PrivateRoute - Access denied, redirecting to home");
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default PrivateRoute; 