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
    
    // Fix refresh issue: fetch stats first, then items
    fetchMarketStats().then(() => {
      fetchItems();
    });
    
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
    // Fix refresh issue: fetch stats first, then items
    fetchMarketStats().then(() => {
      fetchItems().then(() => setLoading(false));
    });
  };

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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginBottom: '1rem'
      }}>
        <h1>CS2 Market</h1>
        <p className="marketplace-subtitle">Buy and sell CS2 items securely with other players</p>
      </div>
      
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
          }}>{marketStats.totalListings || 0}</p>
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
        <button 
          onClick={handleManualRefresh}
          disabled={loading}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(31, 41, 61, 0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(51, 115, 242, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            height: '100%'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(51, 65, 85, 0.6)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(31, 41, 61, 0.5)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <svg
            style={{ 
              width: '28px', 
              height: '28px',
              color: '#3b82f6',
              marginBottom: '0.5rem'
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span style={{
            fontSize: '0.9rem',
            color: 'var(--gaming-text-dim)',
            marginBottom: '0.25rem'
          }}>
            Refresh Marketplace
          </span>
          <span style={{
            fontSize: '0.8rem',
            color: loading ? '#94a3b8' : '#3b82f6',
            fontWeight: loading ? 'normal' : 'bold'
          }}>
            {loading ? 'Updating...' : 'Click to update'}
          </span>
        </button>
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