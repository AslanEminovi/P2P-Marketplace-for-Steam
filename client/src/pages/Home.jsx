import React, { useState, useEffect, useRef } from 'react';
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
  const heroRef = useRef(null);
  const { t } = useTranslation();

  const fetchFeaturedItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/marketplace`);
      
      // Get a random selection of items to feature
      const randomItems = res.data
        .sort(() => 0.5 - Math.random()) // Shuffle array
        .slice(0, 8); // Take first 8 items
        
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
    
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.1 }
    );
    
    // Observe all sections that should animate on scroll
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const rarityColors = {
    'Consumer Grade': 'var(--color-rarity-consumer)',
    'Industrial Grade': 'var(--color-rarity-industrial)',
    'Mil-Spec Grade': 'var(--color-rarity-milspec)',
    'Restricted': 'var(--color-rarity-restricted)',
    'Classified': 'var(--color-rarity-classified)',
    'Covert': 'var(--color-rarity-covert)',
    '★': 'var(--color-rarity-rare)'
  };
  
  return (
    <div className="home-container">
      {/* Animated background elements */}
      <div className="bg-elements">
        <div className="cyber-grid"></div>
        <div className="cs-logo-watermark"></div>
        <div className="glow-orb orb1"></div>
        <div className="glow-orb orb2"></div>
      </div>
      
      {/* Hero Section */}
      <section className="hero-section" ref={heroRef}>
        <div className="hero-content">
          <motion.h1 
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="title-accent">CS2</span> Marketplace
            <span className="geo-badge">GEO</span>
          </motion.h1>
          
          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Trade <span className="highlight-text">CS2 items</span> with local pricing in GEL
          </motion.p>
          
          <motion.div 
            className="hero-stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="stat-card">
              <div className="stat-icon items-icon"></div>
              <div className="stat-number">{stats.items.toLocaleString()}+</div>
              <div className="stat-label">Items Listed</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon users-icon"></div>
              <div className="stat-number">{stats.users.toLocaleString()}+</div>
              <div className="stat-label">Active Users</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon trades-icon"></div>
              <div className="stat-number">{stats.trades.toLocaleString()}+</div>
              <div className="stat-label">Completed Trades</div>
            </div>
          </motion.div>
          
          <motion.div 
            className="hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {user ? (
              <Link to="/marketplace" className="btn btn-primary pulse">
                <span className="btn-glow"></span>
                Browse Marketplace
                <svg className="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            ) : (
              <a href={`${API_URL}/auth/steam`} className="btn btn-primary pulse">
                <span className="btn-glow"></span>
                <svg className="steam-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M6 12L12 3L18 12L12 21L6 12Z"/>
                </svg>
                Sign in with Steam
              </a>
            )}
          </motion.div>
        </div>
        
        <div className="hero-visual">
          <div className="hero-skins">
            <div className="skin skin1">
              <img src="https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2Vcq1wsWfm8IWxukVQ0jfKeSXod7I_nw4Dvlag3aT_0UZB4jZMojO_H9on02Va3_kFqamiiJoLAI1c_MwzQ_ACggb_n2VQ/360fx360f" alt="CS2 Skin" />
              <div className="skin-hover-effect"></div>
            </div>
            <div className="skin skin2">
              <img src="https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2NQN1lxcAFbe066w1Jx0vHEf4ju2YPvx9TfkfXyZ-7TlT9X7sEjiejCptui3Abk-RJqNmihcI7DcAI6aVmD_1S9wL_v1pH84spFl5CS/360fx360f" alt="CS2 Skin" />
              <div className="skin-hover-effect"></div>
            </div>
            <div className="skin skin3">
              <img src="https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2NdZl92YPK6JqmxZ1Jmg_30dT9GpYvnw4PuzfX2N7-CxzgHvpQn2u2Qrdqs3QzsqkRoMjz2JIKKcws-YAxzux9NCQ/360fx360f" alt="CS2 Skin" />
              <div className="skin-hover-effect"></div>
            </div>
            
            <div className="price-tag gel-price">
              <span className="currency-symbol">₾</span>
              <span className="price-value">145.50</span>
            </div>
            <div className="price-tag usd-price">
              <span className="currency-symbol">$</span>
              <span className="price-value">54.99</span>
            </div>
            
            <div className="hero-particles"></div>
          </div>
        </div>
      </section>
      
      {/* Search Bar Section */}
      <section className="search-section animate-on-scroll">
        <div className="search-container glass">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <input 
              type="text" 
              placeholder="Search weapons, skins, cases..." 
              className="search-input"
            />
          </div>
          <Link to="/marketplace" className="search-button">
            Search
          </Link>
        </div>
        
        <div className="category-tags">
          <Link to="/marketplace?category=knife" className="category-tag">
            <div className="category-icon knife-icon"></div>
            <span>Knives</span>
          </Link>
          <Link to="/marketplace?category=glove" className="category-tag">
            <div className="category-icon glove-icon"></div>
            <span>Gloves</span>
          </Link>
          <Link to="/marketplace?category=rifle" className="category-tag">
            <div className="category-icon rifle-icon"></div>
            <span>Rifles</span>
          </Link>
          <Link to="/marketplace?category=pistol" className="category-tag">
            <div className="category-icon pistol-icon"></div>
            <span>Pistols</span>
          </Link>
          <Link to="/marketplace?category=case" className="category-tag">
            <div className="category-icon case-icon"></div>
            <span>Cases</span>
          </Link>
        </div>
      </section>
      
      {/* Featured Items Section */}
      <section className="featured-section animate-on-scroll">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-accent">Featured</span> Items
          </h2>
          <div className="section-decoration">
            <div className="decoration-line"></div>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading featured items...</p>
          </div>
        ) : (
          <div className="featured-grid">
            {featuredItems.map((item, index) => (
              <Link 
                to={`/marketplace/${item._id}`} 
                key={item._id} 
                className="featured-item-link"
              >
                <div 
                  className={`featured-item ${index === 0 || index === 3 ? 'featured-item-large' : ''}`}
                  style={{
                    '--delay': `${index * 0.1}s`,
                    '--item-color': item.rarity ? rarityColors[item.rarity] || 'var(--color-accent-primary)' : 'var(--color-accent-primary)'
                  }}
                >
                  <div className="item-image-container">
                    <img 
                      src={item.imageUrl} 
                      alt={item.marketHashName || 'CS2 Item'} 
                      className="item-image"
                    />
                    <div className="item-shine"></div>
                  </div>
                  
                  <div className="item-details">
                    <h3 className="item-name">{item.marketHashName || 'CS2 Item'}</h3>
                    <div className="item-meta">
                      <span className="item-wear">{item.wear || 'Factory New'}</span>
                      <span 
                        className="item-rarity"
                        style={{ color: item.rarity ? rarityColors[item.rarity] : 'var(--color-accent-primary)' }}
                      >
                        {item.rarity || 'Common'}
                      </span>
                    </div>
                    <div className="item-price">
                      <span className="price-usd">${(item.price || 0).toFixed(2)}</span>
                      <span className="price-divider">|</span>
                      <span className="price-gel">₾{((item.price || 0) * 2.65).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="item-hover-effect"></div>
                </div>
              </Link>
            ))}
          </div>
        )}
        
        <div className="view-all-container">
          <Link to="/marketplace" className="btn btn-secondary">
            View All Items
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="features-section animate-on-scroll">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-accent">Our</span> Features
          </h2>
          <div className="section-decoration">
            <div className="decoration-line"></div>
          </div>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon secure-icon"></div>
            <h3>Secure Trading</h3>
            <p>Direct integration with Steam's trading system ensures your items remain secure throughout the entire process.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon gel-icon"></div>
            <h3>GEL Pricing</h3>
            <p>Sell your items in Georgian Lari with custom currency rates specifically for the local market.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon offer-icon"></div>
            <h3>Make Offers</h3>
            <p>Negotiate better deals by making custom offers to sellers in both USD and GEL currencies.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon fast-icon"></div>
            <h3>Fast Transactions</h3>
            <p>Complete trades quickly with our streamlined process from purchase to delivery.</p>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="how-it-works-section animate-on-scroll">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-accent">How It</span> Works
          </h2>
          <div className="section-decoration">
            <div className="decoration-line"></div>
          </div>
        </div>
        
        <div className="steps-container">
          <div className="steps-path"></div>
          
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Connect Your Steam Account</h3>
              <p>Link your Steam account to browse your inventory and access trading features.</p>
            </div>
          </div>
          
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>List Your Items</h3>
              <p>Price your items in USD or GEL with custom exchange rates for the Georgian market.</p>
            </div>
          </div>
          
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Receive Offers</h3>
              <p>Get and respond to offers from potential buyers or make instant sales.</p>
            </div>
          </div>
          
          <div className="step-card">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Complete Secure Trades</h3>
              <p>Finalize trades through Steam's trading system with our secure integration.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="cta-section animate-on-scroll">
        <div className="cta-container glass">
          <div className="cta-content">
            <h2>Ready to Start Trading?</h2>
            <p>Join the largest CS2 marketplace in Georgia</p>
            
            {user ? (
              <Link to="/inventory" className="btn btn-primary">
                <span className="btn-glow"></span>
                View Your Inventory
                <svg className="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            ) : (
              <a href={`${API_URL}/auth/steam`} className="btn btn-primary">
                <span className="btn-glow"></span>
                <svg className="steam-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M6 12L12 3L18 12L12 21L6 12Z"/>
                </svg>
                Sign in with Steam
              </a>
            )}
          </div>
          
          <div className="cta-decoration">
            <div className="cta-particles"></div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <h3 className="footer-logo">
              <span className="logo-accent">CS2</span> GEO
            </h3>
            <p>The Ultimate Georgian CS2 Marketplace</p>
            
            <div className="social-links">
              <a href="https://discord.gg/your-discord-invite" className="social-link discord" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-discord"></i>
              </a>
              <a href="https://twitter.com/your-twitter" className="social-link twitter" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://facebook.com/your-facebook-page" className="social-link facebook" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-facebook-f"></i>
              </a>
            </div>
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
              <Link to="/trades">Trades</Link>
              <Link to="/marketplace?tab=offers">Offers</Link>
            </div>
            
            <div className="footer-column">
              <h4>Help</h4>
              <Link to="/faq">FAQ</Link>
              <Link to="/support">Support</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/privacy">Privacy Policy</Link>
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
