import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from '../utils/languageUtils';
import { API_URL, getColorForRarity, getRarityGradient } from '../config/constants';
import socketService from '../services/socketService';
import './Home.css';
import { useAuth } from "../contexts/AuthContext";
import { socket } from "../services/socket";
import { toast } from "react-toastify";
import Hero from "../components/Hero";
import FeaturedItems from "../components/FeaturedItems";
import LoginModal from "../components/LoginModal";

// Login Modal Component
const LoginModalComponent = ({ isOpen, onClose }) => {
  console.log("LoginModal render - isOpen:", isOpen);

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="login-modal">
        <button className="close-modal" onClick={onClose}>×</button>
        <h2>Sign In Required</h2>
        <p>You need to sign in with your Steam account to sell items on our marketplace.</p>
        <div className="modal-buttons">
          <a href={`${API_URL}/auth/steam`} className="modal-button primary">
            <img
              src="/Steam-Emblem.png"
              alt="Steam"
              className="steam-icon"
              width="24"
              height="24"
              onError={(e) => {
                console.log("Steam icon failed to load");
                e.target.style.display = 'none';
              }}
            />
            Sign in with Steam
          </a>
          <button className="modal-button secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Generate random particles for background effect
const generateParticles = (count) => {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 5 + 3
    });
  }
  return particles;
};

// Generate energy orbs for background effect
const generateEnergyOrbs = (count) => {
  const orbs = [];
  for (let i = 0; i < count; i++) {
    orbs.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 10,
      size: Math.random() * 0.5 + 0.8 // Size multiplier between 0.8 and 1.3
    });
  }
  return orbs;
};

// Generate floating hexagons for background effect
const generateFloatingHexagons = (count) => {
  const hexagons = [];
  for (let i = 0; i < count; i++) {
    hexagons.push({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 40 + 20,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 20,
      opacity: 0.03 + Math.random() * 0.08
    });
  }
  return hexagons;
};

const particles = generateParticles(30);
const energyOrbs = generateEnergyOrbs(15);
const floatingHexagons = generateFloatingHexagons(12);

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [stats, setStats] = useState({
    activeListings: 0,
    activeUsers: 0,
    completedTrades: 0,
    onlineUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial data fetch
    fetchMarketplaceData();

    // Socket event listeners
    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      socket.emit("request_stats_update");
    });

    socket.on("stats_update", (newStats) => {
      console.log("Received stats update:", newStats);
      setStats(newStats);
    });

    socket.on("market_activity", (activity) => {
      console.log("Market activity:", activity);
      // Refresh featured items if there's new activity
      fetchMarketplaceData();
    });

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        socket.emit("request_stats_update");
        fetchMarketplaceData();
      }
    };

    // Handle window focus
    const handleFocus = () => {
      socket.emit("request_stats_update");
      fetchMarketplaceData();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      socket.off("connect");
      socket.off("stats_update");
      socket.off("market_activity");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const fetchMarketplaceData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/marketplace?limit=6&sort=latest`);
      if (!response.ok) throw new Error("Failed to fetch marketplace data");
      
      const data = await response.json();
      setFeaturedItems(data.items || []);
    } catch (error) {
      console.error("Error fetching marketplace data:", error);
      toast.error("Failed to load marketplace items");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSellClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    } else {
      navigate("/sell");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <LoginModalComponent isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      
      <Hero
        stats={stats}
        onSellClick={handleSellClick}
        isAuthenticated={isAuthenticated}
      />

      <FeaturedItems
        items={featuredItems}
        isLoading={isLoading}
        onItemClick={(item) => navigate(`/item/${item._id}`)}
      />

      {/* Final CTA Section */}
      <div className="bg-gray-800 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Ready to Start Trading?
          </h2>
          <button
            onClick={handleSellClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300"
          >
            Sell Your Items
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
