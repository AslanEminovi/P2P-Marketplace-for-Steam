import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
// Removed motion imports to fix build issues
import { formatCurrency, API_URL } from '../config/constants';

const TradeHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'sent', 'received'

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching trade history from:', `${API_URL}/trades/history`);
      const response = await axios.get(`${API_URL}/trades/history`, {
        withCredentials: true
      });
      
      console.log('Trade history response:', response.data);
      
      // Check if response is valid
      if (!Array.isArray(response.data)) {
        console.error('Invalid trade history response format:', response.data);
        setError('Received invalid data from server. Please try again later.');
        setTrades([]);
      } else {
        setTrades(response.data);
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError(err.response?.data?.error || 'Failed to load trade history. Please check your connection and try again.');
      setTrades([]);
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
          return 'Purchase Offer Sent';
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
          return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
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
    let filtered = trades || [];
    
    if (!Array.isArray(filtered)) {
      console.error('Trades is not an array:', filtered);
      return [];
    }
    
    // First filter by role (buyer/seller)
    if (roleFilter === 'sent') {
      filtered = filtered.filter(trade => trade?.isUserBuyer);
    } else if (roleFilter === 'received') {
      filtered = filtered.filter(trade => trade?.isUserSeller);
    }
    
    // Then filter by status
    if (filter === 'all') return filtered;
    if (filter === 'active') {
      return filtered.filter(trade => ['awaiting_seller', 'offer_sent', 'awaiting_confirmation', 'created', 'pending'].includes(trade?.status));
    }
    if (filter === 'completed') {
      return filtered.filter(trade => ['completed', 'cancelled', 'failed'].includes(trade?.status));
    }
    return filtered;
  };

  // Safe access to potentially undefined objects
  const getSafeItemDetails = (trade) => {
    const item = trade?.item || {};
    return {
      marketHashName: item.marketHashName || trade?.itemName || 'Unknown Item',
      imageUrl: item.imageUrl || trade?.itemImage || 'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEGegouTxTgsSxQt5M1V_eNC-VZzY89ssYDjGIzw1B_Z7PlMmQzJVGaVaUJC_Q7-Q28UiRh7pQ7VoLj9ewDKw_us4PAN7coOopJTMDWXvSGMF_860g60agOe8ONpyK-i3vuaGgCUg25_ToQnOKE6bBunMsoYhg/360fx360f',
      wear: item.wear || trade?.itemWear || 'Unknown',
      rarity: item.rarity || trade?.itemRarity || 'Unknown',
      price: trade?.price || 0
    };
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
        <p style={{ marginBottom: '10px' }}>
          {error}
        </p>
        <button 
          onClick={fetchTrades}
          style={{
            backgroundColor: '#991b1b',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Try Again
        </button>
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
        
        <div className="filter-container" style={{ 
            display: 'flex', 
            gap: '16px',
            background: 'rgba(45, 27, 105, 0.5)',
            padding: '8px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
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
            </div>
          </div>
          
          <div className="filter-group">
            <span style={{ color: '#e5e7eb', marginRight: '10px' }}>Type:</span>
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
          <h2 style={{ color: '#f1f1f1', marginBottom: '16px' }}>No Trades Found</h2>
          <p style={{ color: '#d1d5db', maxWidth: '500px', margin: '0 auto' }}>
            {filter !== 'all' || roleFilter !== 'all' ? 
              'No trades match your current filters. Try changing the filters to see more trades.' :
              'You don\'t have any trade history yet. When you trade items, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="trades-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredTrades.map(trade => {
            // Safety checks for potentially undefined objects
            if (!trade || typeof trade !== 'object') {
              console.error('Invalid trade object:', trade);
              return null;
            }
            
            const { marketHashName, imageUrl, wear, rarity, price } = getSafeItemDetails(trade);
            
            return (
              <Link 
                key={trade._id} 
                to={`/trades/${trade._id}`} 
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'rgba(17, 24, 39, 0.4)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(55, 65, 81, 0.5)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  ':hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)'
                  }
                }}>
                  <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {/* Item image */}
                    <div style={{ 
                      width: '120px',
                      height: '100px',
                      overflow: 'hidden',
                      position: 'relative',
                      backgroundColor: '#1f2937'
                    }}>
                      <img 
                        src={imageUrl}
                        alt={marketHashName}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTcePMQFc1nqWSMU5OD2NwOx3sIyShXOjLx2Sk5MbV5MsLD3k3xgfPYDG25bm-Wfw3vUsU9SLPWZ2yp-zWh5OqTE2nIQu4rFl9RKfEEpzdJbsiIaRpp3dUVu2u_0UZyDBl9JNNWfADjmyRCMLwnXeL51Cg/360fx360f';
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        padding: '4px 8px',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          color: getRarityColor(rarity),
                          fontSize: '0.7rem',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}>
                          {rarity}
                        </span>
                        <span style={{
                          color: '#d1d5db',
                          fontSize: '0.7rem',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}>
                          {wear}
                        </span>
                      </div>
                    </div>
                    
                    {/* Trade details */}
                    <div style={{ 
                      flex: '1',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px'
                        }}>
                          <h3 style={{ 
                            color: '#f1f1f1',
                            margin: '0',
                            fontSize: '1rem',
                            fontWeight: '500',
                            marginBottom: '4px',
                            lineHeight: '1.2'
                          }}>
                            {marketHashName}
                          </h3>
                          <StatusBadge status={trade.status} />
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          gap: '16px',
                          color: '#9ca3af',
                          fontSize: '0.875rem'
                        }}>
                          {trade.isUserBuyer ? (
                            <div>
                              <span style={{ opacity: '0.7' }}>From: </span>
                              <span style={{ color: '#e5e7eb' }}>
                                {trade.seller?.displayName || 'Unknown'}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span style={{ opacity: '0.7' }}>To: </span>
                              <span style={{ color: '#e5e7eb' }}>
                                {trade.buyer?.displayName || 'Unknown'}
                              </span>
                            </div>
                          )}
                          <div>
                            <span style={{ opacity: '0.7' }}>Date: </span>
                            <span style={{ color: '#e5e7eb' }}>
                              {new Date(trade.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '8px'
                      }}>
                        <div style={{ 
                          color: '#4ade80',
                          fontWeight: '500'
                        }}>
                          {formatCurrency(price)}
                        </div>
                        <div style={{
                          color: '#9ca3af',
                          fontSize: '0.875rem'
                        }}>
                          View Details →
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper function for rarity colors
const getRarityColor = (rarity) => {
  switch (rarity?.toLowerCase()) {
    case 'consumer grade':
      return '#b0c3d9';
    case 'industrial grade':
      return '#5e98d9';
    case 'mil-spec':
    case 'mil-spec grade':
      return '#4b69ff';
    case 'restricted':
      return '#8847ff';
    case 'classified':
      return '#d32ce6';
    case 'covert':
      return '#eb4b4b';
    case 'contraband':
      return '#ffae39';
    default:
      return '#d1d5db';
  }
};

export default TradeHistory;