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

const Home = ({ user }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [stats, setStats] = useState({
    items: 0,
    users: 0,
    trades: 0
  });

  // Fetch marketplace stats and featured items
  useEffect(() => {
    const fetchMarketplaceData = async () => {
      setLoading(true);

      try {
        // Fetch statistics for the marketplace
        console.log("Fetching marketplace stats...");
        const statsResponse = await axios.get(`${API_URL}/marketplace/stats`);
        console.log("Stats response:", statsResponse.data);
        
        if (statsResponse.data) {
          setStats({
            items: statsResponse.data.activeListings || 0,
            users: statsResponse.data.activeUsers || 0,
            trades: statsResponse.data.completedTrades || 0
          });
        }
        
        // Fetch featured items
        console.log("Fetching featured items...");
        const featuredResponse = await axios.get(`${API_URL}/marketplace/featured`);
        console.log("Featured items response:", featuredResponse.data);
        
        if (featuredResponse.data && Array.isArray(featuredResponse.data)) {
          setFeaturedItems(featuredResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch marketplace stats:', error);
        // Show fallback data if fetch fails
        setStats({
          items: 1200,
          users: 500,
          trades: 3000
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplaceData();
  }, []);

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
      </div>

      {/* Hero Section */}
      <HeroSection user={user} stats={stats} />

      {/* Search Section */}
      <SearchSection />

      {/* Featured Items Section */}
      <FeaturedItemsSection loading={loading} featuredItems={featuredItems} />

      {/* Trading Stats Section */}
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

      {/* Features Section */}
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
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <div className="final-cta-decoration top-right"></div>
        <div className="final-cta-decoration bottom-left"></div>
        <div className="final-cta-background"></div>
        
        <div className="final-cta-content">
          <h2 className="final-cta-title">
            Ready to <span className="gradient-text">Trade</span>?
          </h2>
          <p className="final-cta-description">
            Join thousands of CS2 players who trust our platform for safe and reliable item trading. Sign up now and start trading in minutes!
          </p>
          <div className="final-cta-buttons">
            {!user ? (
              <a href={`${API_URL}/auth/steam`} className="hero-button primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Sign in with Steam
              </a>
            ) : (
              <Link to="/marketplace" className="hero-button primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Browse Marketplace
              </Link>
            )}
            <Link to="/marketplace" className="hero-button secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
              View All Items
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
