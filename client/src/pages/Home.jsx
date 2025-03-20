import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_URL, getColorForRarity } from '../config/constants';
import './Home.css';

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

const particles = generateParticles(30);

// Hero Section Component
const HeroSection = ({ user, stats, prevStats }) => {
  const { t } = useTranslation();
  const [animatedStats, setAnimatedStats] = useState({
    items: { value: 0, updating: false },
    users: { value: 0, updating: false },
    trades: { value: 0, updating: false }
  });

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

      <div className="hero-content">
        <h1 className="hero-title">
          The Ultimate <span className="gradient-text" data-text="CS2 Marketplace">CS2 Marketplace</span> for Game Items
        </h1>
        <p className="hero-description">
          Buy and sell CS2 skins with confidence on our secure P2P marketplace.
          Trade directly with other players, no bots, no scams - just safe, fast, and reliable transactions.
        </p>

        <div className="hero-cta">
          <Link to="/marketplace" className="hero-button primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Browse Marketplace
          </Link>

          {!user && (
            <a href={`${API_URL}/auth/steam`} className="hero-button secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Sign in with Steam
            </a>
          )}

          {user && (
            <Link to="/sell" className="hero-button secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Sell Your Items
            </Link>
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
          <Link to="/marketplace?category=rifle" className="search-tag gradient-text">Rifles</Link>
          <Link to="/marketplace?category=knife" className="search-tag gradient-text">Knives</Link>
          <Link to="/marketplace?category=pistol" className="search-tag gradient-text">Pistols</Link>
          <Link to="/marketplace?category=glove" className="search-tag gradient-text">Gloves</Link>
          <Link to="/marketplace?category=case" className="search-tag gradient-text">Cases</Link>
        </div>
      </div>
    </section>
  );
};

const FeaturedItemsSection = ({ loading, featuredItems }) => {
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
            {featuredItems.map((item, index) => (
              <div key={item._id || index} className="item-card">
                <div className="item-card-image">
                  {item.image ? (
                    <img src={item.image} alt={item.name || 'CS2 Item'} />
                  ) : (
                    <div className="no-image-placeholder">No Image Available</div>
                  )}
                </div>
                <div className="item-card-content">
                  <h3 className="item-name gradient-text">{item.name || 'Unknown Item'}</h3>
                  <span className="item-rarity" style={{
                    backgroundColor: getColorForRarity(item.rarity || 'Consumer Grade')
                  }}>
                    {item.rarity || 'Standard'} {item.wear && `• ${item.wear}`}
                  </span>
                  <div className="item-meta">
                    <div className="item-price">
                      <span className="price-tag-currency gradient-text">GEL</span>
                      <span className="price-tag-amount gradient-text">
                        {((item.price || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <Link to={`/marketplace/${item._id}`} className="buy-now-button">
                      View Item
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
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
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>
      ) : (
        <div className="loading-items">
          <p>No items available at the moment. Please check back later!</p>
        </div>
      )}
    </section>
  );
};

const TradingStatsSection = () => {
  return (
    <section className="trading-stats-section">
      <div className="section-title">
        <div className="section-title-content">
          <h2>Platform <span className="gradient-text">Statistics</span></h2>
          <p>Check out our marketplace performance and trading activity</p>
          <div className="title-decoration"></div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <div className="stat-value">99.8%</div>
          <div className="stat-label">Success Rate</div>
          <div className="stat-description">Nearly all transactions are completed successfully without any issues</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-value">5 min</div>
          <div className="stat-label">Avg. Trade Time</div>
          <div className="stat-description">Most trades are completed within minutes after payment</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="stat-value">$1,245</div>
          <div className="stat-label">Highest Value Trade</div>
          <div className="stat-description">Record-setting item sold on our marketplace</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
          <div className="stat-value">8,547+</div>
          <div className="stat-label">Total Deliveries</div>
          <div className="stat-description">Items successfully delivered to buyers worldwide</div>
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
          <h2>Premium <span className="gradient-text">Features</span></h2>
          <p>Experience the best CS2 item trading platform with our unique features</p>
          <div className="title-decoration"></div>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7h-9"></path>
              <path d="M14 17H5"></path>
              <circle cx="17" cy="17" r="3"></circle>
              <circle cx="7" cy="7" r="3"></circle>
            </svg>
          </div>
          <h3 className="feature-title">P2P Trading</h3>
          <p className="feature-description">Trade directly with other players without middlemen. Secure, fast, and reliable transactions every time.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h3 className="feature-title">Secure Escrow</h3>
          <p className="feature-description">All trades are protected by our escrow system. Your money is safe until you receive your items.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
            </svg>
          </div>
          <h3 className="feature-title">Instant Inventory</h3>
          <p className="feature-description">Connect your Steam account and instantly list your CS2 items for sale with just a few clicks.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h3 className="feature-title">Multiple Payment Methods</h3>
          <p className="feature-description">Pay using credit cards, cryptocurrency, or other popular payment methods with low transaction fees.</p>
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
              <a href={`${API_URL}/auth/steam`} className="hero-button primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Sign in with Steam
              </a>

              <Link to="/marketplace" className="hero-button secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Browse Marketplace
              </Link>
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

              <Link to="/marketplace" className="hero-button secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Browse Marketplace
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [stats, setStats] = useState({ items: 0, users: 0, trades: 0 });
  const [animationActive, setAnimationActive] = useState(false);

  // Setup real-time stat updates
  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up polling for real-time updates
    const statsInterval = setInterval(() => {
      fetchStats();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(statsInterval);
  }, []);

  // Fetch platform statistics
  const fetchStats = async () => {
    try {
      // Try to get stats from API endpoint
      const response = await axios.get(`${API_URL}/stats`);

      if (response.data) {
        setStats({
          items: response.data.activeListings || 0,
          users: response.data.activeUsers || 0,
          trades: response.data.completedTrades || 0
        });
      }
    } catch (error) {
      console.error('Error fetching platform statistics:', error);

      try {
        // Fallback: manually calculate stats from marketplace
        const marketplaceResponse = await axios.get(`${API_URL}/marketplace`);

        if (marketplaceResponse.data && Array.isArray(marketplaceResponse.data)) {
          // Get active listings count directly from API
          const activeListings = marketplaceResponse.data.length;

          // Generate simulated stats as fallback
          const activeUsers = Math.max(25, Math.floor(activeListings * 1.2) + Math.floor(Math.random() * 5));
          const completedTrades = Math.floor(activeListings * 0.6) + Math.floor(Math.random() * 3);

          setStats({
            items: activeListings,
            users: activeUsers,
            trades: completedTrades
          });
        }
      } catch (fallbackError) {
        console.error('Fallback stats calculation also failed:', fallbackError);
        // If all else fails, use existing stats or zeros
      }
    }
  };

  // Fetch featured items from the server
  const fetchFeaturedItems = async () => {
    try {
      setLoading(true);

      // Use the dedicated featured items endpoint
      const response = await axios.get(`${API_URL}/marketplace/featured`);

      if (response.data && Array.isArray(response.data)) {
        // Set featured items directly from API
        setFeaturedItems(response.data);

        // Update the items count at minimum
        setStats(prev => ({
          ...prev,
          items: response.data.length
        }));
      } else {
        setFeaturedItems([]);
      }
    } catch (error) {
      console.error('Error fetching featured items:', error);
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

      <HeroSection user={user} stats={stats} />
      <SearchSection />
      <FeaturedItemsSection loading={loading} featuredItems={featuredItems} />
      <TradingStatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FinalCTASection user={user} />
    </div>
  );
};

export default Home;
