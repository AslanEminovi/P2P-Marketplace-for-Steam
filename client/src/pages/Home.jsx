import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from '../utils/languageUtils';
import { API_URL, getColorForRarity, getRarityGradient } from '../config/constants';
import socketService from '../services/socketService';
import './Home.css';
// Import background image
import backgroundImage from '../assets/background.jpg';

// Login Modal Component
const LoginModal = ({ isOpen, onClose }) => {
  console.log("LoginModal render - isOpen:", isOpen);

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay">
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

// Hero Section Component
const HeroSection = ({ user, stats, prevStats }) => {
  const { t } = useTranslation();
  const [animatedStats, setAnimatedStats] = useState({
    items: { value: 0, updating: false },
    users: { value: 0, updating: false },
    trades: { value: 0, updating: false }
  });
  const [showModal, setShowModal] = useState(false);

  // Debugging effect to monitor modal state changes
  useEffect(() => {
    console.log("HeroSection modal state changed:", showModal);
  }, [showModal]);

  // Animate stats when they change
  useEffect(() => {
    // First update the values without animation
    if (Object.values(animatedStats).every(stat => stat.value === 0)) {
      setAnimatedStats({
        items: { value: stats.items || 0, updating: false },
        users: { value: stats.users || 0, updating: false },
        trades: { value: stats.trades || 0, updating: false }
      });
      return;
    }

    // Next check what changed and animate those
    const newAnimatedStats = { ...animatedStats };
    let hasChanges = false;

    if (stats.items !== animatedStats.items.value) {
      newAnimatedStats.items = { value: stats.items, updating: true };
      hasChanges = true;
    }

    if (stats.users !== animatedStats.users.value) {
      newAnimatedStats.users = { value: stats.users, updating: true };
      hasChanges = true;
    }

    if (stats.trades !== animatedStats.trades.value) {
      newAnimatedStats.trades = { value: stats.trades, updating: true };
      hasChanges = true;
    }

    if (hasChanges) {
      setAnimatedStats(newAnimatedStats);

      // Remove animation classes after they've played
      setTimeout(() => {
        setAnimatedStats(prev => ({
          items: { value: prev.items.value, updating: false },
          users: { value: prev.users.value, updating: false },
          trades: { value: prev.trades.value, updating: false }
        }));
      }, 1000);
    }
  }, [stats]);

  return (
    <section className="hero-section-container">
      <div className="hero-decoration top-left"></div>
      <div className="hero-decoration bottom-right"></div>

      {/* Add background image div with imported image */}
      <div className="hero-background-image" style={{ 
        backgroundImage: `url(${backgroundImage})`,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        opacity: 0.1,
        zIndex: -2,
        pointerEvents: 'none',
        filter: 'blur(1px)',
        transform: 'scale(0.95)', /* Slightly shrink to fit better */
        transformOrigin: 'center center'
      }}></div>

      <div className="hero-content">
        <h1 className="hero-title">
          The Ultimate <span className="gradient-text" data-text="CS2 Marketplace">CS2 Marketplace</span> for Game Items
        </h1>
        <div className="geo-title">
          <span className="georgian-text">ითამაშე და ივაჭრე საუკეთესო ნივთებით</span>
        </div>
        <p className="hero-description">
          Buy and sell CS2 skins with confidence on our secure P2P marketplace.
          Trade directly with other players, no bots, no scams - just safe, fast, and reliable transactions.
        </p>

        <div className="hero-cta">
          <a href="/marketplace" className="hero-button primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Browse Marketplace
          </a>

          <a href="/marketplace?sort=latest" className="hero-button secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Live Trades
          </a>

          {user ? (
            <Link to="/sell" className="hero-button secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Sell Your Items
            </Link>
          ) : (
            <button onClick={() => {
              console.log("Hero section 'Sell Your Items' clicked, setting showModal to true");
              setShowModal(true);
            }} className="hero-button secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Sell Your Items
            </button>
          )}
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className={`hero-stat-value count-animation ${animatedStats.items.updating ? 'updating' : ''}`}>
              {animatedStats.items.value}
            </div>
            <div className="hero-stat-label">Active Listings</div>
          </div>

          <div className="hero-stat">
            <div className={`hero-stat-value count-animation ${animatedStats.users.updating ? 'updating' : ''}`}>
              {animatedStats.users.value}
            </div>
            <div className="hero-stat-label">Active Users</div>
          </div>

          <div className="hero-stat">
            <div className={`hero-stat-value count-animation ${animatedStats.trades.updating ? 'updating' : ''}`}>
              {animatedStats.trades.value}
            </div>
            <div className="hero-stat-label">Completed Trades</div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={showModal} onClose={() => setShowModal(false)} />
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
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="search-tags">
          <a href="/marketplace?category=rifle" className="search-tag">Rifles</a>
          <a href="/marketplace?category=knife" className="search-tag">Knives</a>
          <a href="/marketplace?category=pistol" className="search-tag">Pistols</a>
          <a href="/marketplace?category=glove" className="search-tag">Gloves</a>
          <a href="/marketplace?category=case" className="search-tag">Cases</a>
        </div>
      </div>
    </section>
  );
};

const FeaturedItemsSection = ({ loading, featuredItems }) => {
  // Add debug logging for featured items to see what we're working with
  console.log("Rendering featured items:", featuredItems);

  // Function to handle clicking "View All Items" - scroll to top before navigating
  const handleViewAllClick = (e) => {
    // Scroll to top of the page
    window.scrollTo(0, 0);
  };

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
      ) : featuredItems && featuredItems.length > 0 ? (
        <>
          <div className="featured-grid">
            {featuredItems.map((item, index) => {
              // Log each item to debug
              console.log(`Featured item ${index}:`, item);

              return (
                <div key={item._id || index} className="item-card featured-item">
                  <div className="item-card-image">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.marketHashName || 'CS2 Item'}
                        onError={(e) => {
                          console.log("Image failed to load, using fallback");
                          e.target.src = "https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2DJTv8Qg2LqXrI2l2QTj_kVvZz_1JNKQcQY5YFjS-1TokOq515fvuoOJlyW3Wr66DQ/";
                        }}
                      />
                    ) : (
                      <div className="no-image-placeholder">No Image Available</div>
                    )}
                  </div>
                  <div className="item-card-content">
                    <h3 className="item-name">{item.marketHashName || 'Unknown Item'}</h3>
                    <span className="item-rarity" style={{
                      background: getRarityGradient(item.rarity || 'Consumer Grade')
                    }}>
                      {item.rarity || 'Standard'} {item.wear && `• ${item.wear}`}
                    </span>
                    <div className="item-meta">
                      <div className="item-price">
                        <span className="price-tag-currency">$</span>
                        <span className="price-tag-amount">
                          {typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      {item.priceGEL !== undefined && (
                        <div className="item-price-gel">
                          <span className="price-tag-currency">₾</span>
                          <span className="price-tag-amount">
                            {typeof item.priceGEL === 'number' ? item.priceGEL.toFixed(2) : '0.00'}
                          </span>
                        </div>
                      )}
                      <a href={`/marketplace?item=${encodeURIComponent(item.marketHashName || '')}`} className="buy-now-button" onClick={handleViewAllClick}>
                        View Item
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="view-all-container">
            <a href="/marketplace" className="view-all-button" onClick={handleViewAllClick}>
              View All Items
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </>
      ) : (
        <div className="no-items-message">
          <p>No featured items available at the moment. Check back later!</p>
          <a href="/marketplace" className="view-all-button" onClick={handleViewAllClick}>
            Browse Marketplace
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      )}
    </section>
  );
};

