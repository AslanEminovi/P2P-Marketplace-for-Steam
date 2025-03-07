import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import OfferModal from '../components/OfferModal';
import UserListings from '../components/UserListings';
import ItemDetails from '../components/ItemDetails';
import TradePanel from '../components/TradePanel';
import ItemCard3D from '../components/ItemCard3D';
import TradeUrlPrompt from '../components/TradeUrlPrompt';
import { API_URL } from '../config/constants';
import './Marketplace.css';

function Marketplace({ user }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showListingsPanel, setShowListingsPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [myListings, setMyListings] = useState([]);
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [tradePanelOpen, setTradePanelOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState(null);
  const [itemView, setItemView] = useState('grid'); // 'grid' or 'list'
  const [showTradeUrlPrompt, setShowTradeUrlPrompt] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const { t } = useTranslation();

  const translateWear = (shortWear, marketHashName) => {
    const wearTranslations = {
      'fn': 'Factory New',
      'mw': 'Minimal Wear',
      'ft': 'Field-Tested',
      'ww': 'Well-Worn',
      'bs': 'Battle-Scarred'
    };

    // First try to extract wear from market hash name
    if (marketHashName) {
      const wearMatch = marketHashName.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i);
      if (wearMatch) {
        return wearMatch[0];
      }
    }

    // If no wear in market hash name, try to translate short wear
    if (shortWear) {
      return wearTranslations[shortWear.toLowerCase()] || shortWear;
    }

    return 'Not Specified';
  };

  const getRarityColor = (rarity) => {
    const rarityColors = {
      'Consumer Grade': '#b0c3d9',      // white/gray
      'Mil-Spec Grade': '#4b69ff',      // dark blue
      'Restricted': '#8847ff',          // dark purple
      'Classified': '#d32ce6',          // light purple
      'Covert': '#eb4b4b',             // red
      '★': '#e4ae39'                    // gold (for knives/gloves)
    };
    return rarityColors[rarity] || '#b0c3d9';
  };

  const getWearColor = (wear) => {
    const wearColors = {
      'Factory New': '#4cd94c',
      'Minimal Wear': '#87d937',
      'Field-Tested': '#d9d937',
      'Well-Worn': '#d98037',
      'Battle-Scarred': '#d94040'
    };
    return wearColors[wear] || '#b0c3d9';
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      console.log('Fetching marketplace items...');
      const res = await axios.get(`${API_URL}/marketplace`, { withCredentials: true });
      console.log('Marketplace API response:', res.data);
      
      if (Array.isArray(res.data) && res.data.length > 0) {
        console.log('First item structure:', res.data[0]);
      } else {
        console.log('Marketplace response is empty or not an array:', res.data);
      }
      
      setItems(res.data);
      setMessage('');
    } catch (err) {
      console.error('Error fetching marketplace items:', err.response || err);
      setMessage('Failed to load marketplace items.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/marketplace/my-listings`, {
        withCredentials: true
      });
      setMyListings(response.data);
      setMessage('');
    } catch (err) {
      console.error('Error fetching listings:', err);
      setMessage('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const buyItem = async (itemId) => {
    try {
      const res = await axios.post(`${API_URL}/marketplace/buy/${itemId}`, {}, { withCredentials: true });
      setMessage(res.data.message || 'Item purchased successfully!');
      fetchItems();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to buy item.');
    }
  };

  const handleOfferSuccess = (data) => {
    setMessage('Offer submitted successfully!');
    // No need to refresh the marketplace as the item is still listed
  };

  useEffect(() => {
    fetchItems();
    
    if (user) {
      fetchMyListings();
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/profile`, {
        withCredentials: true
      });
      
      setUserProfile(response.data);
      
      // Check if trade URL is missing and show prompt
      if (!response.data.tradeUrl) {
        setShowTradeUrlPrompt(true);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const handleTradeUrlSave = (tradeUrl) => {
    // Update user profile with new trade URL
    setUserProfile(prev => ({
      ...prev,
      tradeUrl
    }));
  };

  // Filter and sort items
  const getFilteredItems = () => {
    // Return proper array based on active tab
    const itemsToFilter = activeTab === 'all' ? items : myListings;
    
    return itemsToFilter.filter(item => {
      // Filter by search term
      if (searchTerm && !(item.marketHashName || '').toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by category
      if (categoryFilter !== 'all') {
        const itemCategory = (item.type || '').toLowerCase();
        const itemName = (item.marketHashName || '').toLowerCase();
        
        if (categoryFilter === 'knife' && !itemName.includes('knife') && !itemName.includes('karambit') && !itemName.includes('bayonet')) {
          return false;
        }
        
        if (categoryFilter === 'rifle' && !itemName.includes('rifle') && !itemName.includes('ak-47') && !itemName.includes('m4a')) {
          return false;
        }
        
        if (categoryFilter === 'pistol' && !itemName.includes('pistol') && !itemName.includes('deagle') && !itemName.includes('glock')) {
          return false;
        }
        
        if (categoryFilter === 'glove' && !itemName.includes('glove')) {
          return false;
        }
        
        if (categoryFilter === 'case' && !itemName.includes('case')) {
          return false;
        }
      }
      
      // Filter by price range
      if (priceRange !== 'all') {
        const price = item.price || 0;
        const [min, max] = priceRange.split('-');
        
        if (min && max) {
          if (price < parseInt(min) || price > parseInt(max)) {
            return false;
          }
        } else if (min === '500+' && price < 500) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => {
      // Sort items
      switch (sortOrder) {
        case 'newest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'price_low':
          return (a.price || 0) - (b.price || 0);
        case 'price_high':
          return (b.price || 0) - (a.price || 0);
        default:
          return 0;
      }
    });
  };

  if (loading) {
    return (
      <div className="page-container dark-theme">
        {/* Background elements */}
        <div className="bg-elements">
          <div className="grid-pattern"></div>
          <div className="noise-overlay"></div>
          <div className="scan-lines"></div>
        </div>
        
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading marketplace items...</p>
        </div>
      </div>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <div className="page-container dark-theme">
      {/* Background elements */}
      <div className="bg-elements">
        <div className="grid-pattern"></div>
        <div className="noise-overlay"></div>
        <div className="scan-lines"></div>
      </div>
      
      {/* Trade URL Prompt */}
      <AnimatePresence>
        {showTradeUrlPrompt && (
          <TradeUrlPrompt 
            onClose={() => setShowTradeUrlPrompt(false)}
            onSave={handleTradeUrlSave}
            initialValue={userProfile?.tradeUrl || ''}
          />
        )}
      </AnimatePresence>
      
      {/* Item Details Modal */}
      <ItemDetails 
        open={itemDetailsOpen} 
        onClose={() => setItemDetailsOpen(false)} 
        itemId={selectedItemId} 
        onBuy={buyItem}
        onMakeOffer={(item) => {
          setSelectedItem(item);
          setTradePanelOpen(true);
          setTradeAction('makeOffer');
        }}
        user={user}
      />
      
      {/* Trade Panel */}
      <TradePanel 
        open={tradePanelOpen} 
        onClose={() => setTradePanelOpen(false)} 
        item={selectedItem} 
        action={tradeAction}
        onSubmitOffer={(data) => handleOfferSuccess(data)}
      />
      
      <div className="marketplace-container">
        <div className="marketplace-header">
          <h1 className="marketplace-title">CS2 Marketplace</h1>
          
          <div className="marketplace-actions">
            <button 
              className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setActiveTab('all')}
            >
              All Listings
            </button>
            
            {user && (
              <button 
                className={`btn ${activeTab === 'my' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setActiveTab('my')}
              >
                My Listings
              </button>
            )}
            
            <button 
              className="btn btn-secondary" 
              onClick={() => setItemView(itemView === 'grid' ? 'list' : 'grid')}
            >
              {itemView === 'grid' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              )}
            </button>
          </div>
        </div>
        
        <div className="marketplace-stats">
          <div className="stat-card">
            <div className="stat-label">Total Listings</div>
            <div className="stat-value">{activeTab === 'all' ? items.length : myListings.length}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Lowest Price</div>
            <div className="stat-value">
              ${Math.min(...(activeTab === 'all' ? items : myListings).map(item => item.price || Infinity), Infinity).toString() === "Infinity" ? "0.00" : Math.min(...(activeTab === 'all' ? items : myListings).map(item => item.price || Infinity)).toFixed(2)}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Highest Price</div>
            <div className="stat-value">
              ${Math.max(...(activeTab === 'all' ? items : myListings).map(item => item.price || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="filter-container">
          <div className="filter-row">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search items..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
              />
              <button className="search-button" onClick={fetchItems}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">Category</label>
              <select 
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="rifle">Rifles</option>
                <option value="smg">SMGs</option>
                <option value="pistol">Pistols</option>
                <option value="knife">Knives</option>
                <option value="glove">Gloves</option>
                <option value="case">Cases</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Sort By</label>
              <select 
                className="filter-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Price Range</label>
              <select 
                className="filter-select"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
              >
                <option value="all">All Prices</option>
                <option value="0-50">$0 - $50</option>
                <option value="50-100">$50 - $100</option>
                <option value="100-500">$100 - $500</option>
                <option value="500+">$500+</option>
              </select>
            </div>
          </div>
        </div>
        
        {message && (
          <div className="alert alert-info">{message}</div>
        )}
        
        {filteredItems.length > 0 ? (
          <div className="items-grid">
            {filteredItems.map(item => (
              <div 
                key={item._id} 
                className="item-card"
                style={{ 
                  borderColor: getRarityColor(item.rarity) + '40' 
                }}
              >
                <div className="item-image-wrapper">
                  <img 
                    src={item.imageUrl || `/img/placeholder-item.svg`} 
                    alt={item.marketHashName || 'CS2 Item'} 
                    className="item-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/img/placeholder-item.svg';
                    }}
                  />
                </div>
                
                <div className="item-details">
                  <h3 className="item-name">{item.marketHashName || 'CS2 Item'}</h3>
                  
                  <div className="item-info">
                    {item.wear && (
                      <span 
                        className="item-wear"
                        style={{ 
                          backgroundColor: getWearColor(translateWear(item.wear)) + '30', 
                          color: getWearColor(translateWear(item.wear)) 
                        }}
                      >
                        {translateWear(item.wear)}
                      </span>
                    )}
                    
                    {item.rarity && (
                      <span 
                        className="item-rarity"
                        style={{ 
                          backgroundColor: getRarityColor(item.rarity) + '30', 
                          color: getRarityColor(item.rarity) 
                        }}
                      >
                        {item.rarity}
                      </span>
                    )}
                  </div>
                  
                  <div className="item-price">
                    ${(item.price || 0).toFixed(2)}
                    {item.priceGEL && (
                      <span className="price-gel">₾{item.priceGEL}</span>
                    )}
                  </div>
                  
                  <div className="item-seller">
                    Seller: {item.sellerName || 'Unknown'}
                  </div>
                  
                  <div className="item-actions">
                    {user && user._id !== item.seller && (
                      <button 
                        className="btn-buy"
                        onClick={() => buyItem(item._id)}
                      >
                        Buy Now
                      </button>
                    )}
                    
                    {user && user._id !== item.seller && (
                      <button 
                        className="btn-offer"
                        onClick={() => {
                          setSelectedItem(item);
                          setTradePanelOpen(true);
                          setTradeAction('makeOffer');
                        }}
                      >
                        Make Offer
                      </button>
                    )}
                    
                    <button 
                      className="btn-detail"
                      onClick={() => {
                        setSelectedItemId(item._id);
                        setItemDetailsOpen(true);
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <h3>No Items Found</h3>
            <p>
              {activeTab === 'all' 
                ? "No items are currently listed on the marketplace. Check back later or try different filters." 
                : "You don't have any active listings. List items from your inventory to start selling."}
            </p>
            {activeTab === 'my' && (
              <button 
                className="btn btn-primary"
                onClick={() => window.location.href = '/inventory'}
              >
                Go to Inventory
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Marketplace;