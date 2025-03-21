import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/languageUtils';
import { API_URL, getColorForRarity, getRarityGradient } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socketService';
import ItemCard3D from '../components/ItemCard3D';
import LoadingSpinner from '../components/LoadingSpinner';
import ItemModal from '../components/ItemModal';
import TradeUrlPrompt from '../components/TradeUrlPrompt';
import OfferModal from '../components/OfferModal';
import UserListings from '../components/UserListings';
import ItemDetails from '../components/ItemDetails';
import TradePanel from '../components/TradePanel';
import MarketplaceItem from '../components/MarketplaceItem';
import './Marketplace.css';

const MarketplaceStats = ({ stats }) => (
  <div className="marketplace-stats">
    <div className="stat-item">
      <span className="stat-value">{stats.activeListings || 0}</span>
      <span className="stat-label">Active Listings</span>
    </div>
    <div className="stat-item">
      <span className="stat-value">{stats.onlineUsers || 0}</span>
      <span className="stat-label">Online Users</span>
    </div>
    <div className="stat-item">
      <span className="stat-value">{stats.completedTrades || 0}</span>
      <span className="stat-label">Completed Trades</span>
    </div>
  </div>
);

const MarketplaceFilters = ({ filters, onFilterChange }) => (
  <div className="marketplace-filters">
    <select 
      value={filters.sort} 
      onChange={(e) => onFilterChange('sort', e.target.value)}
      className="filter-select"
    >
      <option value="price_asc">Price: Low to High</option>
      <option value="price_desc">Price: High to Low</option>
      <option value="newest">Newest First</option>
      <option value="rarity">By Rarity</option>
    </select>
    <input
      type="text"
      placeholder="Search items..."
      value={filters.search}
      onChange={(e) => onFilterChange('search', e.target.value)}
      className="filter-search"
    />
  </div>
);

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showTradeUrl, setShowTradeUrl] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [filters, setFilters] = useState({
    sort: 'newest',
    search: '',
    minPrice: '',
    maxPrice: '',
    rarity: 'all'
  });
  const [stats, setStats] = useState({
    activeListings: 0,
    onlineUsers: 0,
    completedTrades: 0
  });
  const { user } = useAuth();
  const { t } = useTranslation();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all marketplace items
      const response = await axios.get(`${API_URL}/marketplace`);
      setItems(Array.isArray(response.data) ? response.data : []);

      // If user is logged in, fetch their items
      if (user) {
        const userItemsResponse = await axios.get(`${API_URL}/user/profile`);
        setMyItems(Array.isArray(userItemsResponse.data.items) ? userItemsResponse.data.items : []);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(t('errors.fetchItems'));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    fetchItems();

    // Connect to socket for real-time updates
    socketService.socket?.on('marketplace_update', (update) => {
      if (update.type === 'new_listing' || update.type === 'item_sold') {
        fetchItems();
      }
    });

    // Request initial stats
    socketService.socket?.emit('request_stats_update');

    // Listen for stats updates
    socketService.socket?.on('stats_update', (newStats) => {
      setStats(newStats);
    });

    return () => {
      socketService.socket?.off('marketplace_update');
      socketService.socket?.off('stats_update');
    };
  }, [fetchItems]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const filteredItems = useCallback(() => {
    let result = selectedTab === "all" ? items : myItems;

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.type.toLowerCase().includes(searchLower)
      );
    }

    // Apply price filters
    if (filters.minPrice) {
      result = result.filter(item => item.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter(item => item.price <= parseFloat(filters.maxPrice));
    }

    // Apply rarity filter
    if (filters.rarity !== 'all') {
      result = result.filter(item => item.rarity === filters.rarity);
    }

    // Apply sorting
    switch (filters.sort) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'rarity':
        result.sort((a, b) => b.rarity.localeCompare(a.rarity));
        break;
      default:
        break;
    }

    return result;
  }, [items, myItems, selectedTab, filters]);

  const handleItemClick = (item) => {
    if (!user) {
      // Show login prompt
      return;
    }
    setSelectedItem(item);
  };

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <h1>{t('marketplace.title')}</h1>
        <MarketplaceStats stats={stats} />
      </div>

      <div className="marketplace-controls">
        <div className="tab-buttons">
          <button
            className={`tab-button ${selectedTab === "all" ? "active" : ""}`}
            onClick={() => setSelectedTab("all")}
          >
            {t('marketplace.allItems')}
          </button>
          <button
            className={`tab-button ${selectedTab === "my" ? "active" : ""}`}
            onClick={() => setSelectedTab("my")}
          >
            {t('marketplace.myItems')}
          </button>
        </div>
        <MarketplaceFilters filters={filters} onFilterChange={handleFilterChange} />
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchItems}>{t('common.retry')}</button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <LoadingSpinner />
        </div>
      ) : (
        <motion.div 
          className="items-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AnimatePresence>
            {filteredItems().map((item) => (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                className="item-card-wrapper"
              >
                <MarketplaceItem
                  item={item}
                  onClick={() => handleItemClick(item)}
                  featured={false}
                  highlight={false}
                  showActions={selectedTab === "all"}
                  style={{
                    background: getRarityGradient(item.rarity),
                    color: getColorForRarity(item.rarity)
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onBuy={() => setShowTradeUrl(true)}
          onMakeOffer={() => setShowOfferModal(true)}
        >
          <ItemDetails item={selectedItem} />
          {selectedTab === "all" && <TradePanel item={selectedItem} />}
        </ItemModal>
      )}

      {showTradeUrl && (
        <TradeUrlPrompt
          onClose={() => setShowTradeUrl(false)}
          onSubmit={(url) => {
            // Handle trade URL submission
            setShowTradeUrl(false);
          }}
        />
      )}

      {showOfferModal && selectedItem && (
        <OfferModal
          item={selectedItem}
          onClose={() => setShowOfferModal(false)}
          onSubmit={(offer) => {
            // Handle offer submission
            setShowOfferModal(false);
          }}
        />
      )}

      {selectedTab === "my" && (
        <UserListings
          items={myItems}
          onItemUpdate={fetchItems}
          onError={(error) => setError(error)}
        />
      )}
    </div>
  );
};

export default Marketplace;