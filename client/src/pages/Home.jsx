import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config/constants';
import './Home.css';

// Import the CS2 logo
import csLogo from './cs-logo.png';

// Helper function to get color for item rarity
const getColorForRarity = (rarity) => {
  const rarityLower = (rarity || '').toLowerCase();
  
  switch (rarityLower) {
    case 'factory new':
    case 'covert':
    case 'extraordinary':
    case 'contraband':
      return '#EB4B4B'; // Red
    case 'minimal wear':
    case 'classified':
      return '#D32CE6'; // Pink/Purple
    case 'field-tested':
    case 'restricted':
      return '#8847FF'; // Purple
    case 'well-worn':
    case 'mil-spec':
    case 'high grade':
      return '#4B69FF'; // Blue
    case 'battle-scarred':
    case 'industrial grade':
      return '#5E98D9'; // Light blue
    case 'consumer grade':
      return '#B0C3D9'; // Light grey
    default:
      return '#3498db'; // Default blue
  }
};

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
              <span className="stat-number gradient-text">{stats.items}+</span>
              <span className="stat-label">Items Listed</span>
            </div>
            <div className="stat-item">
              <span className="stat-number gradient-text">{stats.users}+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number gradient-text">{stats.trades}+</span>
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
            {featuredItems.map(item => (
              <div key={item._id} className="item-card">
                <div className="item-card-image">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="item-card-content">
                  <h3 className="item-name gradient-text">{item.name}</h3>
                  <span className="item-rarity" style={{ 
                    backgroundColor: getColorForRarity(item.rarity)
                  }}>
                    {item.rarity} {item.wear && `• ${item.wear}`}
                  </span>
                  <div className="item-meta">
                    <div className="item-price">
                      <span className="price-tag-currency gradient-text">GEL</span>
                      <span className="price-tag-amount gradient-text">
                        {(item.price/100).toFixed(2)}
                      </span>
                    </div>
                    <Link to={`/marketplace/${item._id}`} className="buy-now-button">
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
        <div className="empty-items">
          <div className="empty-items-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <h3>No Featured Items</h3>
          <p>Check back soon for featured CS2 items or browse our marketplace!</p>
          <Link to="/marketplace" className="primary-button">
            Browse Marketplace
          </Link>
        </div>
      )}
    </section>
  );
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

// Update the TradingStatsSection to use dynamic data from actual trades
const TradingStatsSection = () => {
  const [marketStats, setMarketStats] = useState({
    popularItem: { name: "Calculating...", count: 0 },
    highestTrade: { value: 0, description: "Calculating..." },
    avgTradeTime: "5-10 minutes"
  });

  useEffect(() => {
    // In a real implementation, this would fetch data from your API
    // For now, we'll use placeholder data that simulates a real calculation
    const calculateMarketStats = async () => {
      try {
        // This would be an API call in production
        // const response = await axios.get(`${API_URL}/market/stats`);
        
        // Simulate the stats based on your requirements
        // In reality, this data would come from your backend
        setMarketStats({
          popularItem: {
            name: "AWP | Neo-Noir",
            count: 38
          },
          highestTrade: {
            value: 12500,
            description: "Karambit | Fade (Factory New)"
          },
          avgTradeTime: "5-10 minutes"
        });
      } catch (error) {
        console.error("Failed to load market stats", error);
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
    </section>
  );
};

const Home = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ items: 0, users: 0, trades: 0 });
  const [loading, setLoading] = useState(true);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [animationActive, setAnimationActive] = useState(false);
  const [particles, setParticles] = useState([]);

  // Check user authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, { withCredentials: true });
        if (response.data && response.data.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUser(null);
      }
    };
    
    checkAuth();
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
      
      // Direct API call to marketplace endpoint
      const response = await axios.get(`${API_URL}/marketplace`);
      
      if (response.data && Array.isArray(response.data)) {
        // Set featured items directly from API
        setFeaturedItems(response.data);
        
        // Set fixed stats that don't change with item count
        setStats({
          items: response.data.length,
          users: 25, // Fixed number of users
          trades: 12  // Fixed number of trades
        });
      } else {
        setFeaturedItems([]);
        setStats({ items: 0, users: 0, trades: 0 });
      }
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
      setFeaturedItems([]);
      setStats({ items: 0, users: 0, trades: 0 });
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
    </div>
  );
};

export default Home;
