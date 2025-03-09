import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ItemCard3D from '../components/ItemCard3D';
import './Home.css';
import { API_URL } from '../config/constants';

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
            {user ? (
              <Link to="/inventory" className="primary-button">
                View Your Inventory
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            ) : (
              <a href={`${process.env.REACT_APP_API_URL}/auth/steam`} className="primary-button">
                Sign in with Steam
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
              </a>
            )}
            <Link to="/marketplace" className="secondary-button">
              Browse Marketplace
            </Link>
          </div>
        </div>
        
        <div className="hero-image-container">
          <img src="./cs-logo.png" alt="CS2 Logo" className="hero-image" />
        </div>
      </div>
    </section>
  );
};

const SearchSection = () => {
  return (
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
  );
};

const FeaturedItemsSection = ({ loading, featuredItems }) => {
  const { t } = useTranslation();
  
  return (
    <section className="featured-section-container">
      <div className="featured-section">
        <div className="section-title">
          <div className="section-title-content">
            <h2><span className="gradient-text">Featured</span> Items</h2>
            <p>Discover the most popular CS2 items currently available on our marketplace</p>
            <div className="title-decoration"></div>
          </div>
        </div>
        
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
  );
};

const FeaturesSection = () => {
  const featuresRef = useRef(null);
  
  useEffect(() => {
    const featureCards = document.querySelectorAll('.feature-card');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
        }
      });
    }, { threshold: 0.2 });
    
    featureCards.forEach(card => {
      observer.observe(card);
    });
    
    return () => {
      featureCards.forEach(card => {
        observer.unobserve(card);
      });
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
        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h3>Secure Steam Integration</h3>
          <p>Connect your Steam account securely through official OpenID and Steam API protocols for direct inventory access.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h3>GEL & USD Pricing</h3>
          <p>Set your prices in Georgian Lari or USD with automatic currency conversion and real-time exchange rates.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </div>
          <h3>Real-Time Inventory Sync</h3>
          <p>Your Steam inventory automatically stays in sync with live updates and accurate item information.</p>
        </div>
        
        <div className="feature-card">
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
        
        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <h3>Comprehensive Trade History</h3>
          <p>Keep track of all your trades with detailed history logs and transaction records.</p>
        </div>
        
        <div className="feature-card">
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
    const roadmapItems = document.querySelectorAll('.roadmap-item');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
        }
      });
    }, { threshold: 0.2 });
    
    roadmapItems.forEach(item => {
      observer.observe(item);
    });
    
    return () => {
      roadmapItems.forEach(item => {
        observer.unobserve(item);
      });
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
          
          <div className="roadmap-item">
            <div className="roadmap-step">1</div>
            <div className="roadmap-content">
              <h3>Connect Steam Account</h3>
              <p>Sign in with your Steam account and allow access to your inventory. All connections are made securely through official Steam protocols.</p>
            </div>
          </div>
          
          <div className="roadmap-item">
            <div className="roadmap-step">2</div>
            <div className="roadmap-content">
              <h3>Browse or List Items</h3>
              <p>Browse items from other users or list your own items for sale from your Steam inventory. Set your prices in GEL or USD.</p>
            </div>
          </div>
          
          <div className="roadmap-item">
            <div className="roadmap-step">3</div>
            <div className="roadmap-content">
              <h3>Make or Accept Offers</h3>
              <p>Make offers on items you want or receive offers on your listed items. Negotiate prices and terms directly with other users.</p>
            </div>
          </div>
          
          <div className="roadmap-item">
            <div className="roadmap-step">4</div>
            <div className="roadmap-content">
              <h3>Complete Trades</h3>
              <p>Once an offer is accepted, Steam trade offers are automatically generated. Complete the trade through the Steam trade system.</p>
            </div>
          </div>
          
          <div className="roadmap-item">
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
      <div className="final-cta-section">
        <div className="section-title">
          <div className="section-title-content">
            <h2><span className="gradient-text">Ready to</span> Start Trading?</h2>
            <p>Join the largest CS2 marketplace in Georgia today and start trading your favorite items</p>
            <div className="title-decoration"></div>
          </div>
        </div>
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
          <Link to="/marketplace" className="secondary-button">
            Browse Marketplace
          </Link>
        </div>
      </div>
    </section>
  );
};

function Home({ user }) {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [stats, setStats] = useState({ items: 0, users: 0, trades: 0 });
  const [loading, setLoading] = useState(true);
  const [animationActive, setAnimationActive] = useState(false);

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
  
  return (
    <div className="home-container">
      {/* Each section is now a separate component for better organization and independent styling */}
      <HeroSection user={user} stats={stats} animationActive={animationActive} />
      <SearchSection />
      <FeaturedItemsSection loading={loading} featuredItems={featuredItems} />
      <FeaturesSection />
      <HowItWorksSection />
      <FinalCTASection user={user} />
    </div>
  );
}

export default Home;
