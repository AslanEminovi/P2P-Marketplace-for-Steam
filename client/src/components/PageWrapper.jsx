import React from 'react';

/**
 * PageWrapper component
 * A simple wrapper for all page content that provides consistent styling and transitions
 */
const PageWrapper = ({ children, ...rest }) => {
  // Pass all props to children to ensure props like 'user' are forwarded
  const childrenWithProps = React.Children.map(children, child => 
    React.cloneElement(child, rest)
  );
  
  return (
    <div className="page-content">
      {childrenWithProps}
    </div>
  );
};

export default PageWrapper;