const TradingStatsSection = ({ stats }) => {
  return (
    <section className="trading-stats-section">
      <div className="section-title">
        <div className="section-title-content">
          <h2>Market <span className="gradient-text">Statistics</span></h2>
          <p>Real-time data about our marketplace activity</p>
          <div className="title-decoration"></div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div className="stat-value">{stats.users.toLocaleString()}</div>
          <div className="stat-label">Active Users</div>
          <p className="stat-description">People actively trading on our platform this month</p>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div className="stat-value">{stats.items.toLocaleString()}</div>
          <div className="stat-label">Items Listed</div>
          <p className="stat-description">Total number of items listed on our marketplace</p>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="stat-value">{stats.trades > 0 ? '98.7%' : '0%'}</div>
          <div className="stat-label">Successful Trades</div>
          <p className="stat-description">Percentage of completed trades with satisfied users</p>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M16 6l-8 12"></path>
              <path d="M8 6l8 12"></path>
            </svg>
          </div>
          <div className="stat-value">{stats.trades.toLocaleString()}</div>
          <div className="stat-label">Completed Trades</div>
          <p className="stat-description">Total number of successful trades on our platform</p>
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  return (
    <section className="features-section">
      <div className="section-title">
        <div className="section-title-content">
          <h2>Platform <span className="gradient-text">Features</span></h2>
          <p>What makes our CS2 marketplace stand out from the rest</p>
          <div className="title-decoration"></div>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h3 className="feature-title">Secure Trading</h3>
          <p className="feature-description">Our escrow system ensures that all trades are secure and that both parties receive exactly what they agreed upon.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
            </svg>
          </div>
          <h3 className="feature-title">Low Fees</h3>
          <p className="feature-description">We charge one of the lowest fees in the industry, allowing you to maximize your profits when selling items.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.29 7 12 12 20.71 7"></polyline>
              <line x1="12" y1="22" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3 className="feature-title">Easy to Use</h3>
          <p className="feature-description">Our platform is designed to be intuitive and easy to use, with a clean interface that makes trading a breeze.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="2" y1="7" x2="7" y2="7"></line>
              <line x1="2" y1="17" x2="7" y2="17"></line>
              <line x1="17" y1="17" x2="22" y2="17"></line>
              <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>
          </div>
          <h3 className="feature-title">Real-time Updates</h3>
          <p className="feature-description">Get instant notifications for new listings, price changes, trade offers, and more with our real-time update system.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <h3 className="feature-title">Global Marketplace</h3>
          <p className="feature-description">Connect with buyers and sellers from all around the world, expanding your trading opportunities beyond borders.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 className="feature-title">Community Support</h3>
          <p className="feature-description">Join our vibrant community of CS2 players and traders, with dedicated support staff to assist you with any questions.</p>
        </div>
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  return (
    <section className="how-it-works-section">
      <div className="how-it-works-container">
        <div className="section-title">
          <div className="section-title-content">
            <h2>How It <span className="gradient-text">Works</span></h2>
            <p>Get started with our simple 4-step process to buy or sell CS2 items</p>
            <div className="title-decoration"></div>
          </div>
        </div>

        <div className="steps-connection"></div>

        <div className="steps-timeline">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3 className="step-title">Connect Your Account</h3>
            <p className="step-description">Sign in using your Steam account to access your inventory and trading features</p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <h3 className="step-title">Browse or List Items</h3>
            <p className="step-description">Find items to buy or list your own items for sale with competitive prices</p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <h3 className="step-title">Secure Payment</h3>
            <p className="step-description">Use our secure payment system to purchase items or receive funds for your sales</p>
          </div>

          <div className="step-card">
            <div className="step-number">4</div>
            <h3 className="step-title">Trade & Delivery</h3>
            <p className="step-description">Complete the trade and receive your items directly in your Steam inventory</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const FinalCTASection = ({ user }) => {
  const [showModal, setShowModal] = useState(false);

  // Debugging effect to monitor modal state changes
  useEffect(() => {
    console.log("FinalCTASection modal state changed:", showModal);
  }, [showModal]);

  return (
    <section className="final-cta-section">
      <div className="final-cta-background"></div>
      <div className="final-cta-decoration top-right"></div>
      <div className="final-cta-decoration bottom-left"></div>

      <div className="final-cta-content">
        <h2 className="final-cta-title">
          Ready to <span className="gradient-text">Trade</span>?
        </h2>
        <p className="final-cta-description">
          Join thousands of CS2 players who buy and sell items on our secure marketplace.
          No hidden fees, no scams - just seamless trading.
        </p>

        <div className="final-cta-buttons">
          {!user ? (
            <>
              <a href="/marketplace?sort=latest" className="hero-button primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Live Trades
              </a>

              <button onClick={() => {
                console.log("Final CTA section 'Sell Your Items' clicked, setting showModal to true");
                setShowModal(true);
              }} className="hero-button secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Sell Your Items
              </button>
            </>
          ) : (
            <>
              <Link to="/sell" className="hero-button primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Sell Your Items
              </Link>

              <a href="/marketplace" className="hero-button secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                Browse Marketplace
              </a>
            </>
          )}
        </div>

        {/* Login Modal */}
        <LoginModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </div>
    </section>
  );
};

const Home = ({ user }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [stats, setStats] = useState({
    items: 0,
    users: 0,
    trades: 0
  });

  // Function to handle stats updates from socket
  const handleStatsUpdate = useCallback((statsData) => {
    console.log("Received real-time stats update:", statsData);
    setStats({
      items: statsData.activeListings || 0,
      users: statsData.activeUsers || 0,
      trades: statsData.completedTrades || 0
    });
  }, []);

  // Fetch data from API endpoints
  const fetchMarketplaceData = useCallback(async () => {
    try {
      setLoading(true);

      // Featured items
      try {
        console.log("Fetching featured items from:", `${API_URL}/marketplace?limit=6&sort=latest`);
        const itemsResponse = await axios.get(`${API_URL}/marketplace?limit=6&sort=latest`, {
          withCredentials: true,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log("Marketplace response:", itemsResponse);

        if (Array.isArray(itemsResponse.data)) {
          console.log("Successfully retrieved items from marketplace endpoint");
          const marketplaceItems = itemsResponse.data.map(item => ({
            ...item,
            price: typeof item.price === 'number' ? item.price : 0,
            priceGEL: typeof item.priceGEL === 'number' ? item.priceGEL : Math.round((item.price || 0) * 2.65)
          }));
          setFeaturedItems(marketplaceItems);
        } else {
          console.warn("Response data is not an array:", itemsResponse.data);
          setFeaturedItems([]);
        }
      } catch (error) {
        console.error("Error in featured items fetch:", error.response || error);
        if (error.response) {
          console.error("Error response data:", error.response.data);
          console.error("Error response status:", error.response.status);
        }
        setFeaturedItems([]);
      }

      // Request updated stats
      if (socketService.isConnected()) {
        console.log("Requesting stats update from server");
        socketService.emit('request_stats_update');
      } else {
        console.log("Socket not connected, attempting to reconnect");
        socketService.reconnect();
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching marketplace data:", error);
      setFeaturedItems([]);
      setLoading(false);
    }
  }, []);

  // Initialize socket connection and set up listeners
  useEffect(() => {
    // Initialize socket service if it's not already
    if (!socketService.isConnected) {
      socketService.init();
    }

    // Set up listener for stats updates
    socketService.on('stats_update', handleStatsUpdate);

    // Set up listener for connection status changes
    socketService.on('connection_status', (status) => {
      console.log("Socket connection status:", status);

      // If we're connected, request a stats update
      if (status.connected) {
        console.log("Connected to server, requesting stats update");
        socketService.socket.emit('request_stats_update');
      }
    });

    // Add event listeners for page visibility and focus changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page became visible again, refreshing data");
        fetchMarketplaceData();
        if (socketService.isConnected && socketService.socket) {
          socketService.socket.emit('request_stats_update');
        }
      }
    };

    const handleFocus = () => {
      console.log("Window regained focus, refreshing data");
      fetchMarketplaceData();
      if (socketService.isConnected && socketService.socket) {
        socketService.socket.emit('request_stats_update');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Clean up listeners when component unmounts
    return () => {
      socketService.off('stats_update', handleStatsUpdate);
      socketService.off('connection_status');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleStatsUpdate, fetchMarketplaceData]);

  // Initial fetch of marketplace data
  useEffect(() => {
    fetchMarketplaceData();
  }, [fetchMarketplaceData]);

  return (
    <div className="home-container">
      {/* Particles Background */}
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
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          />
        ))}

        {/* Energy Orbs */}
        {energyOrbs.map(orb => (
          <div
            key={`orb-${orb.id}`}
            className="energy-orb"
            style={{
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              width: `${orb.size}px`,
              height: `${orb.size}px`,
              animationDelay: `${orb.delay}s`
            }}
          />
        ))}

        {/* Floating Hexagons */}
        {floatingHexagons.map(hex => (
          <div
            key={`hex-${hex.id}`}
            className="floating-hex"
            style={{
              left: `${hex.left}%`,
              width: `${hex.size}px`,
              height: `${hex.size * 0.866}px`, // Height of hexagon based on width
              opacity: hex.opacity,
              animationDelay: `${hex.delay}s`,
              animationDuration: `${hex.duration}s`
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <HeroSection user={user} stats={stats} />

      {/* Search Section */}
      <SearchSection />

      {/* Featured Items Section */}
      <FeaturedItemsSection loading={loading} featuredItems={featuredItems} />

      {/* Trading Stats Section - pass stats to the component */}
      <TradingStatsSection stats={stats} />

      {/* Features Section */}
      <FeaturesSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Final CTA Section */}
      <FinalCTASection user={user} />
    </div>
  );
};

export default Home;
