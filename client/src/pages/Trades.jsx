import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate } from '../utils/format';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExchangeAlt, 
  faSpinner, 
  faCheckCircle, 
  faDollarSign,
  faSearch,
  faClock,
  faHistory,
  faFilter,
  faSync,
  faArrowRight,
  faExclamationCircle,
  faShoppingCart,
  faStore,
  faTimes,
  faExclamationTriangle,
  faEye,
  faTag,
  faUserTie,
  faUser,
  faTimesCircle,
  faAngleRight,
  faMoneyBillWave,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
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
  selectTradesError,
  fetchActiveTradesAsync,
  fetchTradeHistoryAsync
} from '../redux/slices/tradesSlice';
import { selectActiveTradesData, selectTradeHistoryData } from '../redux/selectors/tradesSelectors';
import StatsCards from '../components/StatsCards';
import { tradeStatusVariants } from '../utils/statusUtils';
import moment from 'moment';

const Trades = ({ user }) => {
  // Redux hooks
  const dispatch = useDispatch();
  const trades = useSelector(selectAllTrades);
  const activeTrades = useSelector(selectActiveTrades);
  const historicalTrades = useSelector(selectHistoricalTrades);
  const reduxTradeStats = useSelector(selectTradeStats);
  const loading = useSelector(selectTradesLoading);
  const error = useSelector(selectTradesError);

  const activeTradesData = useSelector(selectActiveTradesData);
  const tradeHistoryData = useSelector(selectTradeHistoryData);

  // Local state for UI
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'history'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'sent', 'received'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger a refresh
  const navigate = useNavigate();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(user?._id || '');

  // Use a merged stats object that takes values from Redux first, then falls back to calculated values
  const calculatedStats = {
    totalTrades: (activeTradesData?.trades?.length || 0) + (tradeHistoryData?.trades?.length || 0),
    activeTrades: activeTradesData?.trades?.length || 0,
    completedTrades: tradeHistoryData?.trades?.filter(t => t.status === 'COMPLETED')?.length || 0,
    moneyTraded: tradeHistoryData?.trades?.filter(t => t.status === 'COMPLETED')?.reduce((sum, trade) => 
      sum + (parseFloat(trade.item?.price || 0)), 0) || 0
  };

  // Prioritize Redux stats, fall back to calculated values
  const tradeStats = {
    totalTrades: reduxTradeStats.totalTrades || calculatedStats.totalTrades,
    completedTrades: reduxTradeStats.completedTrades || calculatedStats.completedTrades,
    tradeVolume: reduxTradeStats.totalValue || calculatedStats.moneyTraded
  };

  useEffect(() => {
    if (user?._id) {
      setCurrentUserId(user._id);
    }
  }, [user]);

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
    // Determine which trade list to use based on active tab
    const tradesData = activeTab === 'active' ? 
      activeTradesData?.trades || [] : 
      tradeHistoryData?.trades || [];
      
    if (!tradesData.length) return [];
    
    // Apply role filter
    let filtered = [...tradesData];
    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter(trade => {
        if (roleFilter === 'seller' && trade.seller?._id === currentUserId) return true;
        if (roleFilter === 'buyer' && trade.buyer?._id === currentUserId) return true;
        return false;
      });
    }
    
    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(trade => {
        // Search by trade ID
        if (trade._id?.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        if (trade.tradeId?.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        
        // Search by item name
        if (trade.item?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        
        // Search by username
        if (trade.seller?.username?.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        if (trade.buyer?.username?.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        
        return false;
      });
    }
    
    // Apply sort
    if (sortOrder === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortOrder === 'price-high') {
      filtered.sort((a, b) => (parseFloat(b.item?.price || 0) - parseFloat(a.item?.price || 0)));
    } else if (sortOrder === 'price-low') {
      filtered.sort((a, b) => (parseFloat(a.item?.price || 0) - parseFloat(b.item?.price || 0)));
    } else {
      // Default to newest first
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    return filtered;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setSortOrder('newest');
  };

  const formatDate = (dateString) => {
    return moment(dateString).format('MMM D, YYYY [at] h:mm A');
  };

  const getAvatarUrl = (userObj) => {
    if (!userObj) return '/images/default-avatar.png';
    return userObj.avatar || '/images/default-avatar.png';
  };

  const renderInProgressTrades = () => {
    // Only show in-progress trades section on active tab
    if (activeTab !== 'active') return null;
    
    // Get trades that require immediate attention
    const inProgressTrades = activeTrades.filter(
      trade => 
        trade.status === 'awaiting_seller' ||
        trade.status === 'offer_sent' ||
        trade.status === 'awaiting_confirmation'
    );
    
    if (inProgressTrades.length === 0) return null;
    
    return (
      <div className="in-progress-trades">
        <h2>Continue Your Trades</h2>
        <p className="in-progress-description">
          These trades require your attention and are waiting for a response.
        </p>
        
        <div className="in-progress-trades-list">
          {inProgressTrades.map(trade => (
            <div key={trade._id} className="in-progress-trade-card" onClick={() => handleTradeClick(trade._id)}>
              <div className="in-progress-trade-details">
                <div className="in-progress-trade-item">
                  {trade.item?.imageUrl ? (
                    <img 
                      src={trade.item.imageUrl} 
                      alt={trade.item.name} 
                      className="in-progress-trade-item-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/placeholder-item.png";
                      }}
                    />
                  ) : (
                    <div className="in-progress-trade-item-image-placeholder">?</div>
                  )}
                  <div className="in-progress-trade-item-info">
                    <div className="in-progress-trade-item-name">{trade.item?.name || "Unknown Item"}</div>
                    <div className="in-progress-trade-item-price">${parseFloat(trade.item?.price || 0).toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="in-progress-trade-status">
                  <span 
                    className="trade-status-badge"
                    style={{
                      backgroundColor: getStatusColor(trade.status)
                    }}
                  >
                    {getStatusLabel(trade.status)}
                  </span>
                  <span className="in-progress-trade-time">{moment(trade.createdAt).fromNow()}</span>
                </div>
              </div>
              
              <div className="in-progress-trade-action">
                <span className="in-progress-trade-continue-button">
                  <span>Continue Trade</span>
                  <FontAwesomeIcon icon={faAngleRight} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    if (activeTab === 'active') {
      return (
        <div className="trades-empty-state">
          <FontAwesomeIcon icon={faClock} />
          <h3>No Active Trades</h3>
          <p>You don't have any active trades at the moment. Browse the marketplace to find items to buy or sell.</p>
          <Link to="/marketplace" className="trades-primary-button">
            <FontAwesomeIcon icon={faShoppingCart} /> Browse Marketplace
          </Link>
        </div>
      );
    } else {
      return (
        <div className="trades-empty-state">
          <FontAwesomeIcon icon={faCalendarAlt} />
          <h3>No Trade History</h3>
          <p>Your trade history is currently empty. Complete trades to see them appear here.</p>
          <Link to="/marketplace" className="trades-primary-button">
            <FontAwesomeIcon icon={faShoppingCart} /> Browse Marketplace
          </Link>
        </div>
      );
    }
  };

  // Fetch trades data on component mount
  useEffect(() => {
    if (!activeTradesData?.trades) {
      dispatch(fetchActiveTradesAsync());
    }
    
    if (!tradeHistoryData?.trades) {
      dispatch(fetchTradeHistoryAsync());
    }
    
    // Set up auto-refresh for active trades (every 30 seconds)
    const interval = setInterval(() => {
      if (activeTab === 'active') {
        refreshActiveTradesQuietly();
      }
    }, 30000);
    
    setAutoRefreshInterval(interval);
    
    return () => {
      clearInterval(interval);
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, []);

  // Refresh active trades with a loading indicator
  const refreshTrades = useCallback(() => {
    setIsRefreshing(true);
    
    dispatch(fetchActiveTradesAsync()).then(() => {
      setIsRefreshing(false);
      
      // Set a cooldown timer to prevent spam refreshing (5 seconds)
      const timer = setTimeout(() => {
        setRefreshTimer(null);
      }, 5000);
      
      setRefreshTimer(timer);
    });
    
    if (activeTab === 'history') {
      dispatch(fetchTradeHistoryAsync());
    }
  }, [dispatch, activeTab]);

  // Quietly refresh active trades without UI indicators (for auto-refresh)
  const refreshActiveTradesQuietly = useCallback(() => {
    dispatch(fetchActiveTradesAsync());
  }, [dispatch]);

  // Get status options based on the active tab
  const getStatusOptions = () => {
    if (activeTab === 'active') {
      return [
        { value: 'CREATED', label: 'Created' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'ACCEPTED', label: 'Accepted' },
        { value: 'PROCESSING', label: 'Processing' },
        { value: 'WAITING_CONFIRMATION', label: 'Waiting Confirmation' },
      ];
    } else {
      return [
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'CANCELLED', label: 'Cancelled' },
        { value: 'EXPIRED', label: 'Expired' },
        { value: 'FAILED', label: 'Failed' },
      ];
    }
  };

  // Handle changes to the active tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setRoleFilter('all');
  };

  // Navigate to trade details page when a trade is clicked
  const handleTradeClick = (tradeId) => {
    navigate(`/trades/${tradeId}`);
  };

  // Get the appropriate loading or error state
  const getContentState = () => {
    const isLoading = activeTab === 'active' ? 
      activeTradesData?.loading : 
      tradeHistoryData?.loading;
    
    const error = activeTab === 'active' ? 
      activeTradesData?.error : 
      tradeHistoryData?.error;
    
    if (isLoading) {
      return (
        <div className="trades-loading">
          <div className="trades-spinner"></div>
          <p>Loading your trades...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="trades-error">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button className="trades-retry-button" onClick={refreshTrades}>
            <FontAwesomeIcon icon={faSpinner} /> Try Again
          </button>
        </div>
      );
    }
    
    const trades = getFilteredTrades();
    
    if (trades.length === 0) {
      return (
        <div className="trades-empty-state">
          <FontAwesomeIcon icon={activeTab === 'active' ? faClock : faHistory} />
          <h3>No {activeTab === 'active' ? 'active' : 'historical'} trades found</h3>
          <p>
            {searchTerm || roleFilter !== 'all'
              ? "No trades match your current filters. Try adjusting your search criteria or clear the filters."
              : activeTab === 'active'
              ? "You don't have any active trades at the moment. Start trading to see your trades here!"
              : "You haven't completed any trades yet. Complete trades will show up here."}
          </p>
          {searchTerm || roleFilter !== 'all' ? (
            <button className="trades-primary-button" onClick={clearFilters}>
              <FontAwesomeIcon icon={faTimes} /> Clear Filters
            </button>
          ) : (
            <Link to="/market" className="trades-primary-button">
              <FontAwesomeIcon icon={faTag} /> Browse Market
            </Link>
          )}
        </div>
      );
    }
    
    return (
      <div className="trades-list">
        {trades.map(trade => (
          <div key={trade.tradeId || trade._id} className="trade-card" onClick={() => handleTradeClick(trade.tradeId || trade._id)}>
            <div className="trade-card-header">
              <span 
                className="trade-status" 
                style={{
                  backgroundColor: tradeStatusVariants[trade.status]?.color || '#888',
                }}
              >
                {tradeStatusVariants[trade.status]?.label || trade.status}
              </span>
              <span className="trade-date">{formatDate(trade.createdAt)}</span>
            </div>
            <div className="trade-card-content">
              <div className="trade-item-details">
                <div className="trade-item-image">
                  {trade.item?.imageUrl ? (
                    <img 
                      src={trade.item.imageUrl} 
                      alt={trade.item.name} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/placeholder-item.png";
                      }}
                    />
                  ) : (
                    <div className="trade-item-image-placeholder">?</div>
                  )}
                </div>
                <div className="trade-item-info">
                  <h3 className="trade-item-name">{trade.item?.name || "Unknown Item"}</h3>
                  <div className="trade-price">
                    <FontAwesomeIcon icon={faMoneyBillWave} />
                    <span>${parseFloat(trade.item?.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="trade-participants">
                    <div className="trade-participant">
                      <FontAwesomeIcon icon={faUserTie} />
                      <span>Seller:</span>
                      <div className="trade-user">{trade.seller?.username || "Unknown"}</div>
                    </div>
                    <div className="trade-participant">
                      <FontAwesomeIcon icon={faUser} />
                      <span>Buyer:</span>
                      <div className="trade-user">{trade.buyer?.username || "Unknown"}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="trade-actions">
                <Link to={`/trades/${trade.tradeId || trade._id}`} className="trade-view-button">
                  <FontAwesomeIcon icon={faEye} /> View Trade
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="trades-container">
      <div className="trades-header">
        <div className="trades-title">
          <h1>
            <FontAwesomeIcon icon={faExchangeAlt} /> 
            Your Trades
          </h1>
          <button 
            className="trades-refresh-button" 
            onClick={refreshTrades} 
            disabled={isRefreshing}
          >
            <FontAwesomeIcon icon={faSync} spin={isRefreshing} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        <StatsCards
          statsLoading={loading}
          totalTrades={tradeStats.totalTrades}
          completedTrades={tradeStats.completedTrades}
          tradeVolume={tradeStats.tradeVolume}
        />
      </div>
      
      {renderInProgressTrades()}
      
      <div className="trades-content-panel">
        <div className="trades-tabs">
          <button 
            className={`trades-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => handleTabChange('active')}
          >
            <FontAwesomeIcon icon={faExchangeAlt} />
            Active Trades
            {activeTradesData?.trades?.length > 0 && (
              <span className="trades-tab-badge">{activeTradesData.trades.length}</span>
            )}
          </button>
          
          <button 
            className={`trades-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            <FontAwesomeIcon icon={faCalendarAlt} />
            Trade History
            {tradeHistoryData?.trades?.length > 0 && (
              <span className="trades-tab-badge">{tradeHistoryData.trades.length}</span>
            )}
          </button>
        </div>
        
        <div className="trades-filters">
          <div className="trades-search-container">
            <FontAwesomeIcon icon={faSearch} />
            <input
              type="text"
              className="trades-search-input"
              placeholder="Search by item name, trade ID, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="trades-search-clear"
                onClick={() => setSearchTerm('')}
              >
                <FontAwesomeIcon icon={faTimesCircle} />
              </button>
            )}
          </div>
          
          <div className="trades-filter-actions">
            <div className="trades-filter-group">
              <span className="trades-filter-label">Role:</span>
              <select
                className="trades-filter-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="buyer">As Buyer</option>
                <option value="seller">As Seller</option>
              </select>
            </div>
            
            <div className="trades-filter-group">
              <span className="trades-filter-label">Sort:</span>
              <select
                className="trades-filter-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
              </select>
            </div>
            
            {(searchTerm || roleFilter !== 'all' || sortOrder !== 'newest') && (
              <button 
                className="trades-filter-clear"
                onClick={clearFilters}
              >
                <FontAwesomeIcon icon={faFilter} /> Clear Filters
              </button>
            )}
          </div>
        </div>
        
        <div className="trades-content">
          {getContentState()}
        </div>
      </div>
    </div>
  );
};

export default Trades; 