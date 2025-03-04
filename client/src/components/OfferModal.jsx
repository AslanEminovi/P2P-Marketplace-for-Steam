import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';

const OfferModal = ({ item, onClose, onSuccess }) => {
  const [offerAmount, setOfferAmount] = useState('');
  const [offerCurrency, setOfferCurrency] = useState('USD');
  const [offerRate, setOfferRate] = useState(item?.currencyRate || 1.8);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOfferAmountChange = (e) => {
    // Only allow numeric values with up to 2 decimal places
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setOfferAmount(value);
    }
  };

  const handleRateChange = (e) => {
    // Only allow numeric values with up to 1 decimal place
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,1}$/.test(value)) {
      setOfferRate(value);
    }
  };

  const calculateEquivalentAmount = () => {
    if (!offerAmount) return '';
    
    const amount = parseFloat(offerAmount);
    if (isNaN(amount)) return '';
    
    if (offerCurrency === 'USD') {
      // Calculate GEL equivalent
      return (amount * offerRate).toFixed(2) + ' GEL';
    } else {
      // Calculate USD equivalent
      return (amount / offerRate).toFixed(2) + ' USD';
    }
  };

  const handleSubmit = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      setError('Please enter a valid offer amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        offerAmount: parseFloat(offerAmount),
        offerCurrency,
        offerRate: parseFloat(offerRate),
        message: message || `Offer for ${item.marketHashName}`
      };

      const response = await axios.post(
        `${API_URL}/offers/${item._id}`,
        payload,
        { withCredentials: true }
      );

      if (response.status === 201) {
        onSuccess && onSuccess(response.data);
        onClose();
      }
    } catch (err) {
      console.error('Offer submission error:', err);
      setError(err.response?.data?.error || 'Failed to submit offer');
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity) => {
    const rarityColors = {
      'Consumer Grade': '#b0c3d9',      // white/gray
      'Industrial Grade': '#5e98d9',    // light blue
      'Mil-Spec Grade': '#4b69ff',      // dark blue
      'Restricted': '#8847ff',          // dark purple
      'Classified': '#d32ce6',          // light purple
      'Covert': '#eb4b4b',             // red
      '★': '#e4ae39'                    // gold (for knives/gloves)
    };
    return rarityColors[rarity] || '#b0c3d9';
  };

  const getWearColor = (wear) => {
    const wearColors = {
      'Factory New': '#4cd94c',
      'Minimal Wear': '#87d937',
      'Field-Tested': '#d9d937',
      'Well-Worn': '#d98037',
      'Battle-Scarred': '#d94040'
    };
    return wearColors[wear] || '#b0c3d9';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'rgba(45, 27, 105, 0.9)',
        borderRadius: '16px',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#e2e8f0',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#e2e8f0',
            fontSize: '1.5rem',
            cursor: 'pointer',
            width: '2rem',
            height: '2rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>

        <h2 style={{
          fontSize: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Make an Offer
        </h2>

        {/* Item Details */}
        <div style={{
          display: 'flex',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
          padding: '1rem',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ flexShrink: 0 }}>
            <img
              src={item.imageUrl}
              alt={item.marketHashName}
              style={{
                width: '100px',
                height: 'auto',
                borderRadius: '8px',
                border: `2px solid ${getRarityColor(item.rarity)}`,
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#ffffff'
            }}>
              {item.marketHashName}
            </h3>
            
            <div style={{
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              <p style={{ color: getRarityColor(item.rarity) }}>
                {item.rarity}
              </p>
              
              {item.wear && (
                <p style={{ color: getWearColor(item.wear) }}>
                  {item.wear}
                </p>
              )}
              
              <p style={{ 
                color: '#4ade80',
                fontWeight: 'bold',
              }}>
                Listed for: ${item.price?.toFixed(2)} USD
                {item.priceGEL && (
                  <span style={{ color: '#94a3b8', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                    (₾{item.priceGEL} GEL)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Currency Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Currency:
          </label>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <button
              onClick={() => setOfferCurrency('USD')}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: offerCurrency === 'USD' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              USD ($)
            </button>
            <button
              onClick={() => setOfferCurrency('GEL')}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: offerCurrency === 'GEL' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              GEL (₾)
            </button>
          </div>
        </div>

        {/* Exchange Rate (only shown for GEL) */}
        {offerCurrency === 'GEL' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Exchange Rate (1 USD = X GEL):
            </label>
            <input
              type="text"
              value={offerRate}
              onChange={handleRateChange}
              placeholder="Exchange rate (e.g. 1.8)"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
        )}

        {/* Offer Amount */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Offer Amount ({offerCurrency}):
          </label>
          <input
            type="text"
            value={offerAmount}
            onChange={handleOfferAmountChange}
            placeholder={`Amount in ${offerCurrency}`}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
            autoFocus
          />
          {offerAmount && (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              ≈ {calculateEquivalentAmount()}
            </p>
          )}
        </div>

        {/* Message (Optional) */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Message (Optional):
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message to the seller"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              fontSize: '1rem',
              minHeight: '100px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(220, 38, 38, 0.2)',
            color: '#ef4444',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.3s ease'
            }}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '0.5rem',
              backgroundColor: '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.3s ease',
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Offer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferModal;