import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, API_URL } from '../config/constants';
import '../styles/Trades.css';

// Constants for localStorage keys
const TRADES_STORAGE_KEY = 'cs2_marketplace_trades';
const TRADES_TIMESTAMP_KEY = 'cs2_marketplace_trades_timestamp';
// Trade details constants from TradeDetails.jsx
const TRADE_DETAILS_KEY_PREFIX = 'cs2_trade_details_';
const TRADE_TIMESTAMP_KEY_PREFIX = 'cs2_trade_timestamp_';
// Cache expiration time in milliseconds (10 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;
const TRADE_CACHE_EXPIRATION = 30 * 60 * 1000;

const Trades = ({ user }) => {
  const [trades, setTrades] = useState([]);
  const [activeCachedTrades, setActiveCachedTrades] = useState([]);
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
    cancelledTrades: 0,
    totalValue: 0
  });
  const navigate = useNavigate();

  // Effect to find active trades in localStorage on component mount
  useEffect(() => {
    // Load any active trades from localStorage
    const recoverActiveTrades = () => {
      try {
        // Search for all trade detail items in localStorage
        const activeTradesFromStorage = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(TRADE_DETAILS_KEY_PREFIX)) {
            const timestampKey = key.replace(TRADE_DETAILS_KEY_PREFIX, TRADE_TIMESTAMP_KEY_PREFIX);
            const timestamp = localStorage.getItem(timestampKey);
            
            // Only recover trades with a valid timestamp that aren't too old
            if (timestamp) {
              const now = Date.now();
              const cacheValid = (now - parseInt(timestamp, 10) < TRADE_CACHE_EXPIRATION);
              
              if (cacheValid) {
                try {
                  const tradeData = JSON.parse(localStorage.getItem(key));
                  
                  // Only include active trades (not completed, cancelled, or failed)
                  if (tradeData && !['completed', 'cancelled', 'failed'].includes(tradeData.status)) {
                    // Extract the trade ID from the key
                    const tradeId = key.replace(TRADE_DETAILS_KEY_PREFIX, '');
                    
                    // Add trade ID property if it doesn't exist
                    if (!tradeData._id) {
                      tradeData._id = tradeId;
                    }
                    
                    activeTradesFromStorage.push(tradeData);
                  }
                } catch (err) {
                  console.warn(`Error parsing trade data for key ${key}`, err);
                }
              }
            }
          }
        }
        
        // Sort by timestamp, most recent first
        activeTradesFromStorage.sort((a, b) => {
          return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
        });
        
        setActiveCachedTrades(activeTradesFromStorage);
      } catch (err) {
        console.warn('Error recovering active trades from localStorage', err);
      }
    };
    
    recoverActiveTrades();
  }, []);

  useEffect(() => {
    loadTrades();
    
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
      
      const cancelledTrades = trades.filter(trade => 
        ['cancelled', 'failed'].includes(trade?.status)
      );
      
      const totalValue = trades.reduce((sum, trade) => sum + (Number(trade?.price) || 0), 0);
      
      setStats({
        totalTrades: trades.length,
        activeTrades: activeTrades.length,
        completedTrades: completedTrades.length,
        cancelledTrades: cancelledTrades.length,
        totalValue
      });

      // Log trade status counts for debugging
      console.log("Trade status breakdown:", {
        total: trades.length,
        active: activeTrades.length,
        completed: completedTrades.length,
        cancelled: cancelledTrades.length,
        unknown: trades.length - (activeTrades.length + completedTrades.length + cancelledTrades.length)
      });
      
      // Log each trade status to help investigate
      console.log("Trade statuses:", trades.map(trade => ({ 
        id: trade._id,
        status: trade.status,
        isActive: ['awaiting_seller', 'offer_sent', 'awaiting_confirmation', 'created', 'pending'].includes(trade?.status),
        isCompleted: ['completed'].includes(trade?.status),
        isCancelled: ['cancelled', 'failed'].includes(trade?.status)
      })));
    }
  }, [trades]);

  // Load trades - first from localStorage cache if valid, then from API
  const loadTrades = async () => {
    setLoading(true);
    
    try {
      // First check if we have cached trades in localStorage
      const cachedTrades = localStorage.getItem(TRADES_STORAGE_KEY);
      const cachedTimestamp = localStorage.getItem(TRADES_TIMESTAMP_KEY);
      
      // Calculate if the cache is still valid
      const now = Date.now();
      const cacheValid = cachedTimestamp && (now - parseInt(cachedTimestamp, 10) < CACHE_EXPIRATION);
      
      if (cachedTrades && cacheValid) {
        console.log('Loading trades from localStorage cache');
        setTrades(JSON.parse(cachedTrades));
        setLoading(false);
      }
      
      // Always fetch fresh data from API, but if we have cache, don't show loading state
      await fetchTrades();
    } catch (err) {
      console.error('Error loading trades:', err);
      setError('Failed to load trade history. Please try again later.');
      setLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      // If we're not already showing cached data, set loading to true
      if (trades.length === 0) {
        setLoading(true);
      }
      
      const response = await axios.get(`${API_URL}/trades/history`, { 
        withCredentials: true 
      });
      
      if (Array.isArray(response.data)) {
        const tradesWithImages = await enhanceTradesWithUserImages(response.data);
        
        // Save to state
        setTrades(tradesWithImages);
        
        // Save to localStorage with timestamp
        try {
          localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(tradesWithImages));
          localStorage.setItem(TRADES_TIMESTAMP_KEY, Date.now().toString());
        } catch (storageError) {
          // If localStorage fails (e.g., quota exceeded), just log it but continue
          console.warn('Failed to save trades to localStorage:', storageError);
        }
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
      
      // Check all possible locations for the item image
      if (trade.item) {
        // First check if marketHashName exists to set itemName
        if (trade.item.marketHashName && !trade.itemName) {
          trade.itemName = trade.item.marketHashName;
        }
        
        // Then try all possible image properties in order of likelihood
        if (trade.item.iconUrl) {
          trade.itemImage = trade.item.iconUrl;
        } else if (trade.item.iconURL) {
          trade.itemImage = trade.item.iconURL;
        } else if (trade.item.icon) {
          trade.itemImage = trade.item.icon;
        } else if (trade.item.imageUrl) {
          trade.itemImage = trade.item.imageUrl;
        } else if (trade.item.image) {
          trade.itemImage = trade.item.image;
        }
      }
      
      // If we still don't have an image, check at the trade level
      if (!trade.itemImage) {
        if (trade.itemIconUrl) {
          trade.itemImage = trade.itemIconUrl;
        } else if (trade.iconUrl) {
          trade.itemImage = trade.iconUrl;
        } else if (trade.imageUrl) {
          trade.itemImage = trade.imageUrl;
        }
      }
      
      // Extract hash name from URL if itemName is still missing
      if (!trade.itemName && trade.itemImage) {
        const imagePath = trade.itemImage.split('/').pop();
        const decodedPath = decodeURIComponent(imagePath);
        if (decodedPath.includes('.png')) {
          trade.itemName = decodedPath.split('.png')[0];
        }
      }
      
      // Finally, use a fallback name if still missing
      if (!trade.itemName) {
        trade.itemName = "CS2 Item";
      }
      
      // Log the enhanced trade for debugging
      console.log('Enhanced trade:', trade);
      
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
    
    // Try all possible avatar properties in order
    return userObj.avatar || 
           userObj.avatarfull || 
           userObj.avatarUrl || 
           userObj.avatarMedium ||
           userObj.avatarSmall ||
           '/default-avatar.png';
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  // Function to render the in-progress trades section
  const renderInProgressTrades = () => {
    if (activeCachedTrades.length === 0) {
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
          These trades were in progress when you last navigated away. Click to continue where you left off.
        </p>
        
        <div className="in-progress-trades-list">
          {activeCachedTrades.map(trade => (
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
        
        <div className="trades-stat-card cancelled">
          <div className="trades-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div className="trades-stat-content">
            <div className="trades-stat-label">Cancelled</div>
            <div className="trades-stat-value">{stats.cancelledTrades}</div>
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
          {(stats.completedTrades + stats.cancelledTrades) > 0 && 
            <span className="trades-tab-badge">{stats.completedTrades + stats.cancelledTrades}</span>
          }
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