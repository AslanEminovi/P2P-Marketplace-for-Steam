import React from 'react';
import './MarketplaceItem.css';

const MarketplaceItem = ({ item, onClick }) => {
  const {
    name,
    wear,
    float,
    price,
    imageUrl,
    rarity,
    isStatTrak,
    isSouvenir,
    pattern
  } = item;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="marketplace-item" onClick={() => onClick(item)}>
      <div className={`item-container ${rarity?.toLowerCase()}`}>
        <div className="item-image-container">
          <img src={imageUrl} alt={name} className="item-image" />
          {isStatTrak && <div className="stat-trak-badge">StatTrak™</div>}
          {isSouvenir && <div className="souvenir-badge">Souvenir</div>}
        </div>
        
        <div className="item-info">
          <h3 className="item-name">{name}</h3>
          
          <div className="item-details">
            {wear && <span className="wear-tag">{wear}</span>}
            {float && <span className="float-value">Float: {float}</span>}
            {pattern && <span className="pattern-id">Pattern: {pattern}</span>}
          </div>
          
          <div className="item-price">
            {formatPrice(price)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceItem; 