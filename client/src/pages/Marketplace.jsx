import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import OfferModal from '../components/OfferModal';
import UserListings from '../components/UserListings';
import ItemDetails from '../components/ItemDetails';
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
  const { t } = useTranslation();

  const translateWear = (shortWear, marketHashName) => {
    if (!shortWear && marketHashName) {
      // Extract wear from market hash name if available
      if (marketHashName.includes('Factory New')) return 'Factory New';
      if (marketHashName.includes('Minimal Wear')) return 'Minimal Wear';
      if (marketHashName.includes('Field-Tested')) return 'Field-Tested';
      if (marketHashName.includes('Well-Worn')) return 'Well-Worn';
      if (marketHashName.includes('Battle-Scarred')) return 'Battle-Scarred';
    }
    
    // Return parsed wear if available
    if (shortWear) {
      const wearValue = parseFloat(shortWear);
      if (wearValue < 0.07) return 'Factory New';
      if (wearValue < 0.15) return 'Minimal Wear';
      if (wearValue < 0.38) return 'Field-Tested';
      if (wearValue < 0.45) return 'Well-Worn';
      return 'Battle-Scarred';
    }
    
    // Default return
    return 'Not Applicable';
  };

  const getRarityColor = (rarity) => {
    if (!rarity) return '#9AA0A6'; // Default gray
    
    const rarityMap = {
      'Consumer Grade': '#b0c3d9',
      'Industrial Grade': '#5e98d9',
      'Mil-Spec Grade': '#4b69ff',
      'Restricted': '#8847ff',
      'Classified': '#d32ce6',
      'Covert': '#eb4b4b',
      'Contraband': '#ffd700',
    };
    
    return rarityMap[rarity] || '#9AA0A6';
  };

  const getWearColor = (wear) => {
    if (!wear) return '#9AA0A6';
    
    const wearMap = {
      'Factory New': '#4ade80',
      'Minimal Wear': '#22d3ee',
      'Field-Tested': '#f59e0b',
      'Well-Worn': '#f97316',
      'Battle-Scarred': '#ef4444',
      'Not Applicable': '#9AA0A6'
    };
    
    return wearMap[wear] || '#9AA0A6';
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      console.log("Fetching marketplace items...");
      const response = await axios.get(`${API_URL}/marketplace`, { withCredentials: true });
      console.log("Marketplace API response:", response.data);
      
      if (response.data && Array.isArray(response.data)) {
        const itemsWithDefaults = response.data.map(item => ({
          ...item,
          marketHashName: item.marketHashName || 'CS2 Item',
          imageUrl: item.imageUrl || '/img/placeholder-item.svg',
          rarity: item.rarity || 'Consumer Grade',
          wear: item.wear || null,
          price: item.price || 0
        }));
        
        setItems(itemsWithDefaults);
        if (itemsWithDefaults.length > 0) {
          console.log("First item example:", itemsWithDefaults[0]);
        } else {
          console.log("No items returned from API");
        }
        setMessage('');
      } else {
        console.log("Invalid data format received:", response.data);
        setItems([]);
        setMessage('No items available');
      }
    } catch (err) {
      console.error('Error fetching marketplace items:', err);
      setMessage('Failed to load items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_URL}/marketplace/my-listings`, { withCredentials: true });
      console.log("My listings response:", response.data);
      
      if (response.data && Array.isArray(response.data)) {
        const listingsWithDefaults = response.data.map(item => ({
          ...item,
          marketHashName: item.marketHashName || 'CS2 Item',
          imageUrl: item.imageUrl || '/img/placeholder-item.svg',
          rarity: item.rarity || 'Consumer Grade',
          wear: item.wear || null,
          price: item.price || 0
        }));
        
        setMyListings(listingsWithDefaults);
      }
    } catch (err) {
      console.error('Error fetching my listings:', err);
    }
  };

  const buyItem = async (itemId) => {
    if (!user) {
      window.location.href = `${API_URL}/auth/steam`;
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/marketplace/buy/${itemId}`, {}, { withCredentials: true });
      setMessage('Item purchased successfully!');
      // Only refresh if the purchase was successful
      if (response && response.data && response.data.success) {
        console.log("Purchase successful, refreshing items");
        fetchItems();
      }
    } catch (err) {
      console.error('Error buying item:', err);
      setMessage('Failed to purchase item');
    }
  };

  const handleOfferSuccess = (data) => {
    setSelectedItem(null);
    setTradePanelOpen(false);
    if (window.showNotification) {
      window.showNotification(
        'Offer Submitted',
        'Your trade offer has been submitted successfully.',
        'SUCCESS'
      );
    }
    // Only fetch items when necessary - don't refresh unless an item status has changed
    if (data && data.success) {
      console.log("Offer successful, refreshing items");
      fetchItems();
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_URL}/users/profile`, { withCredentials: true });
      setUserProfile(response.data);
      
      // Check if trade URL is not set, prompt user
      if (!response.data.tradeUrl) {
        setShowTradeUrlPrompt(true);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const handleTradeUrlSave = (tradeUrl) => {
    setShowTradeUrlPrompt(false);
    fetchUserProfile();
  };

  useEffect(() => {
    // Initial fetch on component mount
    fetchItems();
    
    // Only fetch user-related data when user changes
    if (user) {
      fetchMyListings();
      fetchUserProfile();
    }
    
    // Don't re-run this effect based on the fetchItems function 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p>Loading marketplace...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Item Details Modal */}
      <ItemDetails 
        itemId={selectedItemId} 
        isOpen={itemDetailsOpen}
        onClose={() => setItemDetailsOpen(false)}
        onItemUpdated={fetchItems}
      />
      
      {/* Offer Modal (legacy) */}
      {selectedItem && (
        <OfferModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)}
          onSuccess={handleOfferSuccess}
        />
      )}
      
      {/* User Listings Panel */}
      <UserListings 
        show={showListingsPanel}
        onClose={() => setShowListingsPanel(false)}
      />

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '1.5rem'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(45, 27, 105, 0.5)',
          borderRadius: '16px',
          padding: '0.5rem',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}>
          <button 
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'all' ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
              color: activeTab === 'all' ? '#4ade80' : '#e2e8f0',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'all') {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'all') {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <svg 
                style={{ width: '18px', height: '18px' }} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 10h16M4 14h16M4 18h16" 
                />
              </svg>
              All Listings
            </span>
            {activeTab === 'all' && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40%',
                height: '3px',
                backgroundColor: '#4ade80',
                borderRadius: '8px 8px 0 0',
                boxShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
              }} />
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('my')}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'my' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: activeTab === 'my' ? '#8B5CF6' : '#e2e8f0',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'my') {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'my') {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <svg 
                style={{ width: '18px', height: '18px' }} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
              My Listings
            </span>
            {activeTab === 'my' && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40%',
                height: '3px',
                backgroundColor: '#8B5CF6',
                borderRadius: '8px 8px 0 0',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
              }} />
            )}
          </button>
        </div>
        
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => {
              console.log("Manual refresh triggered");
              if (activeTab === 'all') {
                fetchItems(); 
              } else {
                fetchMyListings();
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'all' ? '#4ade80' : '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'all' 
                ? '0 0 20px rgba(74, 222, 128, 0.2)' 
                : '0 0 20px rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = activeTab === 'all' ? '#22c55e' : '#7C3AED';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = activeTab === 'all'
                ? '0 0 30px rgba(74, 222, 128, 0.4)'
                : '0 0 30px rgba(139, 92, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = activeTab === 'all' ? '#4ade80' : '#8B5CF6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = activeTab === 'all'
                ? '0 0 20px rgba(74, 222, 128, 0.2)'
                : '0 0 20px rgba(139, 92, 246, 0.2)';
            }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>Refresh</span>
            <svg 
              style={{ width: '20px', height: '20px', position: 'relative', zIndex: 1 }} 
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
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 100%)',
              pointerEvents: 'none'
            }} />
          </button>
        </div>
      </div>
      {message && (
        <p style={{ 
          textAlign: 'center',
          color: message.includes('Failed') ? '#ef4444' : '#4ade80',
          margin: '1rem 0',
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(45, 27, 105, 0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '400px',
          margin: '1rem auto'
        }}>
          {message}
        </p>
      )}
      {/* View Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        maxWidth: '1400px',
        margin: '0 auto 1rem',
        padding: '0 1rem'
      }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: 'flex',
            gap: '0.5rem',
            backgroundColor: 'rgba(45, 27, 105, 0.5)',
            borderRadius: '12px',
            padding: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <motion.button
            whileHover={{ backgroundColor: itemView === 'grid' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setItemView('grid')}
            style={{
              backgroundColor: itemView === 'grid' ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem',
              color: itemView === 'grid' ? '#4ade80' : '#e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </motion.button>
          
          <motion.button
            whileHover={{ backgroundColor: itemView === 'list' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setItemView('list')}
            style={{
              backgroundColor: itemView === 'list' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem',
              color: itemView === 'list' ? '#38bdf8' : '#e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </motion.button>
        </motion.div>
      </div>
        
      {/* Items grid or list */}
      <AnimatePresence mode="wait">
        {itemView === 'grid' ? (
          <motion.div
            key="grid-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.5rem',
              padding: '1rem',
              maxWidth: '1400px',
              margin: '0 auto'
            }}
          >
            {(activeTab === 'all' ? items : myListings).map((item, index) => (
              <ItemCard3D
                key={item._id}
                item={item}
                onClick={() => {
                  setSelectedItemId(item._id);
                  setItemDetailsOpen(true);
                }}
                featured={false}
                highlight={false}
                showActions={activeTab === 'all'}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '1rem',
              maxWidth: '1400px',
              margin: '0 auto'
            }}
          >
            {(activeTab === 'all' ? items : myListings).map((item, index) => (
              <motion.div
                key={item._id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => {
                  setSelectedItemId(item._id);
                  setItemDetailsOpen(true);
                }}
                whileHover={{ 
                  y: -5, 
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.3)',
                  backgroundColor: 'rgba(45, 27, 105, 0.8)' 
                }}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'rgba(45, 27, 105, 0.6)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Item image with rarity border */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{ 
                    position: 'relative',
                    width: '100px',
                    height: '100px',
                    flexShrink: 0
                  }}
                >
                  <img 
                    src={item.imageUrl}
                    alt={item.marketHashName}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      borderRadius: '12px',
                      border: `2px solid ${getRarityColor(item.rarity)}`,
                      boxShadow: `0 0 20px ${getRarityColor(item.rarity)}33`
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/img/placeholder-item.svg';
                    }}
                  />
                </motion.div>
                
                {/* Item details - middle section */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    margin: '0 0 0.5rem 0',
                    color: '#f1f1f1',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    {item.marketHashName.replace(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i, '').trim() || 'CS2 Item'}
                  </h3>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    marginBottom: '0.5rem'
                  }}>
                    {/* Wear badge */}
                    {(item.wear || item.marketHashName.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i)) && (
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '8px'
                      }}>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          backgroundColor: getWearColor(translateWear(item.wear, item.marketHashName)),
                          boxShadow: `0 0 8px ${getWearColor(translateWear(item.wear, item.marketHashName))}66`
                        }}></span>
                        <span style={{ 
                          color: '#d1d5db',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}>
                          {translateWear(item.wear, item.marketHashName)}
                        </span>
                      </div>
                    )}
                    
                    {/* Rarity badge */}
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '8px'
                    }}>
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: getRarityColor(item.rarity),
                        boxShadow: `0 0 8px ${getRarityColor(item.rarity)}66`
                      }}></span>
                      <span style={{ 
                        color: getRarityColor(item.rarity),
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}>
                        {item.rarity}
                      </span>
                    </div>
                  </div>
                  
                  {/* Seller info */}
                  {item.seller && (
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#94a3b8',
                      fontSize: '0.85rem'
                    }}>
                      <span>Seller:</span>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {item.sellerName || 'Unknown'}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Price and actions - right section */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '0.75rem',
                  minWidth: '180px'
                }}>
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end'
                  }}>
                    <span style={{ 
                      color: '#4ade80',
                      fontWeight: 'bold',
                      fontSize: '1.25rem'
                    }}>
                      ${(item.price || 0).toFixed(2)}
                    </span>
                    {item.priceGEL && (
                      <span style={{ 
                        color: '#94a3b8',
                        fontSize: '0.9rem'
                      }}>
                        ₾{parseFloat(item.priceGEL).toFixed(2)} GEL
                      </span>
                    )}
                  </div>
                  
                  {/* Buttons */}
                  <div style={{ 
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    {activeTab === 'all' ? (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05, backgroundColor: '#22c55e' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            buyItem(item._id);
                          }}
                          style={{
                            padding: '0.65rem 1rem',
                            backgroundColor: '#4ade80',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(74, 222, 128, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          {t('marketplace.actions.buy')}
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05, backgroundColor: '#7C3AED' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          style={{
                            padding: '0.65rem 1rem',
                            backgroundColor: '#8B5CF6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
                          }}
                        >
                          {t('marketplace.actions.offer')}
                        </motion.button>
                      </>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: '#dc2626' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const cancelListing = async () => {
                            try {
                              await axios.put(`${API_URL}/marketplace/cancel/${item._id}`, {}, {
                                withCredentials: true
                              });
                              // Update listings after cancellation
                              fetchMyListings();
                              setMessage('Listing cancelled successfully!');
                              
                              // Show notification
                              if (window.showNotification) {
                                window.showNotification(
                                  'Listing Cancelled',
                                  'Your listing has been cancelled successfully.',
                                  'SUCCESS'
                                );
                              }
                            } catch (err) {
                              console.error('Error cancelling listing:', err);
                              setMessage('Failed to cancel listing');
                              
                              // Show error notification
                              if (window.showNotification) {
                                window.showNotification(
                                  'Error',
                                  'Failed to cancel listing',
                                  'ERROR'
                                );
                              }
                            }
                          };
                          cancelListing();
                        }}
                        style={{
                          padding: '0.65rem 1rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        {t('marketplace.actions.cancelListing')}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Marketplace;