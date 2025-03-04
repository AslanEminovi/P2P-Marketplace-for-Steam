import React from 'react';
import { useParams } from 'react-router-dom';
import TradeDetails from '../components/TradeDetails';

const TradeDetailPage = () => {
  const { tradeId } = useParams();

  return (
    <div style={{ 
      padding: '30px 20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h1 style={{ 
        color: '#f1f1f1', 
        marginBottom: '30px',
        fontSize: '1.75rem'
      }}>
        Trade Details
      </h1>
      
      <TradeDetails tradeId={tradeId} />
    </div>
  );
};

export default TradeDetailPage;