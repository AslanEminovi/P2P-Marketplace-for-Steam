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
  const [marketStats, setMarketStats] = useState({
    totalListings: 0,
    totalVolume: 0,
    averagePrice: 0
  });
  const [showActivityFeed, setShowActivityFeed] = useState(true);
  const itemsPerPage = 12;
  const [showSellModal, setShowSellModal] = useState(false);
  
  // Ref to track connection status
  const connectionStatusRef = useRef({
    wasConnected: false,
    lastRefresh: Date.now()
  });

  const { t } = useTranslation();

  // Filter options
  const filterOptions = [
    { id: 'rifle', label: 'Rifles' },
    { id: 'knife', label: 'Knives' },
    { id: 'pistol', label: 'Pistols' },
    { id: 'glove', label: 'Gloves' },
    { id: 'case', label: 'Cases' },
    { id: 'sticker', label: 'Stickers' }
  ];

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
        
        // Update market stats if available
        if (res.data.stats) {
          setMarketStats(res.data.stats);
        }
      } else {
        console.error('Invalid response format:', res.data);
        setItems([]);
        setFilteredItems([]);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setItems([]);
      setFilteredItems([]);
      toast.error(t('errors.fetchItems'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortOption, searchQuery, activeFilters, t]);

  // Fetch market statistics
  const fetchMarketStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/marketplace/stats`);
      if (res.data) {
        // Ensure we include all stats even if some are missing
        setMarketStats({
          totalListings: res.data.totalListings || 0,
          totalVolume: res.data.totalVolume || 0,
          averagePrice: res.data.averagePrice || 0,
          activeUsers: res.data.activeUsers || 0,
          completedTrades: res.data.completedTrades || 0
        });
      }
    } catch (err) {
      console.error('Error fetching market stats:', err);
      // Set default values on error
      setMarketStats({
        totalListings: 0,
        totalVolume: 0,
        averagePrice: 0,
        activeUsers: 0,
        completedTrades: 0
      });
    }
  }, []);

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
      const response = await axios.get(`${API_URL}/marketplace/user-listings`, {
        withCredentials: true
      });
      setMyListings(response.data || []);
    } catch (err) {
      console.error('Error fetching user listings:', err);
      setMyListings([]);
    }
  }, [user]);

  // Initial data load - ONLY fetch on mount
  useEffect(() => {
    console.log('Marketplace component mounted - initializing data');
    
    // Initial data fetch - ONLY ONCE AT MOUNT
    fetchItems();
    fetchMarketStats();
    
    if (user) {
      fetchUserProfile();
      fetchUserListings();
    }
    
    // Setup socket connection if not already connected
    if (!socketService.isConnected()) {
      console.log('Marketplace: Socket not connected, connecting...');
      socketService.connect();
    } else {
      console.log('Marketplace: Socket already connected');
    }
    
    // Return cleanup function
    return () => {
      // No need to disconnect as the service manages this
      console.log('Marketplace component unmounting');
    };
  }, []); // Empty dependency array - run ONLY on mount

  // REMOVE ALL AUTO-REFRESH LOGIC - only respond to specific events
  useEffect(() => {
    // Handler for ONLY new listings and sales - NO automatic refreshes
    const handleMarketUpdate = (update) => {
      console.log('Market update received:', update);
      
      // Only handle specific item updates, NO general refreshes
      if (update.type === 'new_listing' && update.item) {
        console.log('New listing received:', update.item.marketHashName);
        
        // Add the new item to the list without full refresh
        setItems(prevItems => {
          // Check if this item already exists to avoid duplicates
          const itemExists = prevItems.some(item => item._id === update.item._id);
          if (itemExists) {
            console.log('Item already exists in list, skipping');
            return prevItems;
          }
          console.log('Adding new item to list');
          // Add at the beginning for "latest" sorting
          return [update.item, ...prevItems];
        });
        
        toast.success(`New item listed: ${update.item.marketHashName}`, {
          duration: 3000
        });
      }
      
      // Handle user count updates
      if (update.type === 'user_count' && update.count !== undefined) {
        console.log('User count update received:', update.count);
        setMarketStats(prev => ({
          ...prev,
          activeUsers: update.count
        }));
      }
      
      // Only refresh stats occasionally for sold items without refreshing all items
      if (update.type === 'item_sold') {
        // Just update stats, not full item refresh
        fetchMarketStats();
      }
    };
    
    // Register socket event listener - ONLY ONE
    console.log('Registering market_update handler');
    socketService.on('market_update', handleMarketUpdate);
    
    // Register user count update handler
    socketService.on('user_count', (data) => {
      console.log('User count direct update:', data);
      if (data && typeof data.count === 'number') {
        setMarketStats(prev => ({
          ...prev,
          activeUsers: data.count
        }));
      }
    });
    
    // Cleanup event listener
    return () => {
      console.log('Removing market_update handler');
      socketService.off('market_update', handleMarketUpdate);
      socketService.off('user_count');
    };
  }, []); // Empty dependency array - only register once

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

  // Add a manual refresh button instead of auto-refresh
  const handleManualRefresh = () => {
    console.log('Manual refresh requested');
    setLoading(true);
    fetchItems().then(() => setLoading(false));
    fetchMarketStats();
  };

  // Handle item click
  const handleItemClick = (item) => {
    console.log("Item clicked:", item);
    setSelectedItem(item);
    setSelectedItemId(item._id);
    setItemDetailsOpen(true);
  };

  // Handle filter click
  const handleFilterClick = (filterId) => {
    setActiveFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
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

  // Render header section
  const renderHeader = () => (
    <div className="marketplace-header">
      <h1>CS2 Market</h1>
      <p className="marketplace-subtitle">Buy and sell CS2 items securely with other players</p>
      <div className="marketplace-stats">
        <div className="stat-item">
          <span className="stat-label">Active Listings</span>
          <span className="stat-value">{marketStats.totalListings || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active Users</span>
          <span className="stat-value">{marketStats.activeUsers || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Completed Trades</span>
          <span className="stat-value">{marketStats.completedTrades || 0}</span>
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

  // Add event listener for custom event from HTML button
  useEffect(() => {
    // Event listener for the My Listings button click from the HTML
    const handleOpenMyListings = () => {
      console.log("Event listener triggered: openMyListings");
      setShowListingsPanel(true);
    };
    
    // Add event listener
    document.addEventListener('openMyListings', handleOpenMyListings);
    
    // Cleanup
    return () => {
      document.removeEventListener('openMyListings', handleOpenMyListings);
    };
  }, []);

  return (
    <div className="marketplace-container">
      <SocketConnectionIndicator />
      
      {/* ADD DIRECT MY LISTINGS BUTTON WITH INLINE STYLES */}
      <div id="direct-my-listings-button"
        onClick={() => {
          console.log("DIRECT MY LISTINGS BUTTON CLICKED");
          setShowListingsPanel(true);
        }}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: '999999',
          background: 'linear-gradient(45deg, #4F46E5, #7C3AED)',
          padding: '15px 25px',
          borderRadius: '12px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: 'none',
          margin: '0',
          textTransform: 'none',
          letterSpacing: 'normal',
          lineHeight: 'normal',
          textDecoration: 'none'
        }}
      >
        My Listings
        {myListings.length > 0 && (
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}>{myListings.length}</span>
        )}
      </div>
      
      {renderHeader()}
      
      <div className="filter-section">
        <div className="search-bar-container">
          <input
            type="text"
            className="search-bar"
            placeholder="Search for items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {/* Refresh button positioned within search bar container */}
          <button 
            className="refresh-button"
            onClick={handleManualRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Items'}
          </button>
        </div>
        
        <div className="filter-tags">
          {filterOptions.map((filter) => (
          <button
              key={filter.id}
              className={`filter-tag ${activeFilters.includes(filter.id) ? 'active' : ''}`}
              onClick={() => handleFilterClick(filter.id)}
            >
              {filter.label}
          </button>
          ))}
        </div>

        <div className="sort-container">
          <select
            className="sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
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
        onClose={() => {
          console.log("Closing user listings panel");
          setShowListingsPanel(false);
        }}
      />
    </div>
  );
}

export default Marketplace;