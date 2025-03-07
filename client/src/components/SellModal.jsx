import React, { useState } from 'react';
import '../utils/theme.css';

const SellModal = ({ item, onClose, onSell }) => {
  const [price, setPrice] = useState(item?.suggestedPrice?.toString() || '');
  const [priceGEL, setPriceGEL] = useState('');
  const [currencyRate, setCurrencyRate] = useState(2.65);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Use proper names with fallbacks
  const itemName = item?.marketHashName || item?.name || 'CS2 Item';
  const itemImageUrl = item?.imageUrl || item?.image || (item?.iconUrl ? `https://steamcommunity-a.akamaihd.net/economy/image/${item.iconUrl}` : '/img/placeholder-item.svg');
  const itemWear = item?.wear || (itemName.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i)?.[0]);
  const itemRarity = item?.rarity || 'Common';
  const itemAssetId = item?.assetId || item?._id || '';
  const suggestedPrice = item?.suggestedPrice || item?.price || item?.pricelatest || item?.pricereal || 0;

  const translateWear = (shortWear) => {
    if (!shortWear) return null;
    
    // If already a full wear name, return it
    if (/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i.test(shortWear)) {
      return shortWear;
    }
    
    const wearTranslations = {
      'fn': 'Factory New',
      'mw': 'Minimal Wear',
      'ft': 'Field-Tested',
      'ww': 'Well-Worn',
      'bs': 'Battle-Scarred'
    };
    return wearTranslations[shortWear.toLowerCase()] || shortWear;
  };

  const getRarityColor = (rarity) => {
    const rarityColors = {
      'Consumer Grade': '#b0c3d9',      // white/gray
      'Industrial Grade': '#5e98d9',    // light blue
      'Mil-Spec Grade': '#4b69ff',      // dark blue
      'Restricted': '#8847ff',          // dark purple
      'Classified': '#d32ce6',          // light purple
      'Covert': '#eb4b4b',              // red
      '★': '#e4ae39'                    // gold (for knives/gloves)
    };
    return rarityColors[rarity] || '#b0c3d9';
  };

  const handlePriceChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrice(value);
      const numValue = parseFloat(value) || 0;
      setPriceGEL((numValue * currencyRate).toFixed(2));
    }
  };

  const handleGELChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPriceGEL(value);
      const numValue = parseFloat(value) || 0;
      setPrice((numValue / currencyRate).toFixed(2));
    }
  };

  const handleRateChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setCurrencyRate(value);
      const numValue = parseFloat(price) || 0;
      setPriceGEL((numValue * value).toFixed(2));
    }
  };

  const handleSubmit = async () => {
    if (!price || isNaN(parseFloat(price))) {
      setError('Please enter a valid price');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Prepare listing data
      const listingData = {
        assetId: itemAssetId,
        price: parseFloat(price),
        priceGEL: priceGEL ? parseFloat(priceGEL) : undefined
      };
      
      // Call the provided onSell callback
      await onSell(listingData);
      onClose();
    } catch (err) {
      console.error('Error creating listing:', err);
      setError(err.response?.data?.error || 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Sell Item</h2>
          <button 
            className="modal-close" 
            onClick={onClose}
            disabled={loading}
          >
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          <div className="item-info">
            <div className="item-image-container">
              <img 
                src={itemImageUrl} 
                alt={itemName}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/img/placeholder-item.svg';
                }}
              />
              {itemRarity && (
                <div 
                  className="item-rarity-badge"
                  style={{backgroundColor: getRarityColor(itemRarity)}}
                >
                  {itemRarity}
                </div>
              )}
            </div>
            
            <div className="item-details">
              <h3>{itemName}</h3>
              {itemWear && (
                <div className="item-wear">{translateWear(itemWear)}</div>
              )}
              {suggestedPrice > 0 && (
                <div className="suggested-price">
                  Suggested price: ${suggestedPrice.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          <div className="price-inputs">
            <div className="form-group">
              <label>Price (USD)</label>
              <div className="input-with-icon">
                <span className="currency-icon">$</span>
                <input
                  type="text"
                  value={price}
                  onChange={handlePriceChange}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Price (GEL) - Optional</label>
              <div className="input-with-icon">
                <span className="currency-icon">₾</span>
                <input
                  type="text"
                  value={priceGEL}
                  onChange={handleGELChange}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>GEL/USD Rate</label>
              <select 
                value={currencyRate} 
                onChange={handleRateChange}
                disabled={loading}
              >
                <option value="2.65">2.65 (Default)</option>
                <option value="2.70">2.70</option>
                <option value="2.75">2.75</option>
                <option value="2.80">2.80</option>
                <option value="2.85">2.85</option>
                <option value="2.90">2.90</option>
              </select>
            </div>
          </div>
          
          <div className="description">
            <p>
              This will list your item for sale on the marketplace. Buyers will be able to purchase it directly
              or make an offer. You'll receive a trade offer when someone buys your item.
            </p>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Creating Listing...' : 'List Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellModal;