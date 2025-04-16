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
  const [marketStats, setMarketStats] = useState({
    totalListings: 0,
    totalVolume: 0,
    averagePrice: 0
  });
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
      const response = await axios.get(`${API_URL}/marketplace/my-listings`, {
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
    const handleMarketUpdate = async (update) => {
      console.log('Market update received:', update);
      
      // Only handle specific item updates, NO general refreshes
      if (update.type === 'new_listing' && update.item) {
        console.log('New listing received:', update.item.marketHashName);
        
        try {
          // Fetch complete item details with owner information
          const response = await axios.get(`${API_URL}/marketplace/item/${update.item._id}`, {
            withCredentials: true
          });
          
          const itemWithOwner = response.data;
          
          // Add the new item to the list without full refresh
          setItems(prevItems => {
            // Check if this item already exists to avoid duplicates
            const itemExists = prevItems.some(item => item._id === itemWithOwner._id);
            if (itemExists) {
              console.log('Item already exists in list, skipping');
              return prevItems;
            }
            console.log('Adding new item with complete owner info to list');
            // Add at the beginning for "latest" sorting
            return [itemWithOwner, ...prevItems];
          });
          
          toast.success(`New item listed: ${itemWithOwner.marketHashName}`, {
            duration: 3000
          });
        } catch (err) {
          console.error('Error fetching complete item details:', err);
          // Fallback to using the update data even without full owner info
          setItems(prevItems => {
            const itemExists = prevItems.some(item => item._id === update.item._id);
            if (itemExists) return prevItems;
            return [update.item, ...prevItems];
          });
          
          toast.success(`New item listed: ${update.item.marketHashName}`, {
            duration: 3000
          });
        }
      }
      
      // Handle cancelled listings
      if ((update.type === 'item_unavailable' || update.type === 'listing_cancelled') && update.itemId) {
        console.log(`Item cancelled/removed: ${update.itemId} - ${update.marketHashName || 'Unknown item'}`);
        
        // Remove the item from the current list immediately
        setItems(prevItems => {
          const newItems = prevItems.filter(item => item._id !== update.itemId);
          // If items were removed, update filtered items too
          if (newItems.length !== prevItems.length) {
            console.log(`Removed cancelled item ${update.itemId} from display`);
            
            // Also refresh user listings if the user is logged in
            if (user) {
              fetchUserListings();
            }
            
            // Show a toast notification for the cancelled item
            if (update.marketHashName) {
              toast.info(`Listing cancelled: ${update.marketHashName}`, {
                duration: 3000
              });
            }
            
            return newItems;
          }
          return prevItems;
        });
        
        // Update market stats to reflect the change
        fetchMarketStats();
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