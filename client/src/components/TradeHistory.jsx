import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
// Removed motion imports to fix build issues
import { formatCurrency } from '../config/constants';

const API_URL = 'http://localhost:5001';

const TradeHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/trades/history`, {
        withCredentials: true
      });
      setTrades(response.data);
    } catch (err) {
      console.error('Error fetching trades:', err);
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
        case 'awaiting_seller':
          return 'Awaiting Seller';
        case 'offer_sent':
          return 'Offer Sent';
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
        fontSize: '0.75rem',
        fontWeight: '500'
      }}>
        {getStatusText()}
      </span>
    );
  };

  const getFilteredTrades = () => {
    if (filter === 'all') return trades;
    if (filter === 'active') {
      return trades.filter(trade => ['awaiting_seller', 'offer_sent', 'awaiting_confirmation', 'created', 'pending'].includes(trade.status));
    }
    if (filter === 'completed') {
      return trades.filter(trade => ['completed', 'cancelled', 'failed'].includes(trade.status));
    }
    return trades;
  };

  const filteredTrades = getFilteredTrades();

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
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
        <p 
          style={{ marginBottom: 0 }}
        >
          {error}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '30px 20px'
    }}>
      <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          background: 'rgba(45, 27, 105, 0.3)',
          padding: '25px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <h1 style={{ 
            color: '#f1f1f1', 
            margin: '0', 
            fontSize: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Trade History
        </h1>
        
        <div style={{ 
            display: 'flex', 
            gap: '10px',
            background: 'rgba(45, 27, 105, 0.5)',
            padding: '8px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <button
            onClick={() => setFilter('all')}
            style={{
              backgroundColor: filter === 'all' ? '#4ade80' : 'transparent',
              color: filter === 'all' ? '#064e3b' : '#f1f1f1',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: filter === 'all' ? '0 4px 12px rgba(74, 222, 128, 0.3)' : 'none'
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            style={{
              backgroundColor: filter === 'active' ? '#4ade80' : 'transparent',
              color: filter === 'active' ? '#064e3b' : '#f1f1f1',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: filter === 'active' ? '0 4px 12px rgba(74, 222, 128, 0.3)' : 'none'
            }}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            style={{
              backgroundColor: filter === 'completed' ? '#4ade80' : 'transparent',
              color: filter === 'completed' ? '#064e3b' : '#f1f1f1',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: filter === 'completed' ? '0 4px 12px rgba(74, 222, 128, 0.3)' : 'none'
            }}
          >
            Completed
          </button>
        </div>
      </div>

      {filteredTrades.length === 0 ? (
        <div style={{
            background: 'rgba(45, 27, 105, 0.3)',
            color: '#f1f1f1',
            padding: '60px 40px',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 20px',
              background: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 12h8"></path>
            </svg>
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
            No trade history found
          </h3>
          <p style={{ color: '#94a3b8' }}>
            Once you start trading, your history will appear here.
          </p>
        </div>
      ) : (
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
                  Date
                </th>
                <th style={{
                  color: '#9ca3af',
                  textAlign: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid #374151'
                }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade, index) => (
                <tr 
                  key={trade._id}
                  style={{
                    borderBottom: '1px solid rgba(55, 65, 81, 0.7)',
                    backgroundColor: trade.isUserBuyer ? 'rgba(253, 224, 71, 0.05)' : 'rgba(74, 222, 128, 0.05)',
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <img 
                        src={trade.item.imageUrl || 'https://via.placeholder.com/50'} 
                        alt={trade.item.marketHashName}
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
                          {trade.item.marketHashName}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                          {trade.item.wear && trade.item.wear} {trade.assetId && `| ${trade.assetId.substring(0, 8)}...`}
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
                            src={trade.seller.avatar || 'https://via.placeholder.com/20'}
                            alt={trade.seller.displayName}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              marginRight: '6px'
                            }}
                          />
                          {trade.seller.displayName}
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
                            src={trade.buyer.avatar || 'https://via.placeholder.com/20'}
                            alt={trade.buyer.displayName}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              marginRight: '6px'
                            }}
                          />
                          {trade.buyer.displayName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 16px',
                    textAlign: 'right',
                    color: '#4ade80',
                    fontWeight: '600',
                    fontSize: '1.125rem'
                  }}>
                    {formatCurrency(trade.price, trade.currency)}
                  </td>
                  <td style={{ 
                    padding: '12px 16px',
                    textAlign: 'center'
                  }}>
                    <StatusBadge status={trade.status} />
                  </td>
                  <td style={{ 
                    padding: '12px 16px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '0.875rem'
                  }}>
                    {new Date(trade.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ 
                    padding: '12px 16px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <Link
                        to={`/trades/${trade._id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          color: 'white',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        View Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default TradeHistory;