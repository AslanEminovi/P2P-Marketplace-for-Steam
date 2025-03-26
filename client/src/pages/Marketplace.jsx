import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/languageUtils';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import '../styles/Marketplace.css';

// Component imports
import OfferModal from '../components/OfferModal';
import UserListings from '../components/UserListings';
import ItemDetails from '../components/ItemDetails';
import TradePanel from '../components/TradePanel';
import ItemCard3D from '../components/ItemCard3D';
import TradeUrlPrompt from '../components/TradeUrlPrompt';
import LiveActivityFeed from '../components/LiveActivityFeed';
import SocketConnectionIndicator from '../components/SocketConnectionIndicator';

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
        ...(searchQuery && { search: searchQuery }),
        ...(activeFilters.length > 0 && { categories: activeFilters.join(',') })
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
      // Show error notification if available
      if (window.showNotification) {
        window.showNotification(
          'Error',
          'Failed to load marketplace items',
          'ERROR'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortOption, searchQuery, activeFilters]);

  // Fetch market statistics
  const fetchMarketStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/marketplace/stats`);
      if (res.data) {
        setMarketStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching market stats:', err);
      // Set default values on error
      setMarketStats({
        totalListings: 0,
        totalVolume: 0,
        averagePrice: 0
      });
    }
  }, []);

  // Socket event handlers
  useEffect(() => {
    socketService.on('market_update', (update) => {
      if (update.type === 'new_listing' || update.type === 'item_sold') {
        fetchItems();
        fetchMarketStats();
      }
    });

    return () => {
      socketService.off('market_update');
    };
  }, [fetchItems, fetchMarketStats]);

  // Initial data fetch
  useEffect(() => {
    fetchItems();
    fetchMarketStats();
  }, [fetchItems, fetchMarketStats]);

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

  // Check user profile on mount and when user changes
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Render functions
  const renderHeader = () => (
    <header className="marketplace-header">
      <div className="marketplace-header-content">
        <h1 className="marketplace-title">CS2 Marketplace</h1>
        <p className="marketplace-subtitle">
          Buy and sell CS2 items securely with other players
        </p>
        <div className="stats-bar">
          <div className="stat-item">
            <span>Active Listings:</span>
            <span className="stat-value">{marketStats.totalListings || 0}</span>
          </div>
          <div className="stat-item">
            <span>24h Volume:</span>
            <span className="stat-value">${(marketStats.totalVolume || 0).toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span>Avg. Price:</span>
            <span className="stat-value">${(marketStats.averagePrice || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </header>
  );

  const renderSearchAndFilters = () => (
    <section className="search-filter-section">
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="view-toggle">
          <button
            className={`view-toggle-button ${itemView === 'grid' ? 'active' : ''}`}
            onClick={() => setItemView('grid')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
          <button
            className={`view-toggle-button ${itemView === 'list' ? 'active' : ''}`}
            onClick={() => setItemView('list')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className="filter-tags">
        {filterOptions.map(filter => (
          <button
            key={filter.id}
            className={`filter-tag ${activeFilters.includes(filter.id) ? 'active' : ''}`}
            onClick={() => {
              setActiveFilters(prev =>
                prev.includes(filter.id)
                  ? prev.filter(f => f !== filter.id)
                  : [...prev, filter.id]
              );
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="sort-options">
        {sortOptions.map(option => (
          <button
            key={option.id}
            className={`sort-option ${sortOption === option.id ? 'active' : ''}`}
            onClick={() => setSortOption(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );

  const renderItems = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading marketplace items...</p>
        </div>
      );
    }

    if (!items || items.length === 0) {
      return (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>No items found matching your criteria</p>
          {!user && (
            <p className="empty-state-subtitle">
              Sign in with Steam to list your items for sale
            </p>
          )}
        </div>
      );
    }

    return (
      <div className={itemView === 'grid' ? 'items-grid' : 'items-list'}>
        {filteredItems.map(item => (
          <ItemCard3D
            key={item._id}
            item={item}
            view={itemView}
            isAuthenticated={!!user}
            onSelect={() => {
              setSelectedItemId(item._id);
              setItemDetailsOpen(true);
            }}
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
          Previous
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
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="marketplace-container">
      <SocketConnectionIndicator />
      
      {renderHeader()}
      {renderSearchAndFilters()}
      {renderItems()}
      {renderPagination()}

      {showActivityFeed && (
        <LiveActivityFeed
          onClose={() => setShowActivityFeed(false)}
        />
      )}

      <div className="quick-actions">
        {user && (
          <button
            className="quick-action-button"
            onClick={() => setShowListingsPanel(true)}
            title="My Listings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7h-7"></path>
              <path d="M14 17H5"></path>
              <circle cx="17" cy="17" r="3"></circle>
              <circle cx="7" cy="7" r="3"></circle>
            </svg>
          </button>
        )}
        <button
          className="quick-action-button"
          onClick={() => setShowActivityFeed(!showActivityFeed)}
          title="Market Activity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {showTradeUrlPrompt && (
          <TradeUrlPrompt
            onClose={() => setShowTradeUrlPrompt(false)}
            onSave={handleTradeUrlSave}
          />
        )}
        {itemDetailsOpen && (
          <ItemDetails
            itemId={selectedItemId}
            isOpen={itemDetailsOpen}
            onClose={() => setItemDetailsOpen(false)}
            onItemUpdated={fetchItems}
          />
        )}
        {showListingsPanel && (
          <UserListings
            show={showListingsPanel}
            onClose={() => setShowListingsPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Marketplace;