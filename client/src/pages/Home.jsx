import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ItemCard3D from '../components/ItemCard3D';
import './Home.css';
import { API_URL } from '../config/constants';
// Use a safer import approach for the image with a fallback
let csLogo;
try {
  csLogo = require('./cs-logo.png').default;
} catch (error) {
  console.warn("Could not load CS2 logo", error);
  csLogo = null;
}

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
              <span className="stat-number">{stats?.items || 0}+</span>
              <span className="stat-label">Items Listed</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats?.users || 0}+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats?.trades || 0}+</span>
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
              <a href={`${API_URL}/auth/steam`} className="primary-button">
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
          {csLogo ? (
            <img src={csLogo} alt="CS2 Logo" className="hero-image" />
          ) : (
            <div className="hero-image" style={{ backgroundColor: '#1e1e1e', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ffffff' }}>
              CS2
            </div>
          )}
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
  
  // Example item data for when items are still loading or not available
  const dummyItems = [
    {
      id: 'demo1',
      name: 'AK-47 | Asiimov',
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2Vcq1wsWfm8IWxukVQ0jfKeSXod7I_nw4Dvlag3aT_0UZB4jZMojO_H9on02Va3_kFqamiiJoLAI1c_MwzQ_ACggb_n2VQ/360fx360f',
      rarity: 'Covert',
      price: 9500,
      wear: 'Factory New'
    },
    {
      id: 'demo2',
      name: 'AWP | Neo-Noir',
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2Vcq1wsWfm8JmJkJV40jPOSTjFD_tuz2oLZlaX2MOrTwj4G7MUojLvFpNyk0Qbi-RI_N2v6LISdJARoMF6BrwO3kL3v15S5tJrXiSw0LV-FHg0/360fx360f',
      rarity: 'Classified',
      price: 7200,
      wear: 'Minimal Wear'
    },
    {
      id: 'demo3',
      name: 'Butterfly Knife | Fade',
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2Vcq1wsWfm4OvUYfwZm7P_JYzpG09-6lZKJkrmyN-qIk29XuZQoj-qQp9n0iVDk-kFoMD31JISUJAA3YliCrAO8w-a7hZa1vJjB1zI97XxxIgCm/360fx360f',
      rarity: 'Knife',
      price: 45000,
      wear: 'Factory New'
    },
    {
      id: 'demo4',
      name: 'M4A4 | The Emperor',
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2Vcq1wsWfm_Nbq1JghM7P_JYzpG09Cm5YmZm_LLPr7Vn35cppYnj7CVo46gihXj-UI-ZTr6J47AJwI9YwuD_FS7ye671pG9vsictD0xvyIG/360fx360f',
      rarity: 'Covert',
      price: 12800,
      wear: 'Field-Tested'
    }
  ];

  // Use dummy items as fallback
  const displayItems = Array.isArray(featuredItems) && featuredItems.length > 0 ? featuredItems : dummyItems;
  
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
      ) : (
        <>
          <div className="featured-grid">
            {displayItems.map(item => (
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
    try {
      // Safer approach to add animation class
      const featureCards = document.querySelectorAll('.feature-card');
      if (!featureCards || featureCards.length === 0) return;
      
      // Add animation class to all features immediately
      featureCards.forEach(card => {
        if (card) card.classList.add('animated');
      });
      
      // No need for scroll handler as we're showing all features immediately
    } catch (error) {
      console.error("Error in features animation:", error);
    }
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
    try {
      // Safer approach to add animation class
      const roadmapItems = document.querySelectorAll('.roadmap-item');
      if (!roadmapItems || roadmapItems.length === 0) return;
      
      // Add animation class to all roadmap items immediately
      roadmapItems.forEach(item => {
        if (item) item.classList.add('animated');
      });
      
      // No need for scroll handler as we're showing all items immediately
    } catch (error) {
      console.error("Error in roadmap animation:", error);
    }
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
      <div className="section-title">
        <div className="section-title-content">
          <h2>Ready to <span className="gradient-text">Trade</span>?</h2>
          <p>Join our community of CS2 traders and start buying and selling items today</p>
          <div className="title-decoration"></div>
        </div>
      </div>
      
      <div className="final-cta-section">
        <div className="cta-buttons">
          {user ? (
            <Link to="/inventory" className="primary-button">
              View My Inventory
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          ) : (
            <a href={`${API_URL}/auth/steam`} className="primary-button">
              Sign in with Steam
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
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

const Home = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ items: 200, users: 540, trades: 1420 }); // Default stats for display
  const [loading, setLoading] = useState(false);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [animationActive, setAnimationActive] = useState(false);

  // Add scroll behavior for navbar
  useEffect(() => {
    try {
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
      
      // Activate hero animation on load with a small delay
      const timer = setTimeout(() => {
        setAnimationActive(true);
      }, 100);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    } catch (error) {
      console.error("Error in scroll handling:", error);
    }
  }, []);

  // Fetch featured items from the server
  const fetchFeaturedItems = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/items/featured`);
      
      if (response.data && Array.isArray(response.data.items)) {
        setFeaturedItems(response.data.items);
      }
    } catch (error) {
      console.error("Error fetching featured items:", error);
      // Don't set featured items if there's an error - will use dummy data
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    try {
      fetchFeaturedItems();
    } catch (error) {
      console.error("Error in useEffect:", error);
    }
  }, []);

  return (
    <div className="home-container">
      <HeroSection user={user} stats={stats} animationActive={animationActive} />
      <SearchSection />
      <FeaturedItemsSection loading={loading} featuredItems={featuredItems} />
      <FeaturesSection />
      <HowItWorksSection />
      <FinalCTASection user={user} />
    </div>
  );
};

export default Home;
