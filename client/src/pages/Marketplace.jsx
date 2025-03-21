import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/languageUtils';
import OfferModal from '../components/OfferModal';
import UserListings from '../components/UserListings';
import ItemDetails from '../components/ItemDetails';
import TradePanel from '../components/TradePanel';
import ItemCard3D from '../components/ItemCard3D';
import TradeUrlPrompt from '../components/TradeUrlPrompt';
import { API_URL } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MarketplaceItem from '../components/MarketplaceItem';
import ItemModal from '../components/ItemModal';

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all marketplace items
      const response = await axios.get(`${API_URL}/marketplace`);
      console.log("Marketplace items response:", response.data);
      
      // Ensure we have an array of items
      const marketplaceItems = Array.isArray(response.data) ? response.data : [];
      setItems(marketplaceItems);

      // If user is logged in, fetch their items
      if (user) {
        const userItemsResponse = await axios.get(`${API_URL}/user/profile`);
        console.log("User items response:", userItemsResponse.data);
        
        // Ensure we have an array of user items
        const userItems = Array.isArray(userItemsResponse.data.items) 
          ? userItemsResponse.data.items 
          : [];
        setMyItems(userItems);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      setError("Failed to load marketplace items. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const displayItems = selectedTab === "all" ? items : myItems;

  if (loading) {
    return <div className="text-center py-8"><LoadingSpinner /></div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
        <button 
          onClick={fetchItems}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Marketplace</h1>
        <div className="flex space-x-4">
          <button
            className={`px-4 py-2 rounded ${
              selectedTab === "all"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedTab("all")}
          >
            All Items
          </button>
          <button
            className={`px-4 py-2 rounded ${
              selectedTab === "my"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedTab("my")}
          >
            My Items
          </button>
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {selectedTab === "all" 
            ? "No items available in the marketplace."
            : "You don't have any items yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayItems.map((item) => (
            <MarketplaceItem
              key={item._id}
              item={item}
              onClick={() => {
                setSelectedItem(item._id);
                setShowModal(true);
              }}
              featured={false}
              highlight={false}
              showActions={selectedTab === "all"}
            />
          ))}
        </div>
      )}

      {showModal && selectedItem && (
        <ItemModal
          itemId={selectedItem}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
};

export default Marketplace;