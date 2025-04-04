import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, API_URL } from '../config/constants';
import '../styles/Trades.css';

const Trades = ({ user }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'history'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'sent', 'received'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger a refresh
  const [stats, setStats] = useState({
    totalTrades: 0,
    activeTrades: 0,
    completedTrades: 0,
    totalValue: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrades();
    
    // Set up periodic refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      setRefreshKey(prevKey => prevKey + 1);
    }, 120000);
    
    return () => clearInterval(refreshInterval);
  }, [refreshKey]);
  
  // Calculate stats when trades change
  useEffect(() => {
    if (Array.isArray(trades) && trades.length > 0) {
      const activeTrades = trades.filter(trade => 
        ['awaiting_seller', 'offer_sent', 'awaiting_confirmation', 'created', 'pending'].includes(trade?.status)
      );
      
      const completedTrades = trades.filter(trade => 
        ['completed'].includes(trade?.status)
      );
      
      const totalValue = trades.reduce((sum, trade) => sum + (Number(trade?.price) || 0), 0);
      
      setStats({
        totalTrades: trades.length,
        activeTrades: activeTrades.length,
        completedTrades: completedTrades.length,
        totalValue
      });
    }
  }, [trades]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/trades/history`, { 
        withCredentials: true 
      });
      
      if (Array.isArray(response.data)) {
        const tradesWithImages = await enhanceTradesWithUserImages(response.data);
        setTrades(tradesWithImages);
      } else {
        console.error('Invalid response format from trade history API:', response.data);
        setTrades([]);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Error fetching trade history:', err);
      setError('Failed to load trade history. Please try again later.');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to enhance trades with user images
  const enhanceTradesWithUserImages = async (trades) => {
    return trades.map(trade => {
      // Ensure buyer and seller have avatars
      if (trade.buyer && !trade.buyer.avatar && trade.buyer.avatarfull) {
        trade.buyer.avatar = trade.buyer.avatarfull;
      }
      
      if (trade.seller && !trade.seller.avatar && trade.seller.avatarfull) {
        trade.seller.avatar = trade.seller.avatarfull;
      }
      
      // Make sure item image is set
      if (trade.item && trade.item.iconUrl && !trade.itemImage) {
        trade.itemImage = trade.item.iconUrl;
      }
      
      return trade;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4ade80'; // Green
      case 'cancelled':
      case 'failed':
        return '#ef4444'; // Red
      case 'pending':
      case 'awaiting_seller':
      case 'offer_sent':
      case 'awaiting_confirmation':
      case 'created':
        return '#3b82f6'; // Blue
      default:
        return '#9ca3af'; // Gray
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'awaiting_seller':
        return 'Awaiting Seller';
      case 'offer_sent':
        return 'Offer Sent';
      case 'awaiting_confirmation':
        return 'Awaiting Confirmation';
      case 'created':
        return 'Created';
      default:
        return status;
    }
  };

  const getFilteredTrades = () => {
    let filtered = trades || [];
    
    if (!Array.isArray(filtered)) {
      console.error('Trades is not an array:', filtered);
      return [];
    }

    // Apply search filter if searchTerm exists
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(trade => {
        const itemName = trade?.item?.marketHashName?.toLowerCase() || trade?.itemName?.toLowerCase() || '';
        const buyerName = trade?.buyer?.displayName?.toLowerCase() || '';
        const sellerName = trade?.seller?.displayName?.toLowerCase() || '';
        return itemName.includes(term) || buyerName.includes(term) || sellerName.includes(term);
      });
    }
    
    // Apply role filter
    if (roleFilter === 'sent') {
      filtered = filtered.filter(trade => trade?.isUserBuyer);
    } else if (roleFilter === 'received') {
      filtered = filtered.filter(trade => trade?.isUserSeller);
    }

    // Apply status filter (tab)
    if (activeTab === 'active') {
      filtered = filtered.filter(trade => 
        ['awaiting_seller', 'offer_sent', 'awaiting_confirmation', 'created', 'pending'].includes(trade?.status)
      );
    } else if (activeTab === 'history') {
      filtered = filtered.filter(trade => 
        ['completed', 'cancelled', 'failed'].includes(trade?.status)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
        case 'oldest':
          return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
        case 'highest':
          return (Number(b?.price) || 0) - (Number(a?.price) || 0);
        case 'lowest':
          return (Number(a?.price) || 0) - (Number(b?.price) || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const filteredTrades = getFilteredTrades();
  
  // Function to clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setSortOrder('newest');
  };
  
  // Get the appropriate avatar URL
  const getAvatarUrl = (userObj) => {
    if (!userObj) return '/default-avatar.png';
    
    return userObj.avatar || 
           userObj.avatarfull || 
           userObj.avatarUrl || 
           '/default-avatar.png';
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  // Render large empty state
  const renderEmptyState = () => {
    return (
      <div className="trades-empty-state">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9"></polyline>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
          <polyline points="7 23 3 19 7 15"></polyline>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
        </svg>
        
        <h3>{activeTab === 'active' ? 'No Active Trades' : 'No Trade History'}</h3>
        
        {activeTab === 'active' ? (
          <p>You don't have any ongoing trades. Start trading by browsing the marketplace.</p>
        ) : (
          <p>You haven't completed any trades yet. Your trade history will appear here.</p>
        )}
        
        <button className="trades-primary-button" onClick={() => navigate('/marketplace')}>
          Browse Marketplace
        </button>
      </div>
    );
  };

  return (
    <div className="trades-container">
      <div className="trades-header">
        <div className="trades-header-content">
          <h1>My Trades</h1>
          <p>Manage and track all your trades in one place</p>
        </div>
        
        {/* Add refresh button */}
        <button className="trades-refresh-button" onClick={handleRefresh} title="Refresh trades">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
          </svg>
        </button>
      </div>
      
      {/* Stats Cards */}
      <motion.div 
        className="trades-stats"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="trades-stat-card">
          <div className="trades-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="trades-stat-content">
            <div className="trades-stat-label">Total Trades</div>
            <div className="trades-stat-value">{stats.totalTrades}</div>
          </div>
        </div>
        
        <div className="trades-stat-card active">
          <div className="trades-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div className="trades-stat-content">
            <div className="trades-stat-label">Active Trades</div>
            <div className="trades-stat-value">{stats.activeTrades}</div>
          </div>
        </div>
        
        <div className="trades-stat-card completed">
          <div className="trades-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="trades-stat-content">
            <div className="trades-stat-label">Completed</div>
            <div className="trades-stat-value">{stats.completedTrades}</div>
          </div>
        </div>
        
        <div className="trades-stat-card">
          <div className="trades-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="trades-stat-content">
            <div className="trades-stat-label">Total Value</div>
            <div className="trades-stat-value">{formatCurrency(stats.totalValue)}</div>
          </div>
        </div>
      </motion.div>
      
      {/* Tabs */}
      <motion.div 
        className="trades-tabs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <button 
          className={`trades-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Active Trades
          {stats.activeTrades > 0 && <span className="trades-tab-badge">{stats.activeTrades}</span>}
        </button>
        
        <button 
          className={`trades-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <polyline points="23 20 23 14 17 14"></polyline>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
          </svg>
          Trade History
          {stats.completedTrades > 0 && <span className="trades-tab-badge">{stats.completedTrades}</span>}
        </button>
      </motion.div>
      
      {/* Filters */}
      <motion.div 
        className="trades-filters"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="trades-search-container">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by item or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="trades-search-input"
          />
          {searchTerm && (
            <button 
              className="trades-search-clear" 
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        
        <div className="trades-filter-actions">
          <div className="trades-filter-group">
            <label htmlFor="roleFilter" className="trades-filter-label">Role:</label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="trades-filter-select"
            >
              <option value="all">All Trades</option>
              <option value="sent">Purchases</option>
              <option value="received">Sales</option>
            </select>
          </div>
          
          <div className="trades-filter-group">
            <label htmlFor="sortOrder" className="trades-filter-label">Sort:</label>
            <select
              id="sortOrder"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="trades-filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Price</option>
              <option value="lowest">Lowest Price</option>
            </select>
          </div>
          
          {(searchTerm || roleFilter !== 'all' || sortOrder !== 'newest') && (
            <button 
              className="trades-filter-clear" 
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </motion.div>
      
      {/* Loading, Error or Trades List */}
      <div className="trades-content">
        {loading ? (
          <div className="trades-loading">
            <div className="trades-spinner"></div>
            <p>Loading your trades...</p>
          </div>
        ) : error ? (
          <div className="trades-error">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>{error}</p>
            <button 
              className="trades-retry-button"
              onClick={fetchTrades}
            >
              Try Again
            </button>
          </div>
        ) : filteredTrades.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="trades-list">
            <AnimatePresence mode="popLayout">
              {filteredTrades.map((trade, index) => (
                <motion.div 
                  key={trade._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="trade-card"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="trade-card-header">
                    <div className="trade-status" style={{ backgroundColor: getStatusColor(trade.status) }}>
                      {getStatusLabel(trade.status)}
                    </div>
                    <div className="trade-date">
                      {new Date(trade.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  <div className="trade-card-content">
                    <div className="trade-item-image">
                      <img 
                        src={trade.itemImage || trade.item?.iconUrl || '/default-item.png'} 
                        alt={trade.itemName} 
                        onError={(e) => {e.target.src = '/default-item.png'}}
                      />
                    </div>
                    
                    <div className="trade-item-details">
                      <h3 className="trade-item-name">{trade.itemName || trade.item?.marketHashName || 'Unknown Item'}</h3>
                      <p className="trade-item-price">
                        {formatCurrency(trade.price, trade.currency)} 
                        {trade.currency && trade.currency !== 'USD' && ` (${trade.currency})`}
                      </p>
                      
                      <div className="trade-participants">
                        <div className="trade-participant">
                          <div className="trade-participant-avatar">
                            <img 
                              src={getAvatarUrl(trade.buyer)} 
                              alt={trade.buyer?.displayName || 'Buyer'} 
                              onError={(e) => {e.target.src = '/default-avatar.png'}}
                            />
                          </div>
                          <div className="trade-participant-info">
                            <span className="trade-role">{trade.isUserBuyer ? 'You' : 'Buyer'}:</span>
                            <span className="trade-user">{trade.isUserBuyer ? 'You' : trade.buyer?.displayName || 'Unknown'}</span>
                          </div>
                        </div>
                        
                        <div className="trade-divider">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                            <path d="M12 5l7 7-7 7"></path>
                          </svg>
                        </div>
                        
                        <div className="trade-participant">
                          <div className="trade-participant-avatar">
                            <img 
                              src={getAvatarUrl(trade.seller)} 
                              alt={trade.seller?.displayName || 'Seller'} 
                              onError={(e) => {e.target.src = '/default-avatar.png'}}
                            />
                          </div>
                          <div className="trade-participant-info">
                            <span className="trade-role">{trade.isUserSeller ? 'You' : 'Seller'}:</span>
                            <span className="trade-user">{trade.isUserSeller ? 'You' : trade.seller?.displayName || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="trade-actions">
                      <Link to={`/trades/${trade._id}`} className="trade-view-button">
                        View Details
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trades; 