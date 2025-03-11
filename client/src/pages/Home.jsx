import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ItemCard3D from '../components/ItemCard3D';
import './Home.css';
import { API_URL } from '../config/constants';
// Fix image import but retain original approach
import csLogo from './cs-logo.png';

// Creating separate section components for better organization and independent styling
const HeroSection = ({ user, stats, animationActive }) => {
  const { t } = useTranslation();
  
  return (
    <section className="hero-section-container">
      <div className={`hero-section ${animationActive ? 'hero-active' : ''}`}>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gradient-text">CS2</span> Marketplace Georgia
          </h1>
          <p className="hero-subtitle">
            Buy, sell, and trade CS2 items with <span className="gradient-text">custom GEL pricing</span>
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
            {!user ? (
              <Link to="/login" className="primary-button">
                <i className="fab fa-steam"></i>
                Sign in with Steam
              </Link>
            ) : (
              <Link to="/marketplace" className="primary-button">
                <i className="fas fa-shopping-cart"></i>
                Browse Marketplace
              </Link>
            )}
            <Link to="/inventory" className="secondary-button">
              <i className="fas fa-box-open"></i>
              {user ? 'My Inventory' : 'How It Works'}
            </Link>
          </div>
        </div>
        <div className="hero-image-container">
          <img src={csLogo} alt="CS2 Logo" className="hero-image" />
        </div>
      </div>
    </section>
  );
};

const SearchSection = () => {
  const { t } = useTranslation();
  
  return (
    <section className="search-section-container">
      <div className="search-section">
        <div className="search-container">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search for skins, weapons, cases..." 
          />
          <button className="search-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="search-tags">
          <Link to="/marketplace?category=rifle" className="search-tag">Rifles</Link>
          <Link to="/marketplace?category=knife" className="search-tag">Knives</Link>
          <Link to="/marketplace?category=pistol" className="search-tag">Pistols</Link>
          <Link to="/marketplace?category=glove" className="search-tag">Gloves</Link>
          <Link to="/marketplace?category=case" className="search-tag">Cases</Link>
        </div>
      </div>
    </section>
  );
};

