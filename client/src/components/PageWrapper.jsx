import React from 'react';

/**
 * PageWrapper component
 * A simple wrapper for all page content that provides consistent styling and transitions
 */
const PageWrapper = ({ children }) => {
  return (
    <div className="page-content">
      {children}
    </div>
  );
};

export default PageWrapper;
