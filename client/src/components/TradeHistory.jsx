import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency, API_URL } from '../config/constants';

const TradeHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed', 'cancelled'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'sent', 'received'

  useEffect(() => {
    console.log('TradeHistory component mounted');
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching trades from API...');
      const response = await axios.get(`${API_URL}/trades/history`, {
        withCredentials: true
      });
      
      if (!response || !response.data) {
        console.error('Empty response from server');
        setTrades([]);
        setError('No data received from server');
        return;
      }
      
      // Log the response for debugging
      console.log('Trade History API Response:', response.data);
      
      // Handle non-array responses
      if (!Array.isArray(response.data)) {
        console.error('Expected array but got:', typeof response.data);
        setTrades([]);
        setError('Received invalid data format from server');
        return;
      }
      
      // Add safety defaults for missing fields that might cause rendering errors
      const safeData = response.data.map(trade => ({
        ...trade,
        // Ensure these fields exist to prevent rendering errors
        _id: trade._id || `temp-${Math.random()}`,
        status: trade.status || 'unknown',
        isUserBuyer: !!trade.isUserBuyer,
        isUserSeller: !!trade.isUserSeller,
        item: trade.item || { 
          marketHashName: 'Unknown Item',
          imageUrl: null
        },
        seller: trade.seller || { 
          displayName: 'Unknown Seller',
          avatar: null
        },
        buyer: trade.buyer || {
          displayName: 'Unknown Buyer',
          avatar: null
        },
        price: trade.price || 0
      }));
      
      setTrades(safeData);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setTrades([]);
      setError(err.response?.data?.error || 'Failed to load trade history');
    } finally {
      setLoading(false);
    }
  };

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
        case 'completed': return 'Completed';
        case 'awaiting_seller': return 'Awaiting Seller';
        case 'offer_sent': return 'Offer Sent';
        case 'awaiting_confirmation': return 'Awaiting Confirmation';
        case 'cancelled': return 'Cancelled';
        case 'failed': return 'Failed';
        case 'pending': return 'Pending';
        default: return status || 'Unknown';
      }
    };

    const colors = getStatusColor();
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: '8px',
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: '0.875rem',
        fontWeight: '500'
      }}>
        {getStatusText()}
      </span>
    );
  };

  const getFilteredTrades = () => {
    if (!Array.isArray(trades)) {
      console.error('Trades is not an array:', trades);
      return [];
    }
    
    try {
      let filtered = [...trades]; // Make a copy to avoid mutations
      
      // First filter by role (buyer/seller)
      if (roleFilter === 'sent') {
        filtered = filtered.filter(trade => trade && trade.isUserBuyer);
      } else if (roleFilter === 'received') {
        filtered = filtered.filter(trade => trade && trade.isUserSeller);
      }
      
      // Then filter by status
      if (filter === 'all') return filtered;
      if (filter === 'active') {
        return filtered.filter(trade => trade && trade.status && 
          ['awaiting_seller', 'offer_sent', 'awaiting_confirmation', 'created', 'pending'].includes(trade.status));
      }
      if (filter === 'completed') {
        return filtered.filter(trade => trade && trade.status === 'completed');
      }
      if (filter === 'cancelled') {
        return filtered.filter(trade => trade && trade.status && 
          ['cancelled', 'failed'].includes(trade.status));
      }
      return filtered;
    } catch (err) {
      console.error('Error filtering trades:', err);
      return [];
    }
  };

  // Get filtered trades
  const filteredTrades = getFilteredTrades();

  // Safe row rendering function
  const renderTradeRow = (trade, index) => {
    try {
      if (!trade) return null;
      return (
        <tr key={trade._id || index}>
          <td style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img 
                src={trade.item?.imageUrl || 'https://via.placeholder.com/50'} 
                alt={trade.item?.marketHashName || 'Unknown Item'}
                style={{
                  width: '50px',
                  height: '50px',
                  objectFit: 'contain',
                  marginRight: '12px',
                  borderRadius: '4px'
                }}
              />
              <div>
                <div style={{ color: '#f1f1f1', fontWeight: '500' }}>
                  {trade.item?.marketHashName || 'Unknown Item'}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                  {trade.item?.wear} {trade.assetId && `| ${trade.assetId.substring(0, 8)}...`}
                </div>
              </div>
            </div>
          </td>
          <td style={{ padding: '12px 16px' }}>
            <div style={{ color: '#f1f1f1' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                margin: '4px 0',
                color: trade.isUserBuyer ? '#f1f1f1' : '#4ade80'
              }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '60px',
                  color: '#9ca3af',
                  fontSize: '0.75rem'
                }}>
                  Seller:
                </span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img 
                    src={trade.seller?.avatar || 'https://via.placeholder.com/20'}
                    alt={trade.seller?.displayName || 'Unknown'}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      marginRight: '6px'
                    }}
                  />
                  {trade.seller?.displayName || 'Unknown'}
                </div>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                margin: '4px 0',
                color: trade.isUserBuyer ? '#4ade80' : '#f1f1f1'
              }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '60px',
                  color: '#9ca3af',
                  fontSize: '0.75rem'
                }}>
                  Buyer:
                </span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img 
                    src={trade.buyer?.avatar || 'https://via.placeholder.com/20'}
                    alt={trade.buyer?.displayName || 'Unknown'}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      marginRight: '6px'
                    }}
                  />
                  {trade.buyer?.displayName || 'Unknown'}
                </div>
              </div>
            </div>
          </td>
          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
            <div style={{ color: '#4ade80', fontWeight: '500' }}>
              ${(trade.price || 0).toFixed(2)}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
              {new Date(trade.createdAt).toLocaleDateString()}
            </div>
          </td>
          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
            <StatusBadge status={trade.status} />
          </td>
          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
            <Link
              to={`/trades/${trade._id}`}
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#93c5fd',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(59, 130, 246, 0.2)';
              }}
            >
              View Details
            </Link>
          </td>
        </tr>
      );
    } catch (err) {
      console.error(`Error rendering trade row:`, err);
      return null;
    }
  };

  // Main render
  return (
    <div style={{
      width: '100%',
      padding: '20px 10px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        padding: '25px',
        marginBottom: '20px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h1 style={{ 
          color: '#f1f1f1', 
          margin: '0', 
          fontSize: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Trade History
        </h1>
        
        <div className="filter-container" style={{ 
          display: 'flex', 
          gap: '16px',
          background: 'rgba(45, 27, 105, 0.5)',
          padding: '8px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginTop: '16px'
        }}>
          <div className="filter-group">
            <span style={{ color: '#e5e7eb', marginRight: '10px' }}>Status:</span>
            <div className="filter-buttons" style={{
              display: 'inline-flex',
              backgroundColor: '#1f2937',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setFilter('all')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: filter === 'all' ? '#3b82f6' : 'transparent',
                  color: filter === 'all' ? 'white' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: filter === 'active' ? '#3b82f6' : 'transparent',
                  color: filter === 'active' ? 'white' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('completed')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: filter === 'completed' ? '#3b82f6' : 'transparent',
                  color: filter === 'completed' ? 'white' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Completed
              </button>
              <button
                onClick={() => setFilter('cancelled')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: filter === 'cancelled' ? '#3b82f6' : 'transparent',
                  color: filter === 'cancelled' ? 'white' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancelled
              </button>
            </div>
          </div>
          
          <div className="filter-group">
            <span style={{ color: '#e5e7eb', marginRight: '10px' }}>Role:</span>
            <div className="filter-buttons" style={{
              display: 'inline-flex',
              backgroundColor: '#1f2937',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setRoleFilter('all')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: roleFilter === 'all' ? '#3b82f6' : 'transparent',
                  color: roleFilter === 'all' ? 'white' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              <button
                onClick={() => setRoleFilter('sent')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: roleFilter === 'sent' ? '#3b82f6' : 'transparent',
                  color: roleFilter === 'sent' ? 'white' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Sent Offers
              </button>
              <button
                onClick={() => setRoleFilter('received')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: roleFilter === 'received' ? '#3b82f6' : 'transparent',
                  color: roleFilter === 'received' ? 'white' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Received Offers
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '60px 0',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div 
            className="spinner"
            style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              borderTopColor: '#4ade80',
              borderRightColor: 'rgba(139, 92, 246, 0.5)',
              animation: 'spin 1.5s linear infinite'
            }}
          />
          <p
            style={{ 
              color: '#e2e8f0', 
              fontSize: '1.2rem',
              fontWeight: '500'
            }}
          >
            Loading trade history...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div 
          style={{
            backgroundColor: 'rgba(220, 38, 38, 0.2)',
            color: '#f87171',
            padding: '20px',
            borderRadius: '16px',
            margin: '30px 0',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '10px', 
              marginBottom: '10px'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Error Loading Trades</h3>
          </div>
          <p style={{ marginBottom: 0 }}>
            {error}
          </p>
          <button 
            onClick={fetchTrades}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: 'rgba(59, 130, 246, 0.5)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredTrades.length === 0 && (
        <div style={{
          background: 'rgba(45, 27, 105, 0.3)',
          color: '#f1f1f1',
          padding: '60px 40px',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
            No trades found
          </h2>
          <p style={{ color: '#d1d5db', maxWidth: '600px', margin: '0 auto' }}>
            {filter !== 'all' || roleFilter !== 'all' 
              ? 'Try changing your filters to see more trades.'
              : "You don't have any trade history yet. Start trading to see your history here!"}
          </p>
        </div>
      )}

      {/* Trade list */}
      {!loading && !error && filteredTrades.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(31, 41, 55, 0.8)',
          borderRadius: '16px',
          padding: '25px',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr>
                <th style={{
                  color: '#9ca3af',
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderBottom: '1px solid #374151'
                }}>
                  Item
                </th>
                <th style={{
                  color: '#9ca3af',
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderBottom: '1px solid #374151'
                }}>
                  Participants
                </th>
                <th style={{
                  color: '#9ca3af',
                  textAlign: 'right',
                  padding: '12px 16px',
                  borderBottom: '1px solid #374151'
                }}>
                  Price
                </th>
                <th style={{
                  color: '#9ca3af',
                  textAlign: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid #374151'
                }}>
                  Status
                </th>
                <th style={{
                  color: '#9ca3af',
                  textAlign: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid #374151'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade, index) => renderTradeRow(trade, index))}
            </tbody>
          </table>
        </div>
      )}

      <style>
        {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        `}
      </style>
    </div>
  );
};

export default TradeHistory;