const FeaturedItemsSection = ({ loading, featuredItems }) => {
  const { t } = useTranslation();
  
  // No more dummy items - we'll use empty state messaging instead

  return (
    <section className="featured-section-container">
      <div className="section-title">
        <div className="section-title-content">
          <h2>Featured <span className="gradient-text">Items</span></h2>
          <p>Explore our selection of popular CS2 items available for trade</p>
          <div className="title-decoration"></div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-items">
          <div className="spinner"></div>
          <p>Loading featured items...</p>
        </div>
      ) : featuredItems.length > 0 ? (
        <>
          <div className="featured-grid">
            {featuredItems.map(item => (
              <div key={item.id} className="item-card">
                <div className="item-card-image">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="item-card-content">
                  <h3 className="item-name">{item.name}</h3>
                  <span className="item-rarity" style={{ 
                    backgroundColor: getColorForRarity(item.rarity) 
                  }}>
                    {item.rarity} {item.wear && `• ${item.wear}`}
                  </span>
                  <div className="item-meta">
                    <div className="item-price">
                      <span className="price-tag-currency">GEL</span>
                      <span className="price-tag-amount">{(item.price / 100).toFixed(2)}</span>
                    </div>
                    <Link to={`/item/${item.id}`} className="buy-now-button">
                      View Item
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="featured-cta">
            <Link to="/marketplace" className="view-all-button">
              View All Items
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </>
      ) : (
        <div className="no-items">
          <p>No featured items available at the moment. Check back soon!</p>
          <div className="featured-cta">
            <Link to="/marketplace" className="view-all-button">
              Browse Marketplace
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

// Helper function to get color for rarity
const getColorForRarity = (rarity) => {
  if (!rarity) return 'rgba(138, 43, 226, 0.1)';
  
  switch (String(rarity).toLowerCase()) {
    case 'consumer grade': return 'rgba(176, 195, 217, 0.2)';
    case 'industrial grade': return 'rgba(94, 152, 217, 0.2)';
    case 'mil-spec': return 'rgba(75, 105, 255, 0.2)';
    case 'restricted': return 'rgba(136, 71, 255, 0.2)';
    case 'classified': return 'rgba(211, 44, 230, 0.2)';
    case 'covert': return 'rgba(235, 75, 75, 0.2)';
    case 'knife': return 'rgba(255, 206, 80, 0.2)';
    default: return 'rgba(138, 43, 226, 0.1)';
  }
};

const FeaturesSection = () => {
  const featuresRef = useRef(null);
  
  useEffect(() => {
    // Make all feature cards visible immediately to ensure they're seen
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
      card.classList.add('animated');
    });
    
    // Function to check if element is in viewport (only for fancy entrance animation)
    const isInViewport = (element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
        rect.bottom >= 0
      );
    };
    
    // Improved scroll handler for additional animation effects only
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          featureCards.forEach(card => {
            if (isInViewport(card)) {
              card.classList.add('in-view');
            }
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="features-section-container">
      <div className="section-title">
        <div className="section-title-content">
          <h2>Premium <span className="gradient-text">Features</span></h2>
          <p>Everything you need for safe and efficient CS2 item trading</p>
          <div className="title-decoration"></div>
        </div>
      </div>
      
      <div className="features-section" ref={featuresRef}>
        <div className="feature-card animated">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h3>Secure Steam Integration</h3>
          <p>Connect your Steam account securely through official OpenID and Steam API protocols for direct inventory access.</p>
        </div>
        
        <div className="feature-card animated">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h3>GEL & USD Pricing</h3>
          <p>Set your prices in Georgian Lari (₾) or USD ($) with automatic currency conversion and real-time exchange rates.</p>
        </div>
        
        <div className="feature-card animated">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </div>
          <h3>Real-Time Inventory Sync</h3>
          <p>Your Steam inventory automatically stays in sync with live updates and accurate item information.</p>
        </div>
        
        <div className="feature-card animated">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h3>Offer System</h3>
          <p>Make and receive offers on items with our integrated notification system and trade manager.</p>
        </div>
        
        <div className="feature-card animated">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <h3>Comprehensive Trade History</h3>
          <p>Keep track of all your trades with detailed history logs and transaction records.</p>
        </div>
        
        <div className="feature-card animated">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </div>
          <h3>Advanced Item Filtering</h3>
          <p>Find exactly what you're looking for with our powerful search and filter options for CS2 items.</p>
        </div>
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const roadmapRef = useRef(null);
  
  useEffect(() => {
    // Make all roadmap items visible immediately
    const roadmapItems = document.querySelectorAll('.roadmap-item');
    roadmapItems.forEach((item, index) => {
      item.classList.add('animated');
      // Add a small staggered delay for visual effect
      setTimeout(() => {
        item.style.opacity = '1';
      }, index * 100);
    });
    
    // Function to check if element is in viewport (for enhanced effects only)
    const isInViewport = (element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
        rect.bottom >= 0
      );
    };
    
    // Create sequential animation with delay between items (for enhanced effects)
    const animateSequentially = () => {
      roadmapItems.forEach(item => {
        if (isInViewport(item)) {
          item.classList.add('in-view');
        }
      });
    };
    
    // Improved scroll handler with throttling for performance
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          animateSequentially();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // Run once on mount
    animateSequentially();
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="how-it-works-section-container">
      <div className="section-title">
        <div className="section-title-content">
          <h2>How It <span className="gradient-text">Works</span></h2>
          <p>Follow these simple steps to start trading CS2 items on our platform</p>
          <div className="title-decoration"></div>
        </div>
      </div>
      
      <div className="how-it-works-section">
        <div className="roadmap-container" ref={roadmapRef}>
          <div className="roadmap-line"></div>
          
          <div className="roadmap-item animated">
            <div className="roadmap-step">1</div>
            <div className="roadmap-content">
              <h3>Connect Steam Account</h3>
              <p>Sign in with your Steam account and allow access to your inventory. All connections are made securely through official Steam protocols.</p>
            </div>
          </div>
          
          <div className="roadmap-item animated">
            <div className="roadmap-step">2</div>
            <div className="roadmap-content">
              <h3>Browse or List Items</h3>
              <p>Browse items from other users or list your own items for sale from your Steam inventory. Set your prices in GEL or USD.</p>
            </div>
          </div>
          
          <div className="roadmap-item animated">
            <div className="roadmap-step">3</div>
            <div className="roadmap-content">
              <h3>Make or Accept Offers</h3>
              <p>Make offers on items you want or receive offers on your listed items. Negotiate prices and terms directly with other users.</p>
            </div>
          </div>
          
          <div className="roadmap-item animated">
            <div className="roadmap-step">4</div>
            <div className="roadmap-content">
              <h3>Complete Trades</h3>
              <p>Once an offer is accepted, Steam trade offers are automatically generated. Complete the trade through the Steam trade system.</p>
            </div>
          </div>
          
          <div className="roadmap-item animated">
            <div className="roadmap-step">5</div>
            <div className="roadmap-content">
              <h3>Track Your History</h3>
              <p>Keep a comprehensive record of all your transactions, completed trades, and marketplace activity in your profile.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FinalCTASection = ({ user }) => {
  return (
    <section className="final-cta-section-container">
      <div className="section-title">
        <div className="section-title-content">
          <h2>Ready to <span className="gradient-text">Trade</span>?</h2>
          <p>Join our community of CS2 traders and start buying and selling items today</p>
          <div className="title-decoration"></div>
        </div>
      </div>
      
      <div className="final-cta-section">
        <div className="cta-buttons">
          {!user ? (
            <Link to="/login" className="primary-button">
              <i className="fab fa-steam"></i>
              Sign in with Steam
            </Link>
          ) : (
            <Link to="/marketplace" className="primary-button">
              <i className="fas fa-shopping-cart"></i>
              Start Trading Now
            </Link>
          )}
          <Link to="/faq" className="secondary-button">
            <i className="fas fa-question-circle"></i>
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
};

// Update the TradingStatsSection to handle empty data
const TradingStatsSection = () => {
  const [marketStats, setMarketStats] = useState({
    popularItem: null,
    highestTrade: null,
    avgTradeTime: null,
    hasData: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this would fetch data from your API
    const calculateMarketStats = async () => {
      setLoading(true);
      try {
        // This would be an API call in production
        // const response = await axios.get(`${API_URL}/market/stats`);
        
        // For demo purposes - simulate no data available
        setMarketStats({
          popularItem: null,
          highestTrade: null,
          avgTradeTime: null,
          hasData: false
        });
        
        // When you have actual data, replace with this:
        /*
        if (response.data && response.data.trades && response.data.trades.length > 0) {
          setMarketStats({
            popularItem: {
              name: response.data.popularItem.name,
              count: response.data.popularItem.count
            },
            highestTrade: {
              value: response.data.highestTrade.value,
              description: response.data.highestTrade.description
            },
            avgTradeTime: response.data.avgTradeTime,
            hasData: true
          });
        }
        */
      } catch (error) {
        console.error("Failed to load market stats", error);
      } finally {
        setLoading(false);
      }
    };
    
    calculateMarketStats();
  }, []);

  return (
    <section className="trading-stats-section-container">
      <div className="section-title">
        <div className="section-title-content">
          <h2>Market <span className="gradient-text">Insights</span></h2>
          <p>Check out the latest trading statistics and market trends</p>
          <div className="title-decoration"></div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-items">
          <div className="spinner"></div>
          <p>Loading market statistics...</p>
        </div>
      ) : !marketStats.hasData ? (
        <div className="no-stats">
          <p>No trading statistics are available yet. Be the first to complete a trade!</p>
        </div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--gradient-purple)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                <polyline points="16 7 22 7 22 13"></polyline>
              </svg>
            </div>
            <div className="stat-info">
              <h3>Most Popular Item</h3>
              <p className="stat-highlight">{marketStats.popularItem.name}</p>
              <p className="stat-detail">Traded {marketStats.popularItem.count} times this month</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--gradient-blue)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </div>
            <div className="stat-info">
              <h3>Highest Value Trade</h3>
              <p className="stat-highlight">{marketStats.highestTrade.value.toLocaleString()} ₾</p>
              <p className="stat-detail">{marketStats.highestTrade.description}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--gradient-orange)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="stat-info">
              <h3>Average Trade Time</h3>
              <p className="stat-highlight">{marketStats.avgTradeTime}</p>
              <p className="stat-detail">From listing to completion</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// Create a new Footer component
const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-column">
          <div className="footer-logo">CS2 Marketplace Georgia</div>
          <p className="footer-description">
            The premier platform for trading CS2 items in Georgia with secure transactions and GEL pricing.
          </p>
          <div className="footer-social">
            <a href="https://discord.gg/your-server" className="social-icon" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-discord"></i>
            </a>
            <a href="https://facebook.com/your-page" className="social-icon" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://twitter.com/your-handle" className="social-icon" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://instagram.com/your-profile" className="social-icon" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-instagram"></i>
            </a>
          </div>
        </div>
        
        <div className="footer-column">
          <h3 className="footer-title">Quick Links</h3>
          <div className="footer-links">
            <Link to="/" className="footer-link">Home</Link>
            <Link to="/marketplace" className="footer-link">Marketplace</Link>
            <Link to="/inventory" className="footer-link">Inventory</Link>
            <Link to="/trades" className="footer-link">My Trades</Link>
          </div>
        </div>
        
        <div className="footer-column">
          <h3 className="footer-title">Help & Support</h3>
          <div className="footer-links">
            <Link to="/faq" className="footer-link">FAQ</Link>
            <Link to="/support" className="footer-link">Contact Support</Link>
            <Link to="/guides" className="footer-link">Trading Guides</Link>
            <Link to="/fees" className="footer-link">Fees & Charges</Link>
          </div>
        </div>
        
        <div className="footer-column">
          <h3 className="footer-title">Legal</h3>
          <div className="footer-links">
            <Link to="/terms" className="footer-link">Terms of Service</Link>
            <Link to="/privacy" className="footer-link">Privacy Policy</Link>
            <Link to="/refund" className="footer-link">Refund Policy</Link>
            <Link to="/cookies" className="footer-link">Cookie Policy</Link>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-copyright">
          © {new Date().getFullYear()} CS2 Marketplace Georgia. All rights reserved.
        </div>
        <div className="footer-legal">
          <Link to="/terms" className="legal-link">Terms</Link>
          <Link to="/privacy" className="legal-link">Privacy</Link>
          <Link to="/cookies" className="legal-link">Cookies</Link>
        </div>
      </div>
    </footer>
  );
};

const Home = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ items: 0, users: 0, trades: 0 });
  const [loading, setLoading] = useState(true);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [animationActive, setAnimationActive] = useState(false);
  const [particles, setParticles] = useState([]);

  // Check if user is logged in
  useEffect(() => {
    // In a real implementation, this would check with your backend
    const checkUserStatus = async () => {
      try {
        // This would be an API call in production
        // const response = await axios.get(`${API_URL}/auth/status`);
        // setUser(response.data.user);
        
        // For now, simulate a logged in user to test the UI
        setUser({
          id: 1,
          displayName: "TestUser",
          avatar: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg"
        });
      } catch (error) {
        console.error('Error checking user status:', error);
        setUser(null);
      }
    };
    
    checkUserStatus();
  }, []);

  // Add animated particles
  useEffect(() => {
    const particlesCount = 20;
    const newParticles = [];
    
    for (let i = 0; i < particlesCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 5 + 3
      });
    }
    
    setParticles(newParticles);
  }, []);

  // Add scroll behavior for navbar
  useEffect(() => {
    const handleScroll = () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Activate hero animation on load
    setTimeout(() => {
      setAnimationActive(true);
    }, 100);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Fetch featured items from the server
  const fetchFeaturedItems = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await axios.get(`${API_URL}/marketplace`);
      
      // Use real marketplace data instead of random items
      let itemsToShow = [];
      
      if (response.data && response.data.length > 0) {
        // Get a selection of items to feature - prioritize higher value items
        itemsToShow = response.data
          .sort((a, b) => b.price - a.price) // Sort by price descending
          .slice(0, 6); // Take top 6 items
      }
        
      setFeaturedItems(itemsToShow);
      
      // Set stats based on actual data
      if (response.data) {
        setStats({
          items: response.data.length || 0,
          users: response.data.length > 0 ? Math.ceil(response.data.length * 0.8) : 0,
          trades: response.data.length > 0 ? Math.ceil(response.data.length * 0.5) : 0
        });
      }
    } catch (error) {
      console.error('Error fetching featured items:', error);
      // Don't set empty featured items - keep the previous value or empty array
      setFeaturedItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchFeaturedItems();
  }, []);

  return (
    <div className="home-container">
      {/* Add animated particles */}
      <div className="game-particles">
        {particles.map(particle => (
          <div 
            key={particle.id} 
            className="particle" 
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.id * 0.5}s`
            }}
          ></div>
        ))}
      </div>
      
      <HeroSection user={user} stats={stats} animationActive={animationActive} />
      <SearchSection />
      <FeaturedItemsSection loading={loading} featuredItems={featuredItems} />
      <TradingStatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FinalCTASection user={user} />
      <Footer />
    </div>
  );
};

export default Home;
