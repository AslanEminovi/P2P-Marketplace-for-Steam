import React, { useState, useEffect } from 'react';
import lightPerformanceMonitor from '../utils/lightPerformanceMonitor';
import axios from 'axios';
import { Modal, Button, Alert, Spinner, Form } from 'react-bootstrap';
import { API_URL } from '../config/constants';

// Debounce function to prevent UI blocking
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const SellModal = ({ 
  show, 
  onHide, 
  item, 
  onConfirm, 
  currencyRate = 1.0, 
  defaultRate = null,
  isValid = true
}) => {
  const [price, setPrice] = useState('');
  const [showRateField, setShowRateField] = useState(false);
  const [customRate, setCustomRate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [error, setError] = useState('');

  // Initialize lightweight performance monitoring when modal opens
  useEffect(() => {
    if (show) {
      lightPerformanceMonitor.start();
    }
    return () => {
      lightPerformanceMonitor.stop();
    };
  }, [show]);

  // Set default price and rate
  useEffect(() => {
    if (item && item.pricelatest) {
      // Set approximate price based on latest price
      const initialPrice = ((parseFloat(item.pricelatest) / 100) * currencyRate).toFixed(2);
      setPrice(initialPrice);
    }
    
    if (defaultRate) {
      setCustomRate(defaultRate.toString());
    }
  }, [item, currencyRate, defaultRate]);

  // Calculate price in GEL
  const calculatePrice = () => {
    if (!price) return '';
    
    try {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice)) return '';
      
      return numericPrice.toFixed(2);
    } catch (e) {
      console.error('Price calculation error:', e);
      return '';
    }
  };

  // Handle closing the modal
  const handleClose = () => {
    setPrice('');
    setShowRateField(false);
    setCustomRate('');
    setIsSubmitting(false);
    setShowAuthPrompt(false);
    setError('');
    onHide();
  };

  // Force close modal for performance
  const forceCloseModal = () => {
    try {
      onHide();
    } catch (e) {
      console.error('Error in force close:', e);
    }
  };

  // Check if user is fully authenticated before proceeding with sell action
  const checkUserAuthentication = () => {
    const authToken = localStorage.getItem('authToken');
    const userFullyAuthenticated = localStorage.getItem('userFullyAuthenticated');
    
    if (!authToken || userFullyAuthenticated !== 'true') {
      console.log('User needs Steam authentication to sell items');
      setShowAuthPrompt(true);
      return false;
    }
    
    return true;
  };

  // Handle the sell submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!checkUserAuthentication()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Validate price
      const listingPrice = price ? parseFloat(price) : null;
      
      if (!listingPrice || isNaN(listingPrice) || listingPrice <= 0) {
        console.error('Invalid price value');
        setError('Please enter a valid price greater than 0');
        setIsSubmitting(false);
        return;
      }
      
      const listingData = {
        itemId: item.id,
        assetId: item.assetid,
        price: listingPrice,
        customRate: customRate ? parseFloat(customRate) : null
      };
      
      // Make API call to list item
      const response = await axios.post(`${API_URL}/marketplace/list`, listingData, {
        withCredentials: true
      });
      
      console.log('Item listed successfully:', response.data);
      
      // Close modal and refresh inventory
      if (onConfirm) {
        onConfirm(response.data);
      }
      
      handleClose();
    } catch (error) {
      console.error('Error listing item:', error);
      setError(error.response?.data?.message || 'Failed to list item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle price input changes with debouncing
  const handlePriceChange = debounce((e) => {
    setPrice(e.target.value);
  }, 300);

  // Add a Steam Auth Prompt component inside the modal
  const SteamAuthPrompt = () => {
    return (
      <div className="steam-auth-prompt text-center p-4">
        <h2 style={{color: '#ffffff', background: '#2563eb', padding: '0.5rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'inline-block'}}>
          Steam Authentication Required
        </h2>
        <p className="mb-4">To sell items, you need to authenticate with Steam.</p>
        <a 
          href={`${API_URL}/auth/steam`} 
          className="btn btn-primary btn-lg"
          style={{background: '#2563eb', borderColor: '#2563eb'}}
        >
          Sign in with Steam
        </a>
      </div>
    );
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{item ? 'List Item for Sale' : 'Loading...'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {showAuthPrompt ? (
          <SteamAuthPrompt />
        ) : (
          <div>
            {error && <Alert variant="danger">{error}</Alert>}
            
            {item ? (
              <div className="sell-modal-content">
                <div className="item-details d-flex mb-4">
                  <div className="item-image me-3">
                    <img src={item.image} alt={item.name} style={{ width: '120px', height: 'auto' }} />
                  </div>
                  <div className="item-info">
                    <h5>{item.name}</h5>
                    <p className="text-muted">{item.type} | {item.wear}</p>
                    <div className="badge bg-secondary">{item.rarity}</div>
                  </div>
                </div>
                
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Price (GEL)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={price}
                      onChange={handlePriceChange}
                      placeholder="Enter selling price in GEL"
                    />
                    <Form.Text className="text-muted">
                      Enter the price you want to sell this item for.
                    </Form.Text>
                  </Form.Group>
                  
                  {showRateField && (
                    <Form.Group className="mb-3">
                      <Form.Label>Custom Rate (optional)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        value={customRate}
                        onChange={(e) => setCustomRate(e.target.value)}
                        placeholder="Enter custom rate"
                      />
                      <Form.Text className="text-muted">
                        Leave empty to use the default rate.
                      </Form.Text>
                    </Form.Group>
                  )}
                  
                  <div className="advanced-options mb-3">
                    <Button 
                      variant="link" 
                      onClick={() => setShowRateField(!showRateField)}
                      className="p-0 text-decoration-none"
                    >
                      {showRateField ? 'Hide Advanced Options' : 'Show Advanced Options'}
                    </Button>
                  </div>
                </Form>
              </div>
            ) : (
              <div className="text-center">
                <Spinner animation="border" />
              </div>
            )}
          </div>
        )}
      </Modal.Body>
      {!showAuthPrompt && (
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting || !isValid}>
            {isSubmitting ? <Spinner size="sm" animation="border" /> : 'List Item'}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default SellModal;