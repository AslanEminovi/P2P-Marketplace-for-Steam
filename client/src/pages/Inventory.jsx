import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import SellModal from '../components/SellModal';
import socketService from '../services/socketService';
import './Inventory.css';

function Inventory() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('name_asc');
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    rareItems: 0
  });

  const translateWear = (shortWear) => {
    const wearTranslations = {
      'fn': 'Factory New',
      'mw': 'Minimal Wear',
      'ft': 'Field-Tested',
      'ww': 'Well-Worn',
      'bs': 'Battle-Scarred'
    };
    return wearTranslations[shortWear?.toLowerCase()] || shortWear;
  };

  const getRarityColor = (rarity) => {
    const rarityColors = {
      'Consumer Grade': '#b0c3d9',      // white/gray
      'Industrial Grade': '#5e98d9',    // light blue
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

  // Check authentication status directly from App props
  useEffect(() => {
    // If user is already passed in from App component, use it
    if (user) {
      fetchInventory(true);
    } else {
      // Fallback to API check if not passed from props
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/user`, { withCredentials: true });
      if (res.data.authenticated) {
        setUser(res.data.user);
        fetchInventory(true);
        return true;
      }
      setMessage('Please sign in through Steam to view your inventory.');
      setLoading(false);
      return false;
    } catch (err) {
      console.error('Auth check error:', err);
      setMessage('Failed to verify authentication status.');
      setLoading(false);
      return false;
    }
  };

  const fetchInventory = async (force = false) => {
    try {
      setLoading(true);
      
      // Skip auth check if we already have user or force is true
      if (!force && !user) {
        const isAuthenticated = await checkAuthStatus();
        if (!isAuthenticated) {
          return;
        }
      }

      const res = await axios.get(`${API_URL}/inventory/my`, { withCredentials: true });
      console.log('Inventory response:', res.data);
      
      if (res.data && Array.isArray(res.data)) {
        setItems(res.data);
        setMessage('');
      } else {
        setMessage('No items found in inventory.');
        setItems([]);
      }
    } catch (err) {
      console.error('Inventory fetch error:', err.response || err);
      setMessage(err.response?.data?.error || 'Failed to fetch inventory.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSellClick = (item) => {
    setSelectedItem(item);
    setShowSellModal(true);
  };

  const handleCloseSellModal = () => {
    setShowSellModal(false);
    setSelectedItem(null);
  };

  const listItemForSale = async (itemData) => {
    try {
      // Extract wear from marketHashName if not provided
      let itemWear = itemData.wear;
      if (!itemWear && itemData.markethashname) {
        const wearMatch = itemData.markethashname.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i);
        if (wearMatch) {
          itemWear = wearMatch[0];
        }
      }

      // Calculate price in USD based on selected currency rate
      const priceUSD = itemData.pricelatest || itemData.pricereal || 1;

      await axios.post(`${API_URL}/marketplace/list`, {
        steamItemId: itemData.classid,
        assetId: itemData.assetid || itemData.asset_id,
        marketHashName: itemData.markethashname,
        price: priceUSD,
        imageUrl: itemData.image,
        wear: itemWear,
        currencyRate: itemData.currencyRate || 1.8,
        priceGEL: itemData.priceGEL || (priceUSD * 1.8).toFixed(2)
      }, { withCredentials: true });
      
      setMessage('Item listed for sale successfully!');
      setShowSellModal(false);
      setSelectedItem(null);
      fetchInventory(); // Refresh inventory after listing
    } catch (err) {
      console.error('List item error:', err);
      setMessage(err.response?.data?.error || 'Failed to list item for sale.');
    }
  };

  useEffect(() => {
    fetchInventory();
    
    // Setup WebSocket event listener for inventory updates
    const handleInventoryUpdate = (data) => {
      console.log('Inventory update received in component:', data);
      
      // Check the type of update and handle accordingly
      if (data.type === 'refresh' || data.type === 'item_added' || data.type === 'item_removed') {
        // Refresh the entire inventory
        fetchInventory();
      } else if (data.type === 'item_added' && data.data && data.data.item) {
        // Add a single item to the inventory
        setItems(prevItems => [...prevItems, data.data.item]);
      } else if (data.type === 'item_removed' && data.data && data.data.itemId) {
        // Remove a single item from the inventory
        setItems(prevItems => prevItems.filter(item => 
          item._id !== data.data.itemId && item.assetId !== data.data.assetId
        ));
      }
      
      // Display success message for inventory updates
      if (data.message) {
        setMessage(data.message);
      }
    };
    
    // Register the event handler
    const unsubscribe = socketService.on('inventory_update', handleInventoryUpdate);
    
    // Clean up the event handler when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

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
          <p>Loading your inventory...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        textAlign: 'center',
        marginTop: '2rem',
        color: '#e2e8f0',
        padding: '2rem',
        background: 'linear-gradient(45deg, #581845 0%, #900C3F 100%)'
      }}>
        <h2 style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Steam Authentication Required</h2>
        <p style={{
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(45, 27, 105, 0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '400px',
          margin: '0 auto'
        }}>{message}</p>
      </div>
    );
  }

  // Filter and sort items
  const filteredItems = items.filter(item => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'knife') return item.type?.toLowerCase().includes('knife');
    if (filterCategory === 'glove') return item.type?.toLowerCase().includes('glove');
    return item.type?.toLowerCase() === filterCategory;
  }).filter(item => {
    return item.marketHashName?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortOrder === 'name_asc') return a.marketHashName?.localeCompare(b.marketHashName);
    if (sortOrder === 'name_desc') return b.marketHashName?.localeCompare(a.marketHashName);
    if (sortOrder === 'price_asc') return (a.suggestedPrice || 0) - (b.suggestedPrice || 0);
    if (sortOrder === 'price_desc') return (b.suggestedPrice || 0) - (a.suggestedPrice || 0);
    if (sortOrder === 'rarity') {
      const rarityOrder = {
        'Consumer Grade': 1,
        'Industrial Grade': 2,
        'Mil-Spec Grade': 3,
        'Restricted': 4,
        'Classified': 5,
        'Covert': 6,
        '★': 7
      };
      return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    }
    return 0;
  });

  return (
    <div className="page-container dark-theme">
      {/* Background elements */}
      <div className="bg-elements">
        <div className="grid-pattern"></div>
        <div className="noise-overlay"></div>
        <div className="scan-lines"></div>
      </div>
      
      <div className="inventory-container">
        <div className="inventory-header">
          <h1 className="inventory-title">My Inventory</h1>
          
          <div className="inventory-actions">
            <button 
              className="btn btn-primary"
              onClick={() => fetchInventory(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <polyline points="23 20 23 14 17 14"></polyline>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
              Sync with Steam
            </button>
          </div>
        </div>
        
        <div className="inventory-stats">
          <div className="stat-card">
            <div className="stat-label">Total Items</div>
            <div className="stat-value">{items.length}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Estimated Value</div>
            <div className="stat-value">${items.reduce((sum, item) => sum + (item.suggestedPrice || 0), 0).toFixed(2)}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Rare Items</div>
            <div className="stat-value">{items.filter(item => item.rarity === 'Covert' || item.rarity === '★').length}</div>
          </div>
        </div>
        
        <div className="inventory-filter">
          <div className="filter-group">
            <label className="filter-label">Search Items</label>
            <input 
              type="text"
              className="search-input"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Category</label>
            <select 
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Items</option>
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
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="rarity">Rarity</option>
            </select>
          </div>
        </div>
        
        {sortedItems.length > 0 ? (
          <div className="inventory-grid">
            {sortedItems.map(item => (
              <div 
                key={item.assetId} 
                className="item-card"
                style={{ 
                  borderColor: getRarityColor(item.rarity) + '40' 
                }}
              >
                <div className="item-image-wrapper">
                  <img 
                    src={item.imageUrl} 
                    alt={item.marketHashName} 
                    className="item-image"
                  />
                </div>
                
                <div className="item-details">
                  <h3 className="item-name">{item.marketHashName}</h3>
                  
                  <div className="item-info">
                    {item.wear && (
                      <span 
                        className="item-wear"
                        style={{ backgroundColor: getWearColor(translateWear(item.wear)) + '30', color: getWearColor(translateWear(item.wear)) }}
                      >
                        {translateWear(item.wear)}
                      </span>
                    )}
                    
                    {item.rarity && (
                      <span 
                        className="item-rarity"
                        style={{ backgroundColor: getRarityColor(item.rarity) + '30', color: getRarityColor(item.rarity) }}
                      >
                        {item.rarity}
                      </span>
                    )}
                  </div>
                  
                  {item.suggestedPrice && (
                    <div className="item-price">
                      ${item.suggestedPrice.toFixed(2)}
                    </div>
                  )}
                  
                  <div className="item-actions">
                    <button 
                      className="btn-sell"
                      onClick={() => handleSellClick(item)}
                    >
                      Sell Item
                    </button>
                    
                    <button 
                      className="btn-detail"
                      onClick={() => window.open(`https://steamcommunity.com/market/listings/730/${encodeURIComponent(item.marketHashName)}`, '_blank')}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-inventory">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <h3>No Items Found</h3>
            <p>
              {items.length === 0 
                ? "Your Steam inventory appears to be empty or not synchronized. Try using the 'Sync with Steam' button to import your items." 
                : "No items match your current search filters. Try adjusting your search criteria."}
            </p>
            {items.length === 0 && (
              <button 
                className="btn btn-primary"
                onClick={() => fetchInventory(true)}
              >
                Sync with Steam
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Sell Modal */}
      {showSellModal && (
        <SellModal
          item={selectedItem}
          onClose={handleCloseSellModal}
          onSell={listItemForSale}
        />
      )}
    </div>
  );
}

export default Inventory;
