import React from 'react';

const PageWrapper = ({ children }) => {
  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {children}
    </div>
  );
};

export default PageWrapper; 