import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/constants';
import './MyListings.css';

function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [newPriceGEL, setNewPriceGEL] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/marketplace/my-listings`, { withCredentials: true });
      setListings(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching listings:', err);
      if (err.response && err.response.status === 401) {
        navigate('/');
      } else {
        setError('Failed to load your listings. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async (itemId, forceCancel = false) => {
    try {
      setLoading(true);
      const url = forceCancel 
        ? `${API_URL}/marketplace/cancel/${itemId}?force=true` 
        : `${API_URL}/marketplace/cancel/${itemId}`;
        
      await axios.put(url, {}, { withCredentials: true });
      
      // Update the UI by removing the cancelled listing
      setListings(listings.filter(item => item._id !== itemId));
      setSuccessMessage('Listing cancelled successfully');
    } catch (err) {
      console.error('Error cancelling listing:', err);
      
      // If regular cancel failed, try force cancel
      if (!forceCancel && err.response && (err.response.status === 403 || err.response.status === 404)) {
        try {
          await handleCancelListing(itemId, true);
          return; // Successfully force cancelled
        } catch (forceErr) {
          console.error('Force cancel also failed:', forceErr);
        }
      }
      
      setError('Failed to cancel listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (item) => {
    setEditingItem(item._id);
    setNewPrice(item.price.toString());
    setNewPriceGEL(item.priceGEL.toString());
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setNewPrice('');
    setNewPriceGEL('');
  };

  const updatePrice = async (itemId) => {
    if (!newPrice || isNaN(newPrice) || parseFloat(newPrice) <= 0) {
      setError('Please enter a valid price');
      return;
    }

    try {
      const updatedItem = {
        price: parseFloat(newPrice),
        priceGEL: newPriceGEL ? parseFloat(newPriceGEL) : parseFloat(newPrice) * 1.8,
      };

      const res = await axios.put(`${API_URL}/marketplace/update-price/${itemId}`, updatedItem, { withCredentials: true });
      
      setListings(listings.map(item => 
        item._id === itemId ? { ...item, price: updatedItem.price, priceGEL: updatedItem.priceGEL } : item
      ));
      
      setEditingItem(null);
      setSuccessMessage('Price updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating price:', err);
      setError('Failed to update price. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleNewPriceChange = (e) => {
    const price = e.target.value;
    setNewPrice(price);
    // Auto-calculate GEL price using 1.8 exchange rate if field is empty
    if (!newPriceGEL || newPriceGEL === '') {
      setNewPriceGEL((parseFloat(price || 0) * 1.8).toFixed(2));
    }
  };

  const rarityColors = {
    'Consumer Grade': '#b0c3d9',
    'Industrial Grade': '#5e98d9',
    'Mil-Spec Grade': '#4b69ff',
    'Restricted': '#8847ff',
    'Classified': '#d32ce6',
    'Covert': '#eb4b4b',
    '★': '#e4ae39'
  };

  if (loading) {
    return (
      <div className="my-listings-container">
        <div className="my-listings-header">
          <h1>My Listings</h1>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-listings-container">
      <div className="my-listings-header">
        <h1>My Listings</h1>
        <p>Manage your items currently listed on the marketplace</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <p>{successMessage}</p>
        </div>
      )}

      {listings.length > 0 ? (
        <div className="listings-grid">
          {listings.map(item => (
            <div 
              key={item._id} 
              className="listing-card"
              style={{
                borderColor: item.rarity && rarityColors[item.rarity] ? rarityColors[item.rarity] + '44' : 'rgba(255,255,255,0.1)'
              }}
            >
              <div className="listing-image">
                <img src={item.imageUrl} alt={item.marketHashName} />
                <div className="listing-gradient" style={{
                  background: `radial-gradient(circle at top right, ${rarityColors[item.rarity] || '#b0c3d9'}22, transparent 70%)`
                }}></div>
              </div>
              <div className="listing-details">
                <h3>{item.marketHashName}</h3>
                <div className="listing-wear">{item.wear || 'Unknown Wear'}</div>
                
                {editingItem === item._id ? (
                  <div className="edit-price-form">
                    <div className="price-input-group">
                      <label>
                        USD Price:
                        <input 
                          type="number" 
                          value={newPrice} 
                          onChange={handleNewPriceChange} 
                          min="0.01" 
                          step="0.01"
                          placeholder="USD Price" 
                        />
                      </label>
                    </div>
                    <div className="price-input-group">
                      <label>
                        GEL Price:
                        <input 
                          type="number" 
                          value={newPriceGEL} 
                          onChange={(e) => setNewPriceGEL(e.target.value)} 
                          min="0.01" 
                          step="0.01"
                          placeholder="GEL Price (Optional)" 
                        />
                      </label>
                    </div>
                    <div className="edit-actions">
                      <button 
                        className="btn btn-save" 
                        onClick={() => updatePrice(item._id)}
                      >
                        Save
                      </button>
                      <button 
                        className="btn btn-cancel" 
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="listing-prices">
                    <div className="price price-usd">${item.price.toFixed(2)}</div>
                    {item.priceGEL && (
                      <div className="price price-gel">₾{parseFloat(item.priceGEL).toFixed(2)}</div>
                    )}
                  </div>
                )}
                
                {!editingItem && (
                  <div className="listing-actions">
                    <button 
                      className="btn btn-edit" 
                      onClick={() => startEditing(item)}
                    >
                      Change Price
                    </button>
                    <button 
                      className="btn btn-cancel-listing" 
                      onClick={() => handleCancelListing(item._id)}
                    >
                      Remove Listing
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-listings">
          <p>You don't have any active listings</p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/inventory')}
          >
            List Items from Inventory
          </button>
        </div>
      )}
    </div>
  );
}

export default MyListings;