import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate } from '../utils/formatters';
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
  faChevronRight,
  faChevronDown,
  faSortAmountDown,
  faUser,
  faTimes,
  faUserTag,
  faTag
} from '@fortawesome/free-solid-svg-icons';
import '../styles/Trades.css';

// Redux imports
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTrades,
  fetchTradeStats,
  selectTrades,
  selectTradeStats,
  selectTradesLoading,
  selectTradeError,
  selectStatsLoading,
  selectActiveTrades,
  selectHistoricalTrades
} from '../redux/slices/tradesSlice';
import StatsCards from '../components/StatsCards';
import TradeItem from '../components/TradeItem';

const Trades = ({ user }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Redux state
  const trades = useSelector(selectTrades);
  const stats = useSelector(selectTradeStats);
  const loading = useSelector(selectTradesLoading);
  const statsLoading = useSelector(selectStatsLoading);
  const error = useSelector(selectTradeError);
  const activeTrades = useSelector(selectActiveTrades);
  const historicalTrades = useSelector(selectHistoricalTrades);
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [activeTab, setActiveTab] = useState('active');

  // Function to filter and sort trades
  const getFilteredTrades = () => {
    const tradesSource = activeTab === 'active' ? activeTrades : historicalTrades;
    
    let filtered = [...tradesSource];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(trade => {
        return (
          (trade._id && trade._id.toLowerCase().includes(term)) ||
          (trade.itemName && trade.itemName.toLowerCase().includes(term)) ||
          (trade.buyer?.displayName && trade.buyer.displayName.toLowerCase().includes(term)) ||
          (trade.seller?.displayName && trade.seller.displayName.toLowerCase().includes(term))
        );
      });
    }
    
    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(trade => {
        return (
          (roleFilter === 'buyer' && trade.isUserBuyer) ||
          (roleFilter === 'seller' && trade.isUserSeller)
        );
      });
    }
    
    // Sort trades
    switch (sortOrder) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'highest':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'lowest':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      default:
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    return filtered;
  };

  // Filtered trades based on search, filters and active tab
  const filteredTrades = useMemo(() => {
    return getFilteredTrades();
  }, [trades, activeTab, searchTerm, roleFilter, sortOrder]);

  // Load trades on component mount
  useEffect(() => {
    handleRefresh();
  }, [dispatch]);

  // Function to refresh trades
  const handleRefresh = () => {
    dispatch(fetchTrades());
    dispatch(fetchTradeStats());
  };
  
  // Function to clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setSortOrder('newest');
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

  // Function to render in-progress trades that need attention
  const renderInProgressTrades = () => {
    const inProgressTrades = trades.filter(trade => 
      (trade.status === 'PENDING' || trade.status === 'ACCEPTED' || trade.status === 'PROCESSING') && 
      ((trade.isUserBuyer && trade.buyerAction) || (trade.isUserSeller && trade.sellerAction))
    );

    if (inProgressTrades.length === 0) return null;

    return (
      <div className="in-progress-trades">
        {inProgressTrades.map(trade => (
          <motion.div
            key={`in-progress-${trade._id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="continue-trade-card"
          >
            <div className="continue-trade-content">
              <h3 className="continue-trade-title">
                Continue your trade: {trade.itemName || trade.item?.marketHashName || 'Unknown Item'}
              </h3>
              <p className="continue-trade-description">
                {trade.isUserBuyer ? 'You are buying this item' : 'You are selling this item'}.
                This trade requires your attention to proceed.
              </p>
            </div>
            
            <div className="continue-trade-action">
              <Link to={`/trades/${trade._id}`} className="continue-trade-button">
                <FontAwesomeIcon icon={faClock} />
                Continue Trade
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Function to render trade history
  const renderTradeHistory = () => {
    if (filteredTrades.length === 0) return null;
    
    return (
      <div className="trades-list">
        <AnimatePresence mode="popLayout">
          {filteredTrades.map((trade, index) => (
            <TradeItem 
              key={trade._id} 
              trade={trade} 
              index={index} 
            />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  // Function to render empty state when no trades are found
  const renderEmptyState = (tabType) => {
    const isActive = tabType === 'active';
    
    return (
      <div className="trades-empty" style={{
        background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
        borderRadius: '16px',
        padding: '40px 30px',
        textAlign: 'center',
        marginTop: '20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }}>
        <FontAwesomeIcon 
          icon={isActive ? faExchangeAlt : faHistory} 
          size="2x" 
          style={{ 
            marginBottom: '20px', 
            opacity: 0.8,
            color: '#4b5563'
          }} 
        />
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '12px'
        }}>
          {isActive 
            ? 'No active trades found' 
            : 'No trade history found'}
        </h3>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '24px',
          maxWidth: '400px',
          margin: '0 auto 24px'
        }}>
          {isActive 
            ? 'You don\'t have any active trades at the moment.' 
            : 'You haven\'t completed any trades yet.'}
        </p>
        <Link to="/marketplace" className="trades-empty-action" style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '15px',
          fontWeight: '500',
          textDecoration: 'none',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
        }}>
          <FontAwesomeIcon icon={faStore} />
          Browse Marketplace
        </Link>
      </div>
    );
  };

  // Function to render the header with stats
  const renderHeader = () => {
    return (
      <div className="trades-header">
        <div className="trades-header-backdrop" style={{
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #38b2ac 100%)',
          opacity: 1
        }}></div>
        <div className="trades-header-content">
          <div className="trades-header-title-section">
            <h1>
              <FontAwesomeIcon icon={faExchangeAlt} className="title-icon" />
              Your Trades
            </h1>
            <p>Manage your ongoing trades and view your trading history</p>
            
            <button
              className="trades-refresh-button"
              onClick={handleRefresh}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(5px)',
                borderRadius: '8px',
                padding: '10px 16px',
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? (
                <span className="trades-refresh-loading"></span>
              ) : (
                <FontAwesomeIcon icon={faSync} />
              )}
              {loading ? 'Refreshing...' : 'Refresh Trades'}
            </button>
          </div>
          
          <div className="trades-header-stats-section">
            <StatsCards
              stats={stats}
              statsLoading={statsLoading}
            />
          </div>
        </div>
      </div>
    );
  };

  // Function to render the tabs
  const renderTabs = () => {
    return (
      <div className="trades-tabs" style={{ 
        background: 'linear-gradient(to right, #f8f9fa, #e9ecef)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }}>
        <button
          className={`trades-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
          style={{
            background: activeTab === 'active' ? 'linear-gradient(135deg, #ffffff, #f5f7fa)' : 'transparent',
            boxShadow: activeTab === 'active' ? '0 2px 10px rgba(0, 0, 0, 0.05)' : 'none'
          }}
        >
          <FontAwesomeIcon icon={faExchangeAlt} />
          Active Trades
          {activeTrades.length > 0 && (
            <span className="trades-tab-badge" style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
            }}>{activeTrades.length}</span>
          )}
        </button>
        <button
          className={`trades-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{
            background: activeTab === 'history' ? 'linear-gradient(135deg, #ffffff, #f5f7fa)' : 'transparent',
            boxShadow: activeTab === 'history' ? '0 2px 10px rgba(0, 0, 0, 0.05)' : 'none'
          }}
        >
          <FontAwesomeIcon icon={faHistory} />
          Trade History
          {historicalTrades.length > 0 && (
            <span className="trades-tab-badge" style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
            }}>{historicalTrades.length}</span>
          )}
        </button>
      </div>
    );
  };

  // Function to render the filters
  const renderFilters = () => {
    const hasFilters = searchTerm || roleFilter !== 'all' || sortOrder !== 'newest';
    
    return (
      <div className="trades-filters" style={{
        background: 'linear-gradient(135deg, #ffffff, #fafafa)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        borderRadius: '12px'
      }}>
        <div className="trades-search-container">
          <FontAwesomeIcon icon={faSearch} style={{ color: '#4b5563' }} />
          <input
            type="text"
            placeholder="Search by ID, item name, or user..."
            className="trades-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '14px 15px 14px 40px',
              fontSize: '15px',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.02)'
            }}
          />
          {searchTerm && (
            <button 
              className="trades-search-clear"
              onClick={() => setSearchTerm('')}
              style={{ color: '#6b7280' }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        
        <div className="trades-filter-actions" style={{ gap: '20px' }}>
          <div className="trades-filter-group">
            <span className="trades-filter-label" style={{ color: '#4b5563', fontWeight: '600' }}>
              <FontAwesomeIcon icon={faUserTag} />
              Role
            </span>
            <select
              className="trades-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '10px 35px 10px 15px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
                fontWeight: '500',
                color: '#4b5563',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              <option value="all">All Roles</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>
          </div>
          
          <div className="trades-filter-group">
            <span className="trades-filter-label" style={{ color: '#4b5563', fontWeight: '600' }}>
              <FontAwesomeIcon icon={faSortAmountDown} />
              Sort
            </span>
            <select
              className="trades-filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{
                padding: '10px 35px 10px 15px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
                fontWeight: '500',
                color: '#4b5563',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Value</option>
              <option value="lowest">Lowest Value</option>
            </select>
          </div>
          
          {hasFilters && (
            <button 
              className="trades-filter-clear"
              onClick={clearFilters}
              style={{
                backgroundColor: '#f3f4f6',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: '500',
                color: '#4b5563',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="trades-container">
      {renderHeader()}
      {renderTabs()}
      {renderFilters()}
      
      {loading ? (
        <div className="trades-loading" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 0',
          background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
          borderRadius: '16px',
          marginTop: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: '#3b82f6', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#4b5563', fontWeight: '500' }}>Loading your trades...</p>
        </div>
      ) : error ? (
        <div className="trades-error" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
          borderRadius: '16px',
          marginTop: '20px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
        }}>
          <FontAwesomeIcon icon={faExclamationCircle} size="2x" style={{ color: '#ef4444', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#b91c1c', fontWeight: '500', marginBottom: '20px' }}>{error}</p>
          <button onClick={handleRefresh} className="trades-retry-button" style={{
            background: 'linear-gradient(135deg, #f87171, #ef4444)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
          }}>
            <FontAwesomeIcon icon={faSync} />
            Try Again
          </button>
        </div>
      ) : (
        <div className="trades-content">
          {activeTab === 'active' && (
            <>
              {renderInProgressTrades()}
              {renderTradeHistory()}
              {filteredTrades.length === 0 && renderEmptyState('active')}
            </>
          )}
          
          {activeTab === 'history' && (
            <>
              {renderTradeHistory()}
              {filteredTrades.length === 0 && renderEmptyState('history')}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Trades; 