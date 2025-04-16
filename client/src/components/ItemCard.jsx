import React from 'react';
import SellerStatus from './SellerStatus';
import '../styles/ItemCard.css';

const ItemCard = ({ seller }) => {
  if (!seller) return null;
  
  return (
    <div className="item-seller">
      <div className="seller-avatar">
        <img 
          src={seller.avatar || '/default-avatar.png'} 
          alt={seller.displayName} 
          onError={(e) => {
            // Fallback if avatar image fails to load
            e.target.src = '/default-avatar.png';
          }}
        />
        {seller._id && (
          <div className={`online-status-indicator ${seller.isOnline ? 'online' : 'offline'}`}></div>
        )}
      </div>
      <div className="seller-info">
        <div className="seller-name">{seller.displayName || 'Anonymous'}</div>
        {seller._id && <SellerStatus sellerId={seller._id} showLastSeen={false} />}
      </div>
    </div>
  );
};

export default ItemCard; 