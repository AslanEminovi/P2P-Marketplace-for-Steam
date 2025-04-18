import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate as formatDateUtil } from '../utils/format';
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
  faCalendarAlt,
  faInfoCircle,
  faSortAmountDown,
  faSort
} from '@fortawesome/free-solid-svg-icons';
import '../styles/Trades.css';

// Redux imports
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchTradesAsync, 
  fetchActiveTradesAsync, 
  selectAllTrades, 
  selectTradeStatus, 
  selectTradeError, 
  selectTradeStats, 
  selectTradesLoading, 
  selectTradesError,
  fetchTradeHistoryAsync
} from '../redux/slices/tradesSlice';
import { selectActiveTradesData, selectTradeHistoryData } from '../redux/selectors/tradesSelectors';
import StatsCards from '../components/StatsCards';
import { tradeStatusVariants } from '../utils/statusUtils';
import LoadingSpinner from '../components/LoadingSpinner';

const Trades = ({ user }) => {
  // Redux hooks
  const dispatch = useDispatch();
  const allTrades = useSelector(selectAllTrades);
  const { loading, lastFetched } = useSelector(selectTradeStatus);
  const error = useSelector(selectTradeError);
  const tradeStats = useSelector(selectTradeStats);

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
  const [inProgressHovered, setInProgressHovered] = useState(null);

  useEffect(() => {
    if (user?._id) {
      setCurrentUserId(user._id);
    }
  }, [user]);

  useEffect(() => {
    // Fetch trades on component mount and when refreshKey changes
    dispatch(fetchTradesAsync());
    
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
          dispatch(fetchTradesAsync());
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
    dispatch(fetchTradesAsync());
    dispatch(fetchActiveTradesAsync());
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
    const tradesForTab = activeTab === 'active'
      ? allTrades.filter(trade => ["created", "pending", "processing"].includes(trade.status))
      : allTrades.filter(trade => ["completed", "canceled", "declined"].includes(trade.status));

    return tradesForTab.filter(trade => {
      // Apply search filter if exists
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const itemNameMatch = trade.item?.name?.toLowerCase().includes(searchLower);
        const idMatch = trade.tradeId?.toLowerCase().includes(searchLower);
        const sellerMatch = trade.seller?.username?.toLowerCase().includes(searchLower);
        const buyerMatch = trade.buyer?.username?.toLowerCase().includes(searchLower);
        
        if (!(itemNameMatch || idMatch || sellerMatch || buyerMatch)) {
          return false;
        }
      }

      // Apply role filter if not "all"
      if (roleFilter !== 'all') {
        if (roleFilter === 'seller' && trade.seller?._id !== currentUserId) {
          return false;
        }
        if (roleFilter === 'buyer' && trade.buyer?._id !== currentUserId) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Apply sorting
      if (sortOrder === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortOrder === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortOrder === 'price-high') {
        return b.price - a.price;
      } else if (sortOrder === 'price-low') {
        return a.price - b.price;
      }
      return 0;
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setSortOrder('newest');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    // Get month abbreviated name
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    
    // Get day
    const day = date.getDate();
    
    // Get year
    const year = date.getFullYear();
    
    // Get hour, ensuring 12-hour format
    let hour = date.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour || 12; // Hour '0' should be '12'
    
    // Get minutes with leading zero if needed
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${month} ${day}, ${year} at ${hour}:${minutes} ${ampm}`;
  };

  const getAvatarUrl = (userObj) => {
    if (!userObj) return '/images/default-avatar.png';
    return userObj.avatar || '/images/default-avatar.png';
  };

  const renderInProgressTrades = () => {
    // Only show in-progress trades section on active tab
    if (activeTab !== 'active') return null;
    
    // Get trades that require immediate attention
    const inProgressTrades = allTrades.filter(
      trade => 
        trade.status === 'processing' ||
        trade.status === 'pending'
    );
    
    if (inProgressTrades.length === 0) return null;
    
    return (
      <div className="trades-in-progress">
        <h2>Continue Your Trade</h2>
        <p className="in-progress-description">
          You have {inProgressTrades.length} {inProgressTrades.length === 1 ? 'trade' : 'trades'} in progress. Continue where you left off.
        </p>
        
        <div className="in-progress-list">
          {inProgressTrades.map((trade) => (
            <Link
              key={trade._id}
              to={`/trades/${trade._id}`}
              className="in-progress-trade"
              onMouseEnter={() => setInProgressHovered(trade._id)}
              onMouseLeave={() => setInProgressHovered(null)}
            >
              <div className="in-progress-trade-content">
                <div className="in-progress-trade-image">
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
                </div>
                <div className="in-progress-trade-details">
                  <h3>{trade.item?.name || "Unknown Item"}</h3>
                  <div className="in-progress-price">
                    <FontAwesomeIcon icon={faMoneyBillWave} />
                    <span>${parseFloat(trade.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="in-progress-date">
                    <FontAwesomeIcon icon={faCalendarAlt} />
                    <span>{formatDate(trade.createdAt)}</span>
                  </div>
                </div>
                <div className="in-progress-status">
                  <span 
                    className={`status-badge ${trade.status}`}
                  >
                    {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="in-progress-action">
                <span className={inProgressHovered === trade._id ? "action-text-hover" : "action-text"}>
                  Continue Trade <FontAwesomeIcon icon={faAngleRight} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;

    if (activeTab === 'active') {
      return (
        <div className="trades-empty-state">
          <FontAwesomeIcon icon={faExchangeAlt} size="3x" />
          <h3>No Active Trades</h3>
          <p>You don't have any active trades at the moment.</p>
          <Link to="/marketplace" className="btn btn-primary">
            Browse Marketplace
          </Link>
        </div>
      );
    } else {
      return (
        <div className="trades-empty-state">
          <FontAwesomeIcon icon={faInfoCircle} size="3x" />
          <h3>No Trade History</h3>
          <p>You don't have any completed or canceled trades.</p>
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
    
    dispatch(fetchTradesAsync()).then(() => {
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
    dispatch(fetchTradesAsync());
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
          <LoadingSpinner />
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
                    <span>${parseFloat(trade.price || 0).toFixed(2)}</span>
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
            {isRefreshing ? (
              <LoadingSpinner size="small" />
            ) : (
              <span>Refresh</span>
            )}
          </button>
        </div>
        
        <StatsCards
          statsLoading={loading}
          totalTrades={tradeStats?.totalTrades || 0}
          completedTrades={tradeStats?.completedTrades || 0}
          tradeVolume={tradeStats?.tradeVolume || 0}
          activeTrades={tradeStats?.activeTrades || 0}
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