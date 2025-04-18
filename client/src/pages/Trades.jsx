import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate } from '../utils/format';
import '../styles/Trades.css';

// Redux imports
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchTrades, 
  selectAllTrades, 
  selectActiveTrades, 
  selectHistoricalTrades, 
  selectTradeStats, 
  selectTradesLoading, 
  selectTradesError 
} from '../redux/slices/tradesSlice';
import StatsCards from '../components/StatsCards';

const Trades = ({ user }) => {
  // Redux hooks
  const dispatch = useDispatch();
  const trades = useSelector(selectAllTrades);
  const activeTrades = useSelector(selectActiveTrades);
  const historicalTrades = useSelector(selectHistoricalTrades);
  const stats = useSelector(selectTradeStats);
  const loading = useSelector(selectTradesLoading);
  const error = useSelector(selectTradesError);

  // Local state for UI
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'history'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'sent', 'received'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger a refresh
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch trades on component mount and when refreshKey changes
    dispatch(fetchTrades());
    
    // Set up periodic refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      setRefreshKey(prevKey => prevKey + 1);
    }, 120000);
    
    return () => clearInterval(refreshInterval);
  }, [refreshKey, dispatch]);

  // Auto-refresh active trades periodically
  useEffect(() => {
    let refreshInterval = null;

    // Only set up auto-refresh if user is on the active trades tab
    if (activeTab === 'active') {
      refreshInterval = setInterval(() => {
        // Only refresh if the component is visible and not already loading
        if (document.visibilityState === 'visible' && !loading) {
          console.log('[Trades] Auto-refreshing active trades');
          dispatch(fetchTrades());
        }
      }, 60000); // Refresh every minute
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [activeTab, loading, dispatch]);

  // Handle manual refresh when button clicked
  const handleRefresh = () => {
    dispatch(fetchTrades());
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
    // Get the appropriate trade list based on the active tab
    let filtered = activeTab === 'active' ? activeTrades : historicalTrades;
    
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
    
    // Try all possible avatar properties in order
    return userObj.avatar || 
           userObj.avatarfull || 
           userObj.avatarUrl || 
           userObj.avatarMedium ||
           userObj.avatarSmall ||
           '/default-avatar.png';
  };

  // Function to render in-progress trades from redux activeTrades
  const renderInProgressTrades = () => {
    if (activeTrades.length === 0) {
      return null;
    }
    
    return (
      <div className="in-progress-trades-container">
        <h3 className="in-progress-trades-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="in-progress-icon">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          In-Progress Trades
        </h3>
        <p className="in-progress-trades-description">
          These trades are currently active. Click to continue.
        </p>
        
        <div className="in-progress-trades-list">
          {activeTrades.slice(0, 3).map(trade => (
            <div 
              key={trade._id} 
              className="in-progress-trade-card"
              onClick={() => navigate(`/trades/${trade._id}`)}
            >
              <div className="in-progress-trade-header">
                <span className="in-progress-trade-id">Trade #{trade._id.substring(0, 8)}</span>
                <span 
                  className="in-progress-trade-status" 
                  style={{ 
                    backgroundColor: getStatusColor(trade.status) + '22',
                    color: getStatusColor(trade.status),
                    border: `1px solid ${getStatusColor(trade.status)}44`
                  }}
                >
                  {getStatusLabel(trade.status)}
                </span>
              </div>
              
              <div className="in-progress-trade-item">
                <div className="in-progress-trade-item-image">
                  {trade.itemImage ? (
                    <img 
                      src={trade.itemImage} 
                      alt={trade.itemName || 'Item'} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTcePMQFc1nqWSMU5OD2NwOx3sIyShXOjLx2Sk5MbV5MsLD3k3xgfPYDG25bm-Wfw3vUsU9SLPWZ2yp-zWh5OqTE2nIQu4rFl9RKfEEpzdJbsiIaRpp3dUVu2u_0UZyDBl9JNNWfADjmyRCMLwnXeL51Cg/360fx360f';
                      }}
                    />
                  ) : (
                    <div className="in-progress-trade-item-placeholder">?</div>
                  )}
                </div>
                <div className="in-progress-trade-item-details">
                  <div className="in-progress-trade-item-name">{trade.itemName || 'Unknown Item'}</div>
                  <div className="in-progress-trade-item-price">{formatCurrency(trade.price)}</div>
                </div>
              </div>
              
              <button className="in-progress-trade-continue-btn">
                Continue Trade
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
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
          <button 
            className="trades-refresh-button" 
            onClick={() => dispatch(fetchTrades())}
            disabled={loading}
          >
            {loading ? (
              <span className="trades-refresh-loading"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"></path>
                <path d="M23 20v-6h-6"></path>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
            )}
            Refresh
          </button>
        </div>
        <StatsCards stats={stats} statsLoading={loading} />
      </div>
      
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
              onClick={() => dispatch(fetchTrades())}
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
                        src={trade.itemImage || 
                             (trade.item && (trade.item.iconUrl || trade.item.iconURL || trade.item.icon || trade.item.imageUrl || trade.item.image)) || 
                             trade.itemIconUrl || 
                             trade.iconUrl || 
                             '/default-item.png'} 
                        alt={trade.itemName || (trade.item && trade.item.marketHashName) || 'Item'} 
                        onError={(e) => {
                          console.error("Failed to load image:", e.target.src);
                          e.target.onerror = null; // Prevent infinite loop
                          e.target.src = '/default-item.png';
                        }}
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
                              onError={(e) => {
                                console.error("Failed to load buyer avatar:", e.target.src);
                                e.target.onerror = null; // Prevent infinite loop
                                e.target.src = '/default-avatar.png';
                              }}
                              loading="lazy"
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
                              onError={(e) => {
                                console.error("Failed to load seller avatar:", e.target.src);
                                e.target.onerror = null; // Prevent infinite loop
                                e.target.src = '/default-avatar.png';
                              }}
                              loading="lazy"
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
      
      {/* In-Progress Trades Section */}
      {renderInProgressTrades()}
    </div>
  );
};

export default Trades; 