import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/languageUtils';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import '../styles/Marketplace.css';
import '../styles/MarketplaceCustom.css';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { jwtDecode } from 'jwt-decode';

// Component imports
import OfferModal from '../components/OfferModal';
import UserListings from '../components/UserListings';
import ItemDetails from '../components/ItemDetails';
import TradePanel from '../components/TradePanel';
import ItemCard3D from '../components/ItemCard3D';
import TradeUrlPrompt from '../components/TradeUrlPrompt';
import LiveActivityFeed from '../components/LiveActivityFeed';
import SocketConnectionIndicator from '../components/SocketConnectionIndicator';
import SellModal from '../components/SellModal';

// Add CSS for refresh animation
const styles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.refresh-button-spinning svg {
  animation: spin 1s linear infinite;
}
`;

function Marketplace({ user }) {
  // State management
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showListingsPanel, setShowListingsPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [myListings, setMyListings] = useState([]);
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [tradePanelOpen, setTradePanelOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState(null);
  const [itemView, setItemView] = useState('grid');
  const [showTradeUrlPrompt, setShowTradeUrlPrompt] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [sortOption, setSortOption] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for marketplace statistics with default values
  const [marketStats, setMarketStats] = useState({
    totalItems: 0,
    totalSales: 0,
    activeListings: 0,
    onlineUsers: 0
  });
  
  // Ref to store the last valid stats to prevent flickering
  const lastValidStatsRef = useRef(null);

  // Check if user is authenticated - get from Redux
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Load cached stats on component mount (single instance)
  useEffect(() => {
    try {
      // Try to load cached stats from localStorage
      const cachedStats = JSON.parse(localStorage.getItem('marketplace_stats'));
      if (cachedStats && typeof cachedStats === 'object') {
        console.log('Loading cached marketplace stats:', cachedStats);
        setMarketStats(prev => ({
          ...prev,
          ...cachedStats
        }));
        // Store in ref for future use
        lastValidStatsRef.current = cachedStats;
      }
    } catch (err) {
      console.error('Error loading cached stats:', err);
    }
  }, []);

  const [showActivityFeed, setShowActivityFeed] = useState(true);
  const itemsPerPage = 12;
  const [showSellModal, setShowSellModal] = useState(false);
  
  // Add style tag for animations
  useEffect(() => {
    // Insert style tag
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
    
    // Cleanup on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Ref to track connection status
  const connectionStatusRef = useRef({
    wasConnected: false,
    lastRefresh: Date.now()
  });

  const { t } = useTranslation();

  // Sort options
  const sortOptions = [
    { id: 'latest', label: 'Latest' },
    { id: 'price_asc', label: 'Price: Low to High' },
    { id: 'price_desc', label: 'Price: High to Low' },
    { id: 'popular', label: 'Most Popular' }
  ];

  // Fetch items with filters
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        sort: sortOption,
        search: searchQuery,
        categories: activeFilters.join(',')
      });

      // Don't send credentials for public marketplace view
      const res = await axios.get(`${API_URL}/marketplace?${params}`);

      if (res.data && Array.isArray(res.data.items)) {
        setItems(res.data.items);
        setFilteredItems(res.data.items);
        
        // Cache the items for future use
        try {
          localStorage.setItem('cachedMarketplaceItems', JSON.stringify(res.data.items));
          localStorage.setItem('cachedMarketplaceTimestamp', Date.now().toString());
        } catch (cacheErr) {
          console.error('Error caching items:', cacheErr);
        }
        
        // Update market stats if available
        if (res.data.stats) {
          updateMarketStats(res.data.stats);
        }
        
        // Store last successful fetch time
        localStorage.setItem('lastMarketplaceFetch', Date.now().toString());
      } else {
        console.error('Invalid response format:', res.data);
        setItems([]);
        setFilteredItems([]);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      
      // Use cached items if available
      try {
        const cachedItems = JSON.parse(localStorage.getItem('cachedMarketplaceItems'));
        const cachedTimestamp = localStorage.getItem('cachedMarketplaceTimestamp');
        
        // Check if we have cached items and they're not too old (less than 5 minutes)
        if (
          cachedItems && 
          Array.isArray(cachedItems) && 
          cachedItems.length > 0 && 
          cachedTimestamp && 
          (Date.now() - Number(cachedTimestamp)) < 5 * 60 * 1000
        ) {
          console.log('Using cached marketplace items from', new Date(Number(cachedTimestamp)).toLocaleTimeString());
          setItems(cachedItems);
          setFilteredItems(cachedItems);
        } else {
          setItems([]);
          setFilteredItems([]);
        }
      } catch (cacheErr) {
        console.error('Error reading cached items:', cacheErr);
        setItems([]);
        setFilteredItems([]);
      }
      
      toast.error(t('errors.fetchItems'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortOption, searchQuery, activeFilters, t, updateMarketStats]);

  // Function to fetch market stats with caching
  const fetchMarketStats = useCallback(async () => {
    try {
      // Check if we have cached stats in localStorage
      const cachedStats = localStorage.getItem('marketStats');
      const cachedTimestamp = localStorage.getItem('marketStatsTimestamp');
      
      // Use cached stats if they exist and are less than 5 minutes old
      if (cachedStats && cachedTimestamp) {
        const parsedStats = JSON.parse(cachedStats);
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        
        // If cache is less than 5 minutes old, use it immediately
        if (now - timestamp < 5 * 60 * 1000 && isValidStats(parsedStats)) {
          console.log('Using cached market stats');
          setMarketStats(parsedStats);
          lastValidStatsRef.current = parsedStats;
        }
      }
      
      // Fetch fresh stats from API regardless of cache
      console.log('Fetching fresh market stats');
      const response = await axios.get('/api/marketplace/stats');
      const fetchedStats = response.data;
      
      // Validate stats before updating state
      if (isValidStats(fetchedStats)) {
        console.log('Valid stats received:', fetchedStats);
        setMarketStats(fetchedStats);
        lastValidStatsRef.current = fetchedStats;
        
        // Cache the stats with current timestamp
        localStorage.setItem('marketStats', JSON.stringify(fetchedStats));
        localStorage.setItem('marketStatsTimestamp', Date.now().toString());
      } else {
        console.warn('Received invalid stats from API:', fetchedStats);
        
        // Fall back to last valid stats if available
        if (lastValidStatsRef.current) {
          setMarketStats(lastValidStatsRef.current);
        }
      }
    } catch (error) {
      console.error('Error fetching market stats:', error);
      
      // Fall back to last valid stats if available
      if (lastValidStatsRef.current) {
        setMarketStats(lastValidStatsRef.current);
      }
    }
  }, []);

  // Function to validate stats object
  const isValidStats = useCallback((stats) => {
    if (!stats || typeof stats !== 'object') return false;
    
    // Check that all required fields are non-negative numbers
    const requiredFields = ['totalItems', 'totalSales', 'activeListings', 'onlineUsers'];
    return requiredFields.every(field => 
      typeof stats[field] === 'number' && 
      !isNaN(stats[field]) && 
      stats[field] >= 0
    );
  }, []);

  // Function to handle stats updates from socket
  const handleStatsUpdate = useCallback((updatedStats) => {
    console.log('Received market stats update:', updatedStats);
    
    if (isValidStats(updatedStats)) {
      console.log('Updating stats from socket');
      setMarketStats(updatedStats);
      lastValidStatsRef.current = updatedStats;
      
      // Update cache with latest stats
      localStorage.setItem('marketStats', JSON.stringify(updatedStats));
      localStorage.setItem('marketStatsTimestamp', Date.now().toString());
    } else {
      console.warn('Received invalid stats from socket:', updatedStats);
    }
  }, [isValidStats]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_URL}/user/profile`, {
        withCredentials: true
      });
      
      setUserProfile(response.data);
      
      // Show trade URL prompt if it's missing
      if (!response.data.tradeUrl) {
        setShowTradeUrlPrompt(true);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }, [user]);

  // Fetch user listings
  const fetchUserListings = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API_URL}/marketplace/my-listings`, {
        withCredentials: true
      });
      setMyListings(response.data || []);
    } catch (err) {
      console.error('Error fetching user listings:', err);
      setMyListings([]);
    }
  }, [user]);

  // Add a useEffect to handle socket stats updates, modified to use caching
  useEffect(() => {
    // Socket handler for stats updates
    const handleStatsUpdate = (statsData) => {
      console.log('Received stats update from socket:', statsData);
      
      if (!statsData) return;
      
      // Create new stats object, using existing values as fallback
      const newStats = {
        totalItems: statsData.activeListings ?? marketStats.activeListings,
        totalSales: statsData.totalSales ?? marketStats.totalSales,
        activeListings: statsData.activeListings ?? marketStats.activeListings,
        onlineUsers: statsData.onlineUsers ?? marketStats.onlineUsers,
      };
      
      // Only update if we have meaningful data
      if (newStats.activeListings > 0 || newStats.totalItems > 0) {
        setMarketStats(newStats);
        lastValidStatsRef.current = newStats;
        localStorage.setItem('cachedMarketStats', JSON.stringify(newStats));
      }
    };
    
    // Register socket handler
    socketService.on('stats_update', handleStatsUpdate);
    
    // Request stats update when component mounts
    if (socketService.isConnected()) {
      socketService.requestStats();
    } else {
      socketService.reconnect();
      setTimeout(() => {
        if (socketService.isConnected()) {
          socketService.requestStats();
        }
      }, 500);
    }
    
    return () => {
      socketService.off('stats_update', handleStatsUpdate);
    };
  }, [marketStats]);

  // Check if token is about to expire and refresh it
  useEffect(() => {
    if (!auth.token) return;
    
    const checkTokenExpiration = () => {
      try {
        const decoded = jwtDecode(auth.token);
        const currentTime = Date.now() / 1000;
        
        // If token expires in less than 5 minutes (300 seconds), notify user
        if (decoded.exp - currentTime < 300) {
          console.log('Token expiring soon, should reconnect shortly');
          toast.warning('Your session will expire soon', { duration: 5000 });
          
          // Reconnect socket anyway to ensure it's using the latest token
          setTimeout(() => {
            socketService.disconnect();
            socketService.connect(auth.token);
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
      }
    };
    
    // Check token on mount
    checkTokenExpiration();
    
    // Set up interval to check token every minute
    const interval = setInterval(checkTokenExpiration, 60000);
    
    return () => clearInterval(interval);
  }, [auth.token]);

  // Set up socket connection for marketplace stats with fallback
  useEffect(() => {
    // Set current page for socket service
    socketService.setCurrentPage('marketplace');
    
    // Function to handle connection status
    const handleConnectionStatus = (isConnected) => {
      if (isConnected) {
        console.log('Socket connected, requesting stats');
        // Request stats only if connected
        socketService.requestStats();
      } else {
        console.log('Socket disconnected, using HTTP fallback for stats');
        // If socket disconnected, fetch stats via HTTP
        fetchMarketStats();
      }
    };
    
    // Register connection status handlers
    socketService.onConnected(() => handleConnectionStatus(true));
    socketService.onDisconnected(() => handleConnectionStatus(false));
    
    // Connect socket if not already connected
    if (!socketService.isConnected()) {
      console.log('Connecting socket from Marketplace component');
      socketService.connect(auth.token);
    } else {
      // Already connected, request stats
      socketService.requestStats();
    }
    
    // Set up listener for marketplace stats
    socketService.onMarketStats(handleStatsUpdate);
    
    // Fetch stats on mount regardless of socket state
    fetchMarketStats();
    
    // Fetch initial items
    fetchItems();
    
    // Clean up on unmount
    return () => {
      console.log('Cleaning up Marketplace component');
      socketService.offMarketStats();
      socketService.onConnected(null); // Remove the callback
      socketService.onDisconnected(null); // Remove the callback
      socketService.setCurrentPage(null);
    };
  }, [fetchMarketStats, handleStatsUpdate, auth.token, fetchItems]);

  // Function to update market stats with validation
  const updateMarketStats = useCallback((newStats) => {
    // Validate stats and use last valid values for any missing/invalid properties
    const validatedStats = {
      totalItems: newStats.activeListings >= 0 ? newStats.activeListings : lastValidStatsRef.current.activeListings,
      totalSales: newStats.totalSales >= 0 ? newStats.totalSales : lastValidStatsRef.current.totalSales,
      activeListings: newStats.activeListings >= 0 ? newStats.activeListings : lastValidStatsRef.current.activeListings,
      onlineUsers: newStats.onlineUsers >= 0 ? newStats.onlineUsers : lastValidStatsRef.current.onlineUsers,
    };
    
    // Update ref with valid stats
    lastValidStatsRef.current = validatedStats;
    
    // Update state
    setMarketStats(validatedStats);
    
    // Cache in localStorage
    try {
      localStorage.setItem('cachedMarketStats', JSON.stringify(validatedStats));
    } catch (e) {
      console.error('Error caching stats:', e);
    }
    
    return validatedStats;
  }, []);

  // Handle connection status with minimal side-effects
  useEffect(() => {
    const handleConnected = () => {
      console.log('Socket connected');
      toast.success('Connection established', { duration: 2000 });
    };
    
    const handleDisconnected = () => {
      console.log('Socket disconnected');
      toast.error('Connection lost', { duration: 3000 });
    };
    
    socketService.onConnected(handleConnected);
    socketService.onDisconnected(handleDisconnected);
    
    return () => {
      socketService.onConnected(null);
      socketService.onDisconnected(null);
    };
  }, []); // Empty dependency array - only register once

  // Handle manual refresh with retry mechanism
  const handleManualRefresh = useCallback(() => {
    console.log('Manual refresh requested');
    
    // Track refresh attempt
    const refreshAttempt = {
      timestamp: Date.now(),
      count: 1
    };
    
    // Check if we've tried recently (within 5 seconds)
    const lastRefresh = localStorage.getItem('lastManualRefresh');
    if (lastRefresh) {
      try {
        const lastRefreshData = JSON.parse(lastRefresh);
        const timeSinceLastRefresh = Date.now() - lastRefreshData.timestamp;
        
        // If last refresh was recent, increment the count
        if (timeSinceLastRefresh < 5000) {
          refreshAttempt.count = lastRefreshData.count + 1;
        }
      } catch (e) {
        console.error('Error parsing last refresh data:', e);
      }
    }
    
    // Save this refresh attempt
    localStorage.setItem('lastManualRefresh', JSON.stringify(refreshAttempt));
    
    // Track if we're refreshing
    setLoading(true);
    
    // If this is the third rapid attempt, try reconnecting the socket
    if (refreshAttempt.count >= 3) {
      console.log('Multiple refresh attempts detected, reconnecting socket');
      socketService.disconnect();
      setTimeout(() => {
        socketService.connect(auth.token);
      }, 1000);
    }
    
    // Always try to fetch items regardless of socket state
    Promise.all([
      fetchItems(),
      fetchMarketStats()
    ])
      .catch(error => {
        console.error('Error during manual refresh:', error);
        toast.error(t('errors.refresh'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchItems, fetchMarketStats, auth.token, t]);

  // Handle item click
  const handleItemClick = (item) => {
    console.log("Item clicked:", item);
    setSelectedItem(item);
    setSelectedItemId(item._id);
    setItemDetailsOpen(true);
  };

  // Handle item action (buy/offer)
  const handleItemAction = (action) => {
    setTradeAction(action);
    setTradePanelOpen(true);
  };

  // Handle trade completion
  const handleTradeComplete = () => {
    setTradePanelOpen(false);
    fetchItems();
    fetchMarketStats();
    toast.success('Trade completed successfully!');
  };

  // Handle listing completion
  const handleListingComplete = () => {
    setShowSellModal(false);
    fetchItems();
    fetchMarketStats();
    fetchUserListings();
    toast.success('Item listed successfully!');
  };

  // Handle trade URL save
  const handleTradeUrlSave = async (tradeUrl) => {
    try {
      const response = await axios.put(
        `${API_URL}/user/profile/trade-url`,
        { tradeUrl },
        { withCredentials: true }
      );

    setUserProfile(prev => ({
      ...prev,
      tradeUrl
    }));

      setShowTradeUrlPrompt(false);

      // Show success notification if available
      if (window.showNotification) {
        window.showNotification(
          'Success',
          'Trade URL has been updated successfully',
          'SUCCESS'
        );
      }
    } catch (err) {
      console.error('Error updating trade URL:', err);
      
      // Show error notification if available
      if (window.showNotification) {
        window.showNotification(
          'Error',
          'Failed to update trade URL',
          'ERROR'
        );
      }
    }
  };

  // Handle search and filters
  useEffect(() => {
    const filtered = items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.marketHashName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilters = activeFilters.length === 0 || 
        activeFilters.some(filter => item.category === filter);
      return matchesSearch && matchesFilters;
    });
    setFilteredItems(filtered);
  }, [items, searchQuery, activeFilters]);

  // Add a method to handle opening the sell modal
  const handleOpenSellModal = (item) => {
    setSelectedItem(item);
    setShowSellModal(true);
  };

  // Calculate total marketplace value
  const calculateTotalMarketValue = () => {
    if (!items || items.length === 0) return '0.00';

    const total = items.reduce((sum, item) => {
      return sum + (item.price || 0);
    }, 0);

    return total.toFixed(2);
  };

  // Find the most valuable item price
  const findMostValuableItem = () => {
    if (!items || items.length === 0) return '0.00';

    const mostValuable = items.reduce((max, item) => {
      return item.price > max ? item.price : max;
    }, 0);

    return mostValuable.toFixed(2);
  };

  // Calculate the average item price
  const calculateAveragePrice = () => {
    if (!items || items.length === 0) return '0.00';

    const total = items.reduce((sum, item) => {
      return sum + (item.price || 0);
    }, 0);

    return (total / items.length).toFixed(2);
  };

  // Render header section
  const renderHeader = () => (
    <div className="marketplace-header">
      <h1>CS2 Market</h1>
      <p className="marketplace-subtitle">Buy and sell CS2 items securely with other players</p>
      
      {/* Stats Grid like in Inventory */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        margin: '1.5rem 0',
        padding: '1.25rem',
        borderRadius: '12px',
        background: 'rgba(21, 28, 43, 0.6)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(51, 115, 242, 0.15)'
      }}>
        <div style={{
        display: 'flex',
          flexDirection: 'column',
        alignItems: 'center',
          padding: '1rem',
          background: 'rgba(31, 41, 61, 0.5)',
          borderRadius: '10px',
          border: '1px solid rgba(51, 115, 242, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '0.9rem',
            color: 'var(--gaming-text-dim)'
          }}>Active Listings</h3>
          <p style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 'bold',
            color: 'var(--gaming-text-bright)'
          }}>{marketStats.activeListings || 0}</p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem',
          background: 'rgba(31, 41, 61, 0.5)',
          borderRadius: '10px',
          border: '1px solid rgba(51, 115, 242, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '0.9rem',
            color: 'var(--gaming-text-dim)'
          }}>Most Valuable</h3>
          <p style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 'bold',
            color: '#4ade80'
          }}>${findMostValuableItem()}</p>
        </div>

    <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem',
          background: 'rgba(31, 41, 61, 0.5)',
          borderRadius: '10px',
          border: '1px solid rgba(51, 115, 242, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '0.9rem',
            color: 'var(--gaming-text-dim)'
          }}>Average Price</h3>
          <p style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 'bold',
            color: 'var(--gaming-text-bright)'
          }}>${calculateAveragePrice()}</p>
        </div>

      <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem',
          background: 'rgba(31, 41, 61, 0.5)',
          borderRadius: '10px',
          border: '1px solid rgba(51, 115, 242, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '0.9rem',
            color: 'var(--gaming-text-dim)'
          }}>Total Market Value</h3>
          <p style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 'bold',
            color: '#4ade80'
          }}>${calculateTotalMarketValue()}</p>
        </div>

        {/* Replace Active Users with Refresh Button */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: 'rgba(31, 41, 61, 0.5)',
          borderRadius: '10px',
          border: '1px solid rgba(51, 115, 242, 0.1)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={handleManualRefresh}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(51, 115, 242, 0.3)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(31, 41, 61, 0.5)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '0.9rem',
            color: 'var(--gaming-text-dim)'
          }}>Refresh Marketplace</h3>
          <div style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={loading ? 'refresh-button-spinning' : ''}
              style={{
                color: '#4ade80'
              }}
            >
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  // Render items section
  const renderItems = () => {
  if (loading) {
    return (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading items...</p>
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <div className="empty-state">
          <h3>No items found</h3>
          <p>{user ? "Try adjusting your filters or search terms" : "Sign in to list items for sale"}</p>
      </div>
    );
  }

  return (
      <div className={itemView === 'grid' ? 'items-grid' : 'items-list'}>
        {filteredItems.map((item) => (
          <ItemCard3D
            key={item._id}
            item={item}
            onClick={() => handleItemClick(item)}
            isAuthenticated={!!user}
          />
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="pagination">
        <button
          className="page-button"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          {t('common.previous')}
        </button>
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i + 1}
            className={`page-button ${currentPage === i + 1 ? 'active' : ''}`}
            onClick={() => setCurrentPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
          <button
          className="page-button"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          {t('common.next')}
        </button>
      </div>
    );
  };

  const renderUserListingsButton = () => {
    if (!user) return null;
    
    return (
          <button
        className="user-listings-button"
        onClick={() => setShowListingsPanel(true)}
            style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'linear-gradient(45deg, #4F46E5, #7C3AED)',
          color: 'white',
              border: 'none',
              borderRadius: '12px',
          padding: '1rem 1.5rem',
          fontSize: '1rem',
              fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
              transition: 'all 0.3s ease',
          zIndex: '90',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7"></path>
          <path d="M21 5.618a1 1 0 00-1.447-.894L15 7v13l5.447-2.724A1 1 0 0021 16.382V5.618z"></path>
          <rect x="9" y="7" width="6" height="13" rx="1"></rect>
              </svg>
              My Listings
        {myListings.length > 0 && (
          <span className="count">{myListings.length}</span>
            )}
          </button>
    );
  };

  return (
    <div className="marketplace-container">
      <SocketConnectionIndicator />
      
      {renderHeader()}
      
      <div className="filter-section">
          {/* Remove the long refresh button */}
          <div className="sort-container">
          <select
            className="sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{
              backgroundColor: 'rgba(31, 41, 61, 0.8)',
              color: 'white',
              border: '1px solid rgba(51, 115, 242, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              width: '100%',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              appearance: 'none', // Remove default arrow
              WebkitAppearance: 'none', // For Safari
              MozAppearance: 'none', // For Firefox
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            {sortOptions.map((option) => (
              <option 
                key={option.id} 
                value={option.id}
            style={{ 
                  backgroundColor: 'rgba(31, 41, 61, 1)',
                  color: 'white', 
                  padding: '0.5rem'
                }}
              >
                {option.label}
              </option>
            ))}
          </select>
                    </div>
                  </div>
                  
      {renderItems()}
      {renderPagination()}

      <LiveActivityFeed
        isOpen={showActivityFeed}
        onToggle={() => setShowActivityFeed(!showActivityFeed)}
      />

      <AnimatePresence>
        {itemDetailsOpen && selectedItem && (
          <ItemDetails
            item={selectedItem}
            isOpen={itemDetailsOpen}
            onClose={() => setItemDetailsOpen(false)}
            onAction={handleItemAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tradePanelOpen && selectedItem && (
          <TradePanel
            isOpen={tradePanelOpen}
            onClose={() => setTradePanelOpen(false)}
            item={selectedItem}
            action={tradeAction}
            onComplete={(data) => {
              // Handle trade completion
              if (data && data.success) {
                // Refresh items after successful trade
                fetchItems();
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTradeUrlPrompt && (
          <TradeUrlPrompt
            isOpen={showTradeUrlPrompt}
            onClose={() => setShowTradeUrlPrompt(false)}
            onSave={(url) => {
              // Handle trade URL save
              fetchUserProfile();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSellModal && selectedItem && (
          <SellModal
            item={selectedItem}
            onClose={() => setShowSellModal(false)}
            onListingComplete={handleListingComplete}
          />
        )}
      </AnimatePresence>

      <UserListings 
        show={showListingsPanel} 
        onClose={() => setShowListingsPanel(false)} 
      />
      
      {renderUserListingsButton()}
    </div>
  );
}

export default Marketplace;