import React from 'react';
import './ItemModal.css';

const ItemModal = ({ item, isOpen, onClose, onAction, actionLabel }) => {
  if (!isOpen) return null;

  return (
    <div className="item-modal-overlay" onClick={onClose}>
      <div className="item-modal-content" onClick={e => e.stopPropagation()}>
        <button className="item-modal-close" onClick={onClose}>×</button>
        
        <div className="item-modal-header">
          <h2>{item.name}</h2>
          <span className={`item-rarity ${item.rarity?.toLowerCase()}`}>
            {item.rarity}
          </span>
        </div>

        <div className="item-modal-body">
          <div className="item-modal-image">
            <img src={item.imageUrl} alt={item.name} />
          </div>

          <div className="item-modal-details">
            <div className="item-detail">
              <span className="detail-label">Wear:</span>
              <span className="detail-value">{item.wear || 'N/A'}</span>
            </div>
            <div className="item-detail">
              <span className="detail-label">Float:</span>
              <span className="detail-value">{item.float || 'N/A'}</span>
            </div>
            <div className="item-detail">
              <span className="detail-label">Pattern:</span>
              <span className="detail-value">{item.pattern || 'N/A'}</span>
            </div>
            <div className="item-detail">
              <span className="detail-label">Price:</span>
              <span className="detail-value">${item.price?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>
        </div>

        {actionLabel && onAction && (
          <div className="item-modal-footer">
            <button className="item-modal-action" onClick={() => onAction(item)}>
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemModal; 