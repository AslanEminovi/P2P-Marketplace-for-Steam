import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, API_URL } from '../config/constants';
import { Button, Spinner } from 'react-bootstrap';

// Status badge component
const StatusBadge = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return { bg: '#166534', text: '#4ade80' };
      case 'awaiting_seller':
        return { bg: '#1e40af', text: '#93c5fd' };
      case 'offer_sent':
        return { bg: '#854d0e', text: '#fde047' };
      case 'awaiting_confirmation':
        return { bg: '#9a3412', text: '#fdba74' };
      case 'cancelled':
      case 'failed':
        return { bg: '#7f1d1d', text: '#f87171' };
      default:
        return { bg: '#374151', text: '#e5e7eb' };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'awaiting_seller':
        return 'Purchase Offer Sent';
      case 'accepted':
        return 'Seller Accepted';
      case 'offer_sent':
        return 'Steam Offer Sent';
      case 'awaiting_confirmation':
        return 'Awaiting Confirmation';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'failed':
        return 'Failed';
      default:
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const colors = getStatusColor();
  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.875rem',
      fontWeight: '500',
      textTransform: 'uppercase'
    }}>
      {getStatusText()}
    </span>
  );
};

const TradeDetails = ({ tradeId }) => {
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [steamOfferUrl, setSteamOfferUrl] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [steamStatus, setSteamStatus] = useState(null);
  const [confirmForceOverride, setConfirmForceOverride] = useState(false);
  const [sellerConfirmation, setSellerConfirmation] = useState(false);
  const [inventoryCheckLoading, setInventoryCheckLoading] = useState(false);
  const [inventoryCheckResult, setInventoryCheckResult] = useState(null);
  const [canConfirmReceived, setCanConfirmReceived] = useState(false);
  const [tradeOffersUrl, setTradeOffersUrl] = useState('');
  const [sendingLoading, setSendingLoading] = useState(false);
  const [sellerWaitingForBuyer, setSellerWaitingForBuyer] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    if (tradeId) {
      loadTradeDetails();
    }
  }, [tradeId]);

  // Set up auto-refresh for trade details
  useEffect(() => {
    // Initial load
    loadTradeDetails();

    // Set up refresh interval (every 15 seconds)
    const refreshInterval = setInterval(() => {
      if (trade && !loading && 
          trade.status !== 'completed' && 
          trade.status !== 'cancelled' && 
          trade.status !== 'failed') {
        // Only auto-refresh for active trades
        console.log('Auto-refreshing trade details...');
        loadTradeDetails();
      }
    }, 15000);

    // Clean up the interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [tradeId]); // Only re-run if tradeId changes

  const loadTradeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/trades/${tradeId}`, {
        withCredentials: true
      });
      
      setTrade(response.data);
      console.log('Trade details loaded:', response.data);
      
      // Set UI states based on trade status
      if (response.data.status === 'offer_sent') {
        setSellerWaitingForBuyer(true);
      }
      
      // Check if current user is buyer or seller
      const currentUser = await axios.get(`${API_URL}/users/profile`, {
        withCredentials: true
      });
      
      const userId = currentUser.data._id;
      setIsBuyer(userId === response.data.buyer._id);
      setIsSeller(userId === response.data.seller._id);
      
      // Reset loading states based on status
      if (response.data.status === 'completed' || 
          response.data.status === 'cancelled' || 
          response.data.status === 'failed') {
        setCanConfirmReceived(false);
        setConfirmLoading(false);
        setSendingLoading(false);
        setApproveLoading(false);
      }
    } catch (err) {
      console.error('Error loading trade details:', err);
      setError('Failed to load trade details. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSellerApprove = async () => {
    try {
      setApproveLoading(true);
      
      console.log(`Seller approving trade ${tradeId}`);
      const response = await axios.put(`${API_URL}/trades/${tradeId}/seller-approve`, {}, {
        withCredentials: true
      });
      
      console.log('Seller approve response:', response.data);
      
      if (window.showNotification) {
        window.showNotification(
          'Trade Approved',
          'You have approved this trade. Please send the trade offer to the buyer.',
          'SUCCESS'
        );
      }
      
      // Immediately update the UI without requiring refresh
      setTrade(prevTrade => ({
        ...prevTrade,
        status: 'accepted',
        statusHistory: [
          ...prevTrade.statusHistory || [],
          { status: 'accepted', timestamp: new Date().toISOString() }
        ]
      }));
      
      // Refresh the trade details to get the latest status
      await loadTradeDetails();
    } catch (err) {
      console.error('Error approving trade:', err);
      setError(err.response?.data?.error || 'Failed to approve trade');
      
      if (window.showNotification) {
        window.showNotification(
          'Error',
          err.response?.data?.error || 'Failed to approve trade',
          'ERROR'
        );
      }
    } finally {
      setApproveLoading(false);
    }
  };

  const handleSellerConfirmSent = async () => {
    try {
      setSendingLoading(true);
      
      console.log(`Seller confirming trade ${tradeId} as sent`);
      const response = await axios.put(`${API_URL}/trades/${tradeId}/seller-sent`, {}, {
        withCredentials: true
      });
      
      console.log('Seller sent response:', response.data);
      
      if (window.showNotification) {
        window.showNotification(
          'Offer Sent',
          'You have marked this trade as sent. The buyer has been notified.',
          'SUCCESS'
        );
      }
      
      // Immediately update the UI without requiring refresh
      setTrade(prevTrade => ({
        ...prevTrade,
        status: 'offer_sent',
        statusHistory: [
          ...prevTrade.statusHistory || [],
          { status: 'offer_sent', timestamp: new Date().toISOString() }
        ]
      }));
      
      // Show "Waiting for buyer" message
      setSellerWaitingForBuyer(true);
      
      // Refresh the trade details to get the latest status
      await loadTradeDetails();
    } catch (err) {
      console.error('Error marking trade as sent:', err);
      if (window.showNotification) {
        window.showNotification(
          'Error',
          err.response?.data?.error || 'Failed to mark trade as sent',
          'ERROR'
        );
      }
    } finally {
      setSendingLoading(false);
    }
  };

  const handleBuyerConfirm = async () => {
    try {
      setConfirmLoading(true);
      setError(null);

      console.log(`Buyer confirming receipt for trade ${tradeId}`);
      const response = await axios.put(`${API_URL}/trades/${tradeId}/buyer-confirm`, {}, {
        withCredentials: true
      });

      console.log('Buyer confirm response:', response.data);
      
      if (window.showNotification) {
        window.showNotification(
          'Success',
          'You have confirmed receipt of the item!',
          'SUCCESS'
        );
      }
      
      // Immediately update the UI without requiring refresh
      setTrade(prevTrade => ({
        ...prevTrade,
        status: 'completed',
        completedAt: new Date().toISOString(),
        statusHistory: [
          ...prevTrade.statusHistory || [],
          { status: 'completed', timestamp: new Date().toISOString() }
        ]
      }));
      
      // Refresh the trade details to get the latest status
      await loadTradeDetails();
    } catch (err) {
      console.error('Error confirming receipt:', err);
      setError(err.response?.data?.error || 'Failed to confirm receipt');
      
      // If the error contains a tradeOffersLink, set it
      if (err.response?.data?.tradeOffersLink) {
        setTradeOffersUrl(err.response.data.tradeOffersLink);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCheckInventory = async () => {
    setInventoryCheckLoading(true);
    setError(null);
    try {
      console.log(`Checking inventory status for trade ${tradeId}...`);
      const response = await axios.get(`${API_URL}/trades/${tradeId}/verify-inventory`, {
        withCredentials: true
      });
      
      console.log('Inventory check response:', response.data);
      setInventoryCheckResult(response.data);
      
      if (response.data.canConfirmReceived) {
        // Enable confirm button if item is no longer in seller's inventory
        setCanConfirmReceived(true);
        // Display a positive message
        if (window.showNotification) {
          window.showNotification(
            'Verification Complete',
            'Item has been withdrawn from seller\'s inventory. You can now confirm receipt.',
            'SUCCESS'
          );
        }
      } else {
        setCanConfirmReceived(false);
        
        if (response.data.error) {
          setError('Error checking seller\'s inventory: ' + response.data.error);
          // Show link to trade offers
          setTradeOffersUrl(response.data.tradeOffersLink);
          
          if (window.showNotification) {
            window.showNotification(
              'Verification Error',
              'Please check your Steam trade offers manually.',
              'WARNING'
            );
          }
        } else if (!response.data.itemRemovedFromSellerInventory) {
          setError('The item is still in seller\'s inventory. The trade offer hasn\'t been sent yet or you haven\'t accepted it.');
          // Show link to trade offers
          setTradeOffersUrl(response.data.tradeOffersLink);
          
          if (window.showNotification) {
            window.showNotification(
              'Trade Not Complete',
              'Check your Steam trade offers or contact the seller.',
              'WARNING'
            );
          }
        } else {
          setError(response.data.message || 'Verification failed. Please try again later.');
          // Show link to trade offers if available
          if (response.data.tradeOffersLink) {
            setTradeOffersUrl(response.data.tradeOffersLink);
          }
        }
      }
    } catch (err) {
      console.error('Error checking inventory:', err);
      setInventoryCheckResult(null);
      setError(err.response?.data?.error || 'Failed to check inventory status');
      setCanConfirmReceived(false);
    } finally {
      setInventoryCheckLoading(false);
    }
  };

  const handleCheckSteamStatus = async () => {
    setIsVerifying(true);
    setSteamStatus(null);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/trades/${tradeId}/check-steam-status`, {
        withCredentials: true
      });
      
      setSteamStatus(response.data);
      
      // If the trade status has changed, refresh the whole trade
      if (response.data.status === 'accepted' && trade.status !== 'completed') {
        loadTradeDetails();
      }
    } catch (err) {
      console.error('Error checking Steam status:', err);
      setError(err.response?.data?.error || 'Failed to check Steam trade status');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelTrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_URL}/trades/${tradeId}/cancel`, {
        reason: cancelReason
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setCancelReason('');
        loadTradeDetails();
      }
    } catch (err) {
      console.error('Error cancelling trade:', err);
      setError(err.response?.data?.error || 'Failed to cancel trade');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !trade) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderRadius: '50%',
          borderTopColor: '#4ade80',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  if (error && !trade) {
    return (
      <div style={{
        backgroundColor: '#7f1d1d',
        color: '#f87171',
        padding: '16px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!trade) {
    return (
      <div style={{
        backgroundColor: '#1f2937',
        padding: '16px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <p>No trade found with ID: {tradeId}</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      padding: '20px',
      maxWidth: '1000px',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#f1f1f1', margin: '0' }}>Trade #{trade._id.substring(0, 8)}</h2>
        <StatusBadge status={trade.status} />
      </div>

      {error && (
        <div style={{
          backgroundColor: '#7f1d1d',
          color: '#f87171',
          padding: '10px 16px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Show inventory check results */}
      {error && (
        <div className="alert alert-warning mt-3">
          <p>{error}</p>
          {tradeOffersUrl && (
            <p>
              <a href={tradeOffersUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
                <i className="fas fa-external-link-alt mr-1"></i> Check Your Steam Trade Offers
              </a>
            </p>
          )}
        </div>
      )}

      {/* Trade Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Left column: Item details */}
        <div style={{
          backgroundColor: '#111827',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ color: '#f1f1f1', marginTop: '0' }}>Item</h3>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <img
              src={trade.item.imageUrl || 'https://via.placeholder.com/120'}
              alt={trade.item.marketHashName}
              style={{
                width: '120px',
                height: '90px',
                objectFit: 'contain',
                borderRadius: '4px',
                marginRight: '16px'
              }}
            />
            <div>
              <h4 style={{ color: '#f1f1f1', margin: '0 0 8px 0' }}>{trade.item.marketHashName}</h4>
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                {trade.item.wear && <span>{trade.item.wear} | </span>}
                {trade.item.rarity && <span style={{ color: getRarityColor(trade.item.rarity) }}>{trade.item.rarity}</span>}
              </div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1.125rem' }}>
                  {formatCurrency(trade.price, trade.currency)}
                </span>
              </div>
            </div>
          </div>
          
          <h4 style={{ color: '#f1f1f1', margin: '16px 0 8px 0' }}>Steam Trade Details</h4>
          <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            <div>Asset ID: {trade.assetId || 'N/A'}</div>
            {trade.tradeOfferId && (
              <div style={{ marginTop: '8px' }}>
                Trade Offer ID: {trade.tradeOfferId}
                <a
                  href={`https://steamcommunity.com/tradeoffer/${trade.tradeOfferId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#3b82f6',
                    marginLeft: '8px',
                    textDecoration: 'none'
                  }}
                >
                  View on Steam
                </a>
              </div>
            )}
          </div>
          
          {steamStatus && (
            <div style={{
              backgroundColor: '#0c4a6e',
              color: '#bae6fd',
              padding: '10px',
              borderRadius: '4px',
              marginTop: '16px',
              fontSize: '0.875rem'
            }}>
              <div>Steam Status: <strong>{steamStatus.status}</strong></div>
              <div style={{ marginTop: '4px' }}>{steamStatus.message}</div>
            </div>
          )}
        </div>
        
        {/* Right column: User details and actions */}
        <div style={{
          backgroundColor: '#111827',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ color: '#f1f1f1', margin: '0 0 8px 0' }}>Seller</h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src={trade.seller.avatar || 'https://via.placeholder.com/40'}
                  alt={trade.seller.displayName}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    marginRight: '8px'
                  }}
                />
                <div>
                  <div style={{ color: '#f1f1f1' }}>{trade.seller.displayName}</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Steam ID: {trade.sellerSteamId}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 style={{ color: '#f1f1f1', margin: '0 0 8px 0' }}>Buyer</h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src={trade.buyer.avatar || 'https://via.placeholder.com/40'}
                  alt={trade.buyer.displayName}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    marginRight: '8px'
                  }}
                />
                <div>
                  <div style={{ color: '#f1f1f1' }}>{trade.buyer.displayName}</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Steam ID: {trade.buyerSteamId}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ color: '#f1f1f1', margin: '0 0 16px 0' }}>Trade Timeline</h3>
            <div style={{ maxHeight: '150px', overflowY: 'auto', color: '#9ca3af', fontSize: '0.875rem' }}>
              {trade.statusHistory && trade.statusHistory.map((history, index) => (
                <div key={index} style={{
                  display: 'flex',
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderRadius: '4px'
                }}>
                  <div style={{ minWidth: '120px' }}>
                    {new Date(history.timestamp).toLocaleString()}
                  </div>
                  <div style={{ flex: '1', marginLeft: '8px' }}>
                    <StatusBadge status={history.status} /> 
                    {history.note && <span style={{ marginLeft: '8px' }}>{history.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Action buttons based on user role and trade status */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ color: '#f1f1f1', margin: '0 0 16px 0' }}>Actions</h3>

            {/* Seller actions */}
            {trade.isUserSeller && (
              <div>
                {trade.status === 'awaiting_seller' && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      A buyer wants to purchase your item. You need to send them a trade offer.
                    </p>
                    <button
                      onClick={handleSellerApprove}
                      disabled={approveLoading}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: '#f1f1f1',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        cursor: approveLoading ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        width: '100%',
                        opacity: approveLoading ? '0.7' : '1'
                      }}
                    >
                      {approveLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : 'Accept Purchase Offer'}
                    </button>
                  </div>
                )}

                {trade.status === 'accepted' && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '12px' }}>
                      Please send a trade offer to the buyer using their trade link:
                    </p>
                    
                    <div style={{
                      backgroundColor: '#1f2937',
                      padding: '10px',
                      borderRadius: '4px',
                      marginBottom: '12px',
                      wordBreak: 'break-all',
                      fontSize: '0.875rem',
                      color: '#e5e7eb'
                    }}>
                      <a 
                        href={trade.buyer.tradeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                      >
                        {trade.buyer.tradeUrl}
                      </a>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '8px' }}>
                        Trade Offer ID/URL (optional):
                      </label>
                      <input
                        type="text"
                        value={steamOfferUrl}
                        onChange={(e) => setSteamOfferUrl(e.target.value)}
                        placeholder="Enter Steam trade offer ID or URL"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '4px',
                          color: '#f1f1f1',
                          marginBottom: '8px'
                        }}
                      />
                      <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0' }}>
                        This helps us track the trade (the buyer will see this)
                      </p>
                    </div>
                    
                    <button
                      onClick={handleSellerConfirmSent}
                      disabled={sendingLoading || sellerWaitingForBuyer}
                      style={{
                        backgroundColor: sellerWaitingForBuyer ? '#10b981' : '#3b82f6',
                        color: '#f1f1f1',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        cursor: sendingLoading || sellerWaitingForBuyer ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        width: '100%',
                        opacity: sendingLoading ? '0.7' : '1'
                      }}
                    >
                      {sendingLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                          Sending...
                        </>
                      ) : sellerWaitingForBuyer ? 'Waiting for buyer...' : 'I\'ve Sent the Trade Offer'}
                    </button>
                  </div>
                )}

                {(['awaiting_seller', 'accepted'].includes(trade.status)) && (
                  <button
                    onClick={() => {
                      const modal = document.getElementById('cancelModal');
                      if (modal) modal.style.display = 'block';
                    }}
                    style={{
                      backgroundColor: '#7f1d1d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                      fontWeight: 'bold'
                    }}
                  >
                    Cancel Trade
                  </button>
                )}
              </div>
            )}

            {/* Buyer actions */}
            {trade.isUserBuyer && (
              <div>
                {trade.status === 'offer_sent' && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      backgroundColor: '#1e40af',
                      color: '#93c5fd',
                      padding: '12px',
                      borderRadius: '4px',
                      marginBottom: '16px'
                    }}>
                      <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>
                        Seller has sent you a trade offer
                      </p>
                      <p style={{ margin: '0', fontSize: '0.875rem' }}>
                        Please check your Steam trade offers and accept the offer before confirming below.
                      </p>
                      {trade.tradeOfferId && (
                        <a
                          href={`https://steamcommunity.com/tradeoffer/${trade.tradeOfferId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: '8px',
                            color: '#3b82f6',
                            textDecoration: 'none',
                            backgroundColor: '#1f2937',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '0.875rem'
                          }}
                        >
                          View Trade Offer
                        </a>
                      )}
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <Button
                        onClick={handleCheckInventory}
                        disabled={inventoryCheckLoading}
                        variant="info"
                      >
                        {inventoryCheckLoading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="mr-2"
                            />
                            Checking...
                          </>
                        ) : (
                          "Check If Item Received"
                        )}
                      </Button>
                      
                      {inventoryCheckResult && (
                        <div style={{
                          backgroundColor: inventoryCheckResult.canConfirmReceived ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: inventoryCheckResult.canConfirmReceived ? '#10b981' : '#ef4444',
                          padding: '12px',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          marginBottom: '12px'
                        }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>
                            {inventoryCheckResult.message}
                          </p>
                          
                          <div style={{ fontSize: '0.8rem', opacity: '0.9' }}>
                            {inventoryCheckResult.itemRemovedFromSellerInventory && (
                              <p style={{ margin: '2px 0', color: '#10b981' }}>
                                ✓ Asset ID {inventoryCheckResult.assetId} has been withdrawn from seller's inventory
                              </p>
                            )}
                            {!inventoryCheckResult.itemRemovedFromSellerInventory && !inventoryCheckResult.error && (
                              <p style={{ margin: '2px 0', color: '#ef4444' }}>
                                ✗ Asset ID {inventoryCheckResult.assetId} is still in seller's inventory
                              </p>
                            )}
                            {inventoryCheckResult.error && (
                              <p style={{ margin: '2px 0', color: '#f59e0b' }}>
                                ! Could not verify seller's inventory: {inventoryCheckResult.error}
                              </p>
                            )}
                          </div>
                          
                          {!inventoryCheckResult.canConfirmReceived && (
                            <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                              <p style={{ margin: '0', color: '#64748b' }}>
                                This check verifies if the specific item (Asset ID: {inventoryCheckResult.assetId}) 
                                has left the seller's inventory. Please check your Steam trade offers.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {confirmForceOverride && (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{
                          color: '#f1f1f1',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}>
                          <input
                            type="checkbox"
                            checked={confirmForceOverride}
                            onChange={(e) => setConfirmForceOverride(e.target.checked)}
                            style={{ marginRight: '8px' }}
                          />
                          Force confirm (use this if verification fails but you received the item)
                        </label>
                      </div>
                    )}
                    
                    <button
                      onClick={handleBuyerConfirm}
                      disabled={confirmLoading || !canConfirmReceived}
                      style={{
                        backgroundColor: canConfirmReceived ? '#10b981' : '#9ca3af',
                        color: '#f1f1f1',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        cursor: confirmLoading || !canConfirmReceived ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        width: '100%',
                        opacity: confirmLoading ? '0.7' : '1'
                      }}
                    >
                      {confirmLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : 'Confirm Item Received'}
                    </button>
                  </div>
                )}

                {trade.status === 'awaiting_seller' && (
                  <button
                    onClick={() => {
                      const modal = document.getElementById('cancelModal');
                      if (modal) modal.style.display = 'block';
                    }}
                    style={{
                      backgroundColor: '#7f1d1d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                      fontWeight: 'bold'
                    }}
                  >
                    Cancel Trade
                  </button>
                )}
              </div>
            )}

            {/* Trade completed message */}
            {trade.status === 'completed' && (
              <div style={{
                backgroundColor: '#064e3b',
                color: '#a7f3d0',
                padding: '12px',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0', fontWeight: 'bold' }}>
                  Trade completed successfully
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem' }}>
                  Completed on {new Date(trade.completedAt).toLocaleString()}
                </p>
              </div>
            )}

            {/* Trade cancelled message */}
            {trade.status === 'cancelled' && (
              <div style={{
                backgroundColor: '#7f1d1d',
                color: '#fca5a5',
                padding: '12px',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0', fontWeight: 'bold' }}>
                  Trade was cancelled
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem' }}>
                  {trade.statusHistory.find(h => h.status === 'cancelled')?.note || 'No reason provided'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <div id="cancelModal" style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target.id === 'cancelModal') {
          e.target.style.display = 'none';
        }
      }}>
        <div style={{
          backgroundColor: '#1f2937',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%'
        }}
        onClick={(e) => e.stopPropagation()}>
          <h3 style={{ color: '#f1f1f1', marginTop: '0' }}>Cancel Trade</h3>
          <p style={{ color: '#d1d5db' }}>
            Are you sure you want to cancel this trade? This action cannot be undone.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="cancelReason" 
              style={{ 
                display: 'block', 
                color: '#d1d5db', 
                marginBottom: '8px' 
              }}
            >
              Reason for cancellation (optional):
            </label>
            <textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Explain why you're cancelling this trade..."
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                color: '#f1f1f1',
                minHeight: '80px'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => {
                const modal = document.getElementById('cancelModal');
                if (modal) modal.style.display = 'none';
              }}
              style={{
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                width: '48%'
              }}
            >
              Go Back
            </button>
            <button
              onClick={() => {
                handleCancelTrade();
                const modal = document.getElementById('cancelModal');
                if (modal) modal.style.display = 'none';
              }}
              disabled={loading}
              style={{
                backgroundColor: '#7f1d1d',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                width: '48%'
              }}
            >
              {loading ? 'Processing...' : 'Yes, Cancel Trade'}
            </button>
          </div>
        </div>
      </div>

      {/* Cancel reason form (hidden by default) */}
      <div id="cancel-reason" style={{ display: 'none', marginTop: '20px' }}>
        <h3 style={{ color: '#f1f1f1' }}>Cancel Trade</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Please provide a reason for cancelling this trade:
        </p>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '4px',
            color: '#f1f1f1',
            marginBottom: '16px',
            minHeight: '100px',
            resize: 'vertical'
          }}
          placeholder="Enter cancellation reason..."
        />
        <div>
          <button
            onClick={handleCancelTrade}
            disabled={loading || !cancelReason}
            style={{
              backgroundColor: '#ef4444',
              color: '#f1f1f1',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '4px',
              cursor: loading || !cancelReason ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              marginRight: '8px',
              opacity: loading || !cancelReason ? '0.7' : '1'
            }}
          >
            {loading ? 'Processing...' : 'Confirm Cancellation'}
          </button>
          <button
            onClick={() => document.getElementById('cancel-reason').style.display = 'none'}
            style={{
              backgroundColor: 'transparent',
              color: '#9ca3af',
              border: '1px solid #4b5563',
              padding: '10px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Back
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          #cancelModal {
            display: none;
          }
        `}
      </style>
    </div>
  );
};

// Helper function to determine rarity color
const getRarityColor = (rarity) => {
  const rarityColors = {
    'Consumer Grade': '#b0c3d9',
    'Industrial Grade': '#5e98d9',
    'Mil-Spec Grade': '#4b69ff',
    'Restricted': '#8847ff',
    'Classified': '#d32ee6',
    'Covert': '#eb4b4b',
    'Contraband': '#e4ae39',
    '★': '#e4ae39'  // For knives
  };
  
  return rarityColors[rarity] || '#b0c3d9';
};

export default TradeDetails;