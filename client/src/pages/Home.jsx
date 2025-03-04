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
      {/* Hero Section */}
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
              <Link
                to="/marketplace"
                className="cta-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#4ade80',
                  color: '#0f172a',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 0 0 rgba(74, 222, 128, 0.5)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#22c55e';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(74, 222, 128, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#4ade80';
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(74, 222, 128, 0.5)';
                }}
              >
                Browse Marketplace
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            ) : (
              <a
                href={`${API_URL}/auth/steam`}
                className="cta-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#4ade80',
                  color: '#0f172a',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 0 0 rgba(74, 222, 128, 0.5)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#22c55e';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(74, 222, 128, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#4ade80';
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(74, 222, 128, 0.5)';
                }}
              >
                Connect with Steam
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 0C4.475 0 0 4.475 0 10c0 4.126 2.434 7.934 6.415 9.639l3.045-2.434c-0.295 0.021-0.589 0.032-0.884 0.032-3.905 0-7.071-3.165-7.071-7.071 0-3.905 3.165-7.071 7.071-7.071 3.905 0 7.071 3.165 7.071 7.071 0 0.472-0.045 0.944-0.138 1.406l2.399 0.967C19.288 11.088 20 9.161 20 7.071 20 3.165 16.835 0 12.929 0H10zm4.556 8.877l-1.443-0.58c-0.295-0.119-0.611-0.18-0.932-0.18-1.364 0-2.475 1.111-2.475 2.475 0 1.364 1.111 2.475 2.475 2.475 1.364 0 2.475-1.111 2.475-2.475 0-0.325-0.063-0.637-0.183-0.932l0.58-1.443 0.603 0.241c0.393-0.603 0.634-1.303 0.634-2.071 0-2.123-1.722-3.845-3.845-3.845-2.123 0-3.845 1.722-3.845 3.845 0 2.123 1.722 3.845 3.845 3.845v-0.001c0.767 0 1.467-0.24 2.071-0.633l-0.241-0.603 1.28-0.518z"></path>
                </svg>
              </a>
            )}
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="hero-background-gradient"></div>
          <div className="hero-image">
            <img 
              src="https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2Vcq1wsWfm8IWxukVQ0jfKeSXod7I_nw4Dvlag3aT_0UZB4jZMojO_H9on02Va3_kFqamiiJoLAI1c_MwzQ_ACggb_n2VQ/360fx360f"
              alt="CS2 Marketplace"
              className="floating-image"
              style={{ transform: 'rotate(-12deg)' }}
            />
            <img 
              src="https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2NQN1lxcAFbe066w1Jx0vHEf4ju2YPvx9TfkfXyZ-7TlT9X7sEjiejCptui3Abk-RJqNmihcI7DcAI6aVmD_1S9wL_v1pH84spFl5CS/360fx360f"
              alt="CS2 Marketplace"
              className="floating-image-delay"
              style={{ transform: 'rotate(8deg)', zIndex: 1 }}
            />
            <img 
              src="https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2NdZl92YPK6JqmxZ1Jmg_30dT9GpYvnw4PuzfX2N7-CxzgHvpQn2u2Qrdqs3QzsqkRoMjz2JIKKcws-YAxzux9NCQ/360fx360f"
              alt="CS2 Marketplace"
              className="floating-image-delay2"
              style={{ transform: 'rotate(-5deg)', zIndex: 2 }}
            />
            <div className="price-tag price-tag-1">
              <span className="price-tag-currency">$</span>
              <span className="price-tag-amount">74.50</span>
            </div>
            <div className="price-tag price-tag-2">
              <span className="price-tag-currency">₾</span>
              <span className="price-tag-amount">134.10</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search Bar Section */}
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
      
      {/* Featured Items Section */}
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
      
      {/* Features Section */}
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
              <path d="M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H14L9 21V16Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="paint0_linear" x1="3" y1="4" x2="21" y2="21" gradientUnits="userSpaceOnUse">
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
      
      {/* How It Works Section */}
      <div className="how-it-works-section">
        <h2 className="section-title">
          <div className="section-title-content">
            <span className="gradient-text">How It</span> Works
            <div className="title-decoration"></div>
          </div>
        </h2>
        
        <div className="steps-container">
          <div className="step">
            <div className="step-indicator">
              <div className="step-number">1</div>
              <div className="step-line"></div>
            </div>
            <div className="step-content">
              <h3>Connect Your Steam Account</h3>
              <p>Link your Steam account to browse your inventory and access trading features.</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-indicator">
              <div className="step-number">2</div>
              <div className="step-line"></div>
            </div>
            <div className="step-content">
              <h3>List Your Items</h3>
              <p>Price your items in USD or GEL with custom exchange rates for the Georgian market.</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-indicator">
              <div className="step-number">3</div>
              <div className="step-line"></div>
            </div>
            <div className="step-content">
              <h3>Receive Offers</h3>
              <p>Get and respond to offers from potential buyers or make instant sales.</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-indicator">
              <div className="step-number">4</div>
            </div>
            <div className="step-content">
              <h3>Complete Secure Trades</h3>
              <p>Finalize trades through Steam's trading system with our secure integration.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-content">
          <h2>Ready to Start Trading?</h2>
          <p>Join the largest CS2 marketplace in Georgia</p>
          
          {user ? (
            <Link to="/inventory" className="cta-button">
              View Your Inventory
            </Link>
          ) : (
            <a href={`${API_URL}/auth/steam`} className="cta-button">
              Sign in with Steam
            </a>
          )}
        </div>
        <div className="cta-decoration"></div>
      </div>
      
      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <h3>CS2 GEO</h3>
            <p>The Ultimate Georgian CS2 Marketplace</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h4>Marketplace</h4>
              <Link to="/marketplace">Browse Items</Link>
              <Link to="/marketplace?category=knife">Knives</Link>
              <Link to="/marketplace?category=glove">Gloves</Link>
              <Link to="/marketplace?category=rifle">Rifles</Link>
            </div>
            
            <div className="footer-column">
              <h4>User</h4>
              <Link to="/inventory">Inventory</Link>
              <Link to="/my-listings">My Listings</Link>
              <Link to="/marketplace?tab=offers">Offers</Link>
            </div>
            
            <div className="footer-column">
              <h4>Help</h4>
              <a href="#">FAQ</a>
              <a href="#">Support</a>
              <a href="#">Terms of Service</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 CS2 Marketplace Georgia. All rights reserved.</p>
          <p>Not affiliated with Valve or Steam.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
