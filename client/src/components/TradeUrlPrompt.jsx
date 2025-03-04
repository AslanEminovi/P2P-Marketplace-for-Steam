import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { API_URL } from '../config/constants';

const TradeUrlPrompt = ({ onClose, onSuccess }) => {
  const [tradeUrl, setTradeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('form'); // form, info, success
  
  const isValidUrl = (url) => {
    // Basic pattern for Steam trade URLs
    return /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+$/.test(url);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate URL format
    if (!isValidUrl(tradeUrl)) {
      setError('Please enter a valid Steam trade URL');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await axios.post(`${API_URL}/user/settings/trade-url`, 
        { tradeUrl },
        { withCredentials: true }
      );
      
      // Call the success callback with the trade URL
      if (onSuccess) {
        onSuccess(tradeUrl);
      }
      
      setStep('success');
    } catch (err) {
      console.error('Error saving trade URL:', err);
      setError(err.response?.data?.error || 'Failed to save trade URL');
    } finally {
      setLoading(false);
    }
  };
  
  const showInfo = () => {
    setStep('info');
  };
  
  const goBack = () => {
    setStep('form');
  };
  
  return (
    <div>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#f1f1f1'
            }}>
              {step === 'info' ? 'How to Find Your Trade URL' : 
               step === 'success' ? 'Trade URL Saved' : 
               'Set Your Steam Trade URL'}
            </h2>
            
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s, color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#f1f1f1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div style={{ padding: '24px' }}>
            {step === 'form' && (
              <>
                <p style={{ color: '#cbd5e1', marginTop: 0, lineHeight: 1.6 }}>
                  To buy and sell CS2 items on our marketplace, you need to set your Steam Trade URL. 
                  This allows other users to send you trade offers.
                </p>
                
                {error && (
                  <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#f87171',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.95rem'
                  }}>
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '20px' }}>
                    <label 
                      htmlFor="tradeUrl"
                      style={{
                        display: 'block',
                        color: '#e2e8f0',
                        marginBottom: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '500'
                      }}
                    >
                      Your Steam Trade URL
                    </label>
                    
                    <input
                      id="tradeUrl"
                      type="text"
                      value={tradeUrl}
                      onChange={(e) => setTradeUrl(e.target.value)}
                      placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f1f1f1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4ade80'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                    
                    <p style={{ 
                      color: '#94a3b8', 
                      marginTop: '8px', 
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      Don't know how to find your Trade URL? 
                      <button
                        type="button"
                        onClick={showInfo}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#4ade80',
                          padding: 0,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Click here for help
                      </button>
                    </p>
                  </div>
                  
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    marginTop: '24px' 
                  }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#cbd5e1',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      disabled={loading || !tradeUrl.trim()}
                      style={{
                        backgroundColor: (loading || !tradeUrl.trim()) ? 'rgba(74, 222, 128, 0.3)' : 'rgba(74, 222, 128, 0.9)',
                        color: '#0f172a',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: (loading || !tradeUrl.trim()) ? 'not-allowed' : 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (!loading && tradeUrl.trim()) {
                          e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 1)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!loading && tradeUrl.trim()) {
                          e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.9)';
                        }
                      }}
                    >
                      {loading ? (
                        <>
                          <div 
                            className="spinner"
                            style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid rgba(15, 23, 42, 0.3)',
                              borderTop: '2px solid #0f172a',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}
                          />
                          Saving...
                        </>
                      ) : (
                        <>
                          Save Trade URL
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
            
            {step === 'info' && (
              <>
                <div style={{
                  backgroundColor: 'rgba(74, 222, 128, 0.05)',
                  border: '1px solid rgba(74, 222, 128, 0.2)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ 
                    color: '#4ade80',
                    margin: '0 0 10px 0',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4M12 8h.01"></path>
                    </svg>
                    Getting your Trade URL
                  </h3>
                  
                  <ol style={{ 
                    color: '#cbd5e1',
                    padding: '0 0 0 20px',
                    margin: 0,
                    lineHeight: 1.6,
                    fontSize: '0.95rem'
                  }}>
                    <li>Log in to your Steam account in your web browser</li>
                    <li>Go to your <strong>Steam Profile</strong></li>
                    <li>Click on <strong>Inventory</strong> in the top menu</li>
                    <li>Click on <strong>Trade Offers</strong> in the right sidebar</li>
                    <li>Click on <strong>Who can send me Trade Offers?</strong></li>
                    <li>Under <strong>Third-Party Sites</strong>, you'll find your Trade URL</li>
                    <li>Click <strong>Copy</strong> and paste it here</li>
                  </ol>
                </div>
                
                <p style={{ 
                  color: '#94a3b8', 
                  fontSize: '0.9rem', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: '20px 0 0 0'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
                  </svg>
                  <button
                    onClick={goBack}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#4ade80',
                      padding: 0,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Go back to Trade URL form
                  </button>
                </p>
                
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                  <a 
                    href="https://steamcommunity.com/my/tradeoffers/privacy" 
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.9)',
                      color: '#f1f1f1',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '500',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.9)'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Open Steam Trade Offers Settings
                  </a>
                </div>
              </>
            )}
            
            {step === 'success' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(74, 222, 128, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                
                <h3 style={{ 
                  color: '#f1f1f1',
                  fontSize: '1.25rem',
                  margin: '0 0 10px 0'
                }}>
                  Trade URL Successfully Saved
                </h3>
                
                <p style={{ color: '#cbd5e1', marginBottom: '30px' }}>
                  You can now buy and sell items on our marketplace.
                </p>
                
                <button
                  onClick={onClose}
                  style={{
                    backgroundColor: 'rgba(74, 222, 128, 0.9)',
                    color: '#0f172a',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 1)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.9)'}
                >
                  Continue to Marketplace
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

TradeUrlPrompt.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};

export default TradeUrlPrompt; 