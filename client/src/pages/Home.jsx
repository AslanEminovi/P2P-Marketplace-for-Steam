import React, { useState, useEffect } from 'react';
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
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
          <div className="cyber-corners"></div>
          <img 
            src="https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ5VeP-TLQDDX1D2e3RaofNt57tET-v1KyYUIP17mWJefDOXp2Vcq1wsWfm8IWxukVQ0jfKeSXod7I_nw4Dvlag3aT_0UZB4jZMojO_H9on02Va3_kFqamiiJoLAI1c_MwzQ_ACggb_n2VQ/360fx360f"
            alt="CS2 Marketplace"
            className="hero-image"
          />
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
  return (
    <section className="features-section-container">
      <div className="section-title">
        <div className="section-title-content">
          <h2><span className="gradient-text">Why Choose</span> Us</h2>
          <p>Our marketplace offers the best trading experience for CS2 items</p>
          <div className="title-decoration"></div>
        </div>
      </div>
      
      <div className="features-section">
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="#3FA9F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Secure Steam Integration</h3>
          <p>Our platform is fully integrated with Steam, ensuring secure authentication and safe trading of your valuable CS2 items through Steam's trusted trading system.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12M12 12V16M12 12H16M12 12H8M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#FF9D0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>GEL & USD Pricing</h3>
          <p>Unique to our marketplace, we offer both Georgian Lari (GEL) and US Dollar (USD) pricing options, making trading more accessible for the local Georgian community.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 10V3L4 14H11V21L20 10H13Z" stroke="#FF5F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Real-Time Inventory Sync</h3>
          <p>Our platform automatically syncs with your Steam inventory, ensuring that your items are always up-to-date and ready to trade without manual refreshing.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 10H21M7 15H8M12 15H13M6 19H18C19.1046 19 20 18.1046 20 17V7C20 5.89543 19.1046 5 18 5H6C4.89543 5 4 5.89543 4 7V17C4 18.1046 4.89543 19 6 19Z" stroke="#3FA9F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Offer System</h3>
          <p>Make and receive custom offers on any item with our flexible offer system. Negotiate better deals and get the items you want at the price you're comfortable with.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="#FF9D0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Comprehensive Trade History</h3>
          <p>Keep track of all your trades with our detailed history system. View past transactions, track the status of current trades, and maintain a complete record of your trading activity.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="#FF5F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="#FF5F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="#FF5F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Advanced Item Filtering</h3>
          <p>Find exactly what you're looking for with our advanced filtering system. Search by weapon type, skin name, wear value, float, pattern index, and more to discover your perfect items.</p>
        </div>
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  return (
    <section className="how-it-works-section-container">
      <div className="section-title">
        <div className="section-title-content">
          <h2><span className="gradient-text">How It</span> Works</h2>
          <p>Trading CS2 items has never been easier</p>
          <div className="title-decoration"></div>
        </div>
      </div>
      
      <div className="how-it-works-section">
        <div className="roadmap-container">
          <div className="roadmap-line"></div>
          
          <div className="roadmap-item">
            <div className="roadmap-content">
              <h3>1. Connect Your Steam Account</h3>
              <p>Start by securely connecting your Steam account to our platform. This allows us to synchronize your inventory and facilitate trades. Our integration uses Steam's official authentication system to ensure your account remains secure.</p>
            </div>
            <div className="roadmap-step">1</div>
          </div>
          
          <div className="roadmap-item">
            <div className="roadmap-content">
              <h3>2. Browse or List Items</h3>
              <p>After connecting, you can either browse the marketplace for items you want to buy or list your own CS2 items for sale. Our platform automatically syncs with your Steam inventory, showing real-time availability and item details.</p>
            </div>
            <div className="roadmap-step">2</div>
          </div>
          
          <div className="roadmap-item">
            <div className="roadmap-content">
              <h3>3. Make or Accept Offers</h3>
              <p>Found an item you like? Make an offer! You can negotiate directly with sellers through our offer system. If you're selling, you'll receive notifications when someone makes an offer on your items, which you can accept, decline, or counter.</p>
            </div>
            <div className="roadmap-step">3</div>
          </div>
          
          <div className="roadmap-item">
            <div className="roadmap-content">
              <h3>4. Complete the Trade</h3>
              <p>Once an offer is accepted, our system facilitates the trade through Steam's trading system. The platform guides you through the process step by step, ensuring a smooth and secure transaction that's fully transparent to both parties.</p>
            </div>
            <div className="roadmap-step">4</div>
          </div>
          
          <div className="roadmap-item">
            <div className="roadmap-content">
              <h3>5. Track Your History</h3>
              <p>After completing trades, you can view your full trading history in your profile. This includes all completed trades, pending offers, and transaction details, providing a comprehensive record of your trading activities.</p>
            </div>
            <div className="roadmap-step">5</div>
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
