import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ItemCard3D from '../components/ItemCard3D';
import './Home.css';
import { API_URL } from '../config/constants';

function Home({ user }) {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [stats, setStats] = useState({ items: 0, users: 0, trades: 0 });
  const [loading, setLoading] = useState(true);
  const [animationActive, setAnimationActive] = useState(false);
  const { t } = useTranslation();

  const fetchFeaturedItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/marketplace`);
      
      // Get a random selection of items to feature
      const randomItems = res.data
        .sort(() => 0.5 - Math.random()) // Shuffle array
        .slice(0, 6); // Take first 6 items
        
      setFeaturedItems(randomItems);
      
      // Set some placeholder stats for the demo
      setStats({
        items: res.data.length,
        users: Math.floor(res.data.length * 0.75),
        trades: Math.floor(res.data.length * 0.4)
      });
    } catch (error) {
      console.error('Error fetching featured items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedItems();
    
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimationActive(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const rarityColors = {
    'Consumer Grade': '#b0c3d9',
    'Industrial Grade': '#5e98d9',
    'Mil-Spec Grade': '#4b69ff',
    'Restricted': '#8847ff',
    'Classified': '#d32ce6',
    'Covert': '#eb4b4b',
    '★': '#e4ae39'
  };
  
  return (
    <div className="home-container">
      {/* Hero Section - with its own background and styling */}
      <section className="hero-section-container">
        <div className={`hero-section ${animationActive ? 'hero-active' : ''}`}>
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="gradient-text">CS2</span> Marketplace Georgia
            </h1>
            <p className="hero-subtitle">
              Buy, sell, and trade CS2 items with <span className="highlight">custom GEL pricing</span>
            </p>
            
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">{stats.items}+</span>
                <span className="stat-label">Items Listed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.users}+</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.trades}+</span>
                <span className="stat-label">Completed Trades</span>
              </div>
            </div>
            
            <div className="hero-cta">
              {user ? (
                <Link to="/marketplace" className="primary-button">
                  Browse Marketplace
                </Link>
              ) : (
                <a href={`${API_URL}/auth/steam`} className="primary-button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" stroke="white" strokeWidth="2"/>
                    <path d="M6 12L12 3L18 12L12 21L6 12Z" stroke="white" strokeWidth="2"/>
                  </svg>
                  Sign in with Steam
                </a>
              )}
            </div>
          </div>
          
          <div className="hero-image-container">
            <img 
              src="https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2Vcq1wsWfm8IWxukVQ0jfKeSXod7I_nw4Dvlag3aT_0UZB4jZMojO_H9on02Va3_kFqamiiJoLAI1c_MwzQ_ACggb_n2VQ/360fx360f"
              alt="CS2 Marketplace"
              className="hero-image"
            />
          </div>
        </div>
      </section>
      
      {/* Search Bar Section - with its own background and styling */}
      <section className="search-section-container">
        <div className="search-section">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search for skins, weapons, cases..." 
              className="search-input"
            />
            <Link to="/marketplace" className="search-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
          <div className="search-tags">
            <Link to="/marketplace?category=knife" className="search-tag">Knives</Link>
            <Link to="/marketplace?category=glove" className="search-tag">Gloves</Link>
            <Link to="/marketplace?category=rifle" className="search-tag">Rifles</Link>
            <Link to="/marketplace?category=case" className="search-tag">Cases</Link>
            <Link to="/marketplace?category=pistol" className="search-tag">Pistols</Link>
          </div>
        </div>
      </section>
      
      {/* Featured Items Section - with its own background and styling */}
      <section className="featured-section-container">
        <div className="featured-section">
          <h2 className="section-title">
            <div className="section-title-content">
              <span className="gradient-text">Featured</span> Items
              <div className="title-decoration"></div>
            </div>
          </h2>
          
          <div className="featured-grid">
            {loading ? (
              <div className="loading-items">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, ease: "linear", repeat: Infinity }}
                  className="spinner"
                />
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {t('home.featured.loading')}
                </motion.p>
              </div>
            ) : featuredItems.length > 0 ? (
              featuredItems.map((item, index) => (
                <Link to="/marketplace" key={item._id} style={{ textDecoration: 'none' }}>
                  <ItemCard3D 
                    item={item} 
                    featured={true}
                    highlight={index === 0}
                    onClick={() => {/* Will be handled by Link */}}
                  />
                </Link>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="no-items"
              >
                <p>{t('home.featured.noItems')}</p>
              </motion.div>
            )}
          </div>
          
          <div className="featured-cta">
            <Link to="/marketplace" className="view-all-button">
              View All Items
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Features Section - with its own background and styling */}
      <section className="features-section-container">
        <div className="features-section">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4ade80"/>
                    <stop offset="1" stopColor="#22d3ee"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3>Secure Trading</h3>
            <p>Direct integration with Steam's trading system ensures your items remain secure throughout the entire process.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12M12 12V16M12 12H16M12 12H8M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4ade80"/>
                    <stop offset="1" stopColor="#22d3ee"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3>GEL Pricing</h3>
            <p>Sell your items in Georgian Lari with custom currency rates specifically for the local market.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 10H21M7 15H8M12 15H13M6 19H18C19.1046 19 20 18.1046 20 17V7C20 5.89543 19.1046 5 18 5H6C4.89543 5 4 5.89543 4 7V17C4 18.1046 4.89543 19 6 19Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="3" y1="5" x2="21" y2="19" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4ade80"/>
                    <stop offset="1" stopColor="#22d3ee"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3>Make Offers</h3>
            <p>Negotiate better deals by making custom offers to sellers in both USD and GEL currencies.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 10V3L4 14H11V21L20 10H13Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4ade80"/>
                    <stop offset="1" stopColor="#22d3ee"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3>Fast Transactions</h3>
            <p>Complete trades quickly with our streamlined process from purchase to delivery.</p>
          </div>
        </div>
      </section>
      
      {/* How It Works Section - with its own background and styling */}
      <section className="how-it-works-section-container">
        <div className="how-it-works-section">
          <h2 className="section-title">
            <div className="section-title-content">
              <span className="gradient-text">How It</span> Works
              <div className="title-decoration"></div>
            </div>
          </h2>
          
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Connect Your Steam Account</h3>
              <p>Link your Steam account to browse your inventory and access trading features.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>List Your Items</h3>
              <p>Price your items in USD or GEL with custom exchange rates for the Georgian market.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Receive Offers</h3>
              <p>Get and respond to offers from potential buyers or make instant sales.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Complete Secure Trades</h3>
              <p>Finalize trades through Steam's trading system with our secure integration.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Final CTA Section - with its own background and styling */}
      <section className="final-cta-section-container">
        <div className="final-cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Start Trading?</h2>
            <p className="cta-description">Join the largest CS2 marketplace in Georgia</p>
            <div className="cta-buttons">
              {user ? (
                <Link to="/inventory" className="primary-button">
                  View Your Inventory
                </Link>
              ) : (
                <a href={`${API_URL}/auth/steam`} className="primary-button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" stroke="white" strokeWidth="2"/>
                    <path d="M6 12L12 3L18 12L12 21L6 12Z" stroke="white" strokeWidth="2"/>
                  </svg>
                  Sign in with Steam
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
