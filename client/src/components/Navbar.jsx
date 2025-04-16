import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { API_URL } from '../config/constants';
import axios from 'axios';
import NotificationCenter from './NotificationCenter';
import LanguageSwitcher from './LanguageSwitcher';
import './Navbar.css';
import { toast } from 'react-hot-toast';
import { FaWallet, FaCaretDown, FaPlus, FaSearch, FaUser, FaBars, FaTimes, FaMoneyBillWave, FaDollarSign, FaLiraSign, FaChevronDown, FaExchangeAlt } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/cs-logo.png';

// Remove logo import since it's not needed
// import csLogo from '../assets/cs-logo.png';

// Navbar now receives user and onLogout as props
const Navbar = ({ user, onLogout }) => {
  const { isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [pendingTradesCount, setPendingTradesCount] = useState(0);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(user?.settings?.currency || 'USD');
  const location = useLocation();
  const navigate = useNavigate();
  
  // Refs for click outside detection
  const dropdownRef = useRef(null);
  const profileBtnRef = useRef(null);
  const walletDropdownRef = useRef(null);
  
  // Debug: Log user data for inspection
  useEffect(() => {
    console.log("Navbar received user data:", user);
    if (user) {
      console.log("User avatar:", user.avatar);
      console.log("User display name:", user.displayName);
    }
  }, [user]);
  
  // Fetch pending trades count
  useEffect(() => {
    if (user) {
      const fetchPendingTrades = async () => {
        try {
          const response = await axios.get(`${API_URL}/trades/history`, { 
            withCredentials: true 
          });
          
          if (Array.isArray(response.data)) {
            const activeTrades = response.data.filter(trade => 
              ['awaiting_seller', 'offer_sent', 'awaiting_confirmation', 'created', 'pending'].includes(trade?.status)
            );
            setPendingTradesCount(activeTrades.length);
          }
        } catch (err) {
          console.error('Error fetching pending trades count:', err);
        }
      };
      
      fetchPendingTrades();
      
      // Refresh pending trades count every 5 minutes
      const interval = setInterval(fetchPendingTrades, 300000);
      return () => clearInterval(interval);
    }
  }, [user]);
  
  // Enhanced scroll effect with direction detection
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      
      // Always show navbar when at top of page
      if (currentScrollPos < 50) {
        setScrolled(false);
        setHidden(false);
        return;
      }
      
      // Only change state when necessary to prevent unnecessary re-renders
      if (currentScrollPos > 50 && !scrolled) {
        setScrolled(true);
      }
      
      // Use a threshold to prevent small scroll movements from triggering hide/show
      const scrollDifference = currentScrollPos - scrollPosition;
      
      // Hide when scrolling down (positive difference)
      if (scrollDifference > 10 && !hidden) {
        setHidden(true);
      } 
      // Show when scrolling up (negative difference)
      else if (scrollDifference < -10 && hidden) {
        setHidden(false);
      }
      
      // Update scroll position
      setScrollPosition(currentScrollPos);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrollPosition, hidden, scrolled]);
  
  // Handle dropdown visibility and outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      // Only handle outside clicks if dropdown is open
      if (!dropdownOpen) return;
      
      // Don't close if clicking the profile button itself
      if (profileBtnRef.current && profileBtnRef.current.contains(event.target)) {
        return;
      }
      
      // Don't close if clicking inside the dropdown menu
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return;
      }

      // Close dropdown for clicks outside both elements
      setDropdownOpen(false);
    }
    
    // Use capture phase for better handling
    document.addEventListener("mousedown", handleClickOutside, true);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [dropdownOpen]);
  
  // Close mobile menu when changing routes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);
  
  // Simple toggle function - no prevent default to avoid issues
  const toggleDropdown = () => {
    setDropdownOpen(prev => !prev);
  };
  
  // Get user initials for avatar placeholder
  const getUserInitials = () => {
    if (!user || !user.displayName) return '';
    return user.displayName.charAt(0).toUpperCase();
  };
  
  // Format balance
  const formatBalance = (balance) => {
    if (!balance) return '0.00';
    
    const amount = parseFloat(balance);
    if (selectedCurrency === 'GEL') {
      // Assuming 1 USD = 2.7 GEL (this should ideally come from an API or config)
      return (amount * 2.7).toFixed(2);
    }
    return amount.toFixed(2);
  };
  
  // Use the logout handler from props
  const handleLogout = () => {
    // Close dropdown first
    setDropdownOpen(false);
    
    // Call the onLogout prop function
    if (onLogout) {
      onLogout();
    }
  };

  const handleSellItemsClick = (e) => {
    if (!user) {
      e.preventDefault();
      setShowSignInPrompt(true);
    }
  };

  // Toggle wallet dropdown
  const toggleWalletDropdown = () => {
    setShowWalletDropdown(prev => !prev);
  };

  // Handle currency selection
  const handleCurrencyChange = (currency) => {
    setSelectedCurrency(currency);
    localStorage.setItem('preferredCurrency', currency);
    toast.success(`Currency changed to ${currency}`);
    setShowWalletDropdown(false);
  };

  // Handle deposit click
  const handleDepositClick = () => {
    navigate('/wallet');
    setShowWalletDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownElement = document.querySelector('.wallet-dropdown-container');
      if (dropdownElement && !dropdownElement.contains(event.target)) {
        setShowWalletDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${mobileOpen ? 'mobile-open' : ''} ${hidden ? 'navbar-hidden' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-left">
            <Link to="/" className="navbar-logo">
              {/* Display logo text and Georgian text next to each other */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="logo-text">CS2 Marketplace</span>
                <span className="georgian-text" style={{ marginTop: '4px', fontSize: '0.8em' }}>საქართველო</span>
              </div>
            </Link>
            
            {/* Move social links outside of logo for better positioning */}
            <div className="logo-social-links">
              <a href="https://discord.com/channels/1361407438670139442/1361407439575974100" target="_blank" rel="noopener noreferrer" className="logo-social-link" title="Join our Discord">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"></path>
                </svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61575170342758" target="_blank" rel="noopener noreferrer" className="logo-social-link" title="Follow us on Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
            
            <div className="navbar-links desktop-only">
              <NavLink to="/marketplace" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Marketplace
              </NavLink>
              <NavLink 
                to="/inventory" 
                className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}
                onClick={handleSellItemsClick}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="8" x2="8" y2="8"></line>
                  <line x1="16" y1="12" x2="8" y2="12"></line>
                  <line x1="16" y1="16" x2="8" y2="16"></line>
                </svg>
                <span>Sell Items</span>
              </NavLink>
              <NavLink to="/faq" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                FAQ
              </NavLink>
            </div>
          </div>
          
          <div className="navbar-right">
            {user ? (
              <div className="user-section" style={{ display: 'flex', alignItems: 'center' }}>
                
                <div className="wallet-dropdown-container" ref={walletDropdownRef}>
                  <button className="wallet-nav-link" onClick={toggleWalletDropdown}>
                    <FaWallet className="wallet-icon" />
                    <span className="wallet-amount">
                      {selectedCurrency === 'USD' 
                        ? <span className="amount-with-symbol">$<span>{formatBalance(user.walletBalance)}</span></span>
                        : <span className="amount-with-symbol"><span>{formatBalance(user.walletBalance)}</span>₾</span>}
                    </span>
                    <FaCaretDown className="dropdown-caret" />
                  </button>
                  
                  {showWalletDropdown && (
                    <div className="wallet-dropdown">
                      <button className="wallet-dropdown-item" onClick={handleDepositClick}>
                        <FaMoneyBillWave className="deposit-icon" />
                        <span>Deposit</span>
                      </button>
                      
                      <div className="wallet-dropdown-divider"></div>
                      
                      <div className="wallet-dropdown-currency">
                        <span className="currency-label">Currency</span>
                        <div className="currency-options">
                          <button 
                            className={`currency-option ${selectedCurrency === 'USD' ? 'active' : ''}`}
                            onClick={() => handleCurrencyChange('USD')}
                          >
                            USD
                          </button>
                          <button 
                            className={`currency-option ${selectedCurrency === 'GEL' ? 'active' : ''}`}
                            onClick={() => handleCurrencyChange('GEL')}
                          >
                            GEL
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Wrap both profile button and notification in a flex container */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="profile-dropdown-container">
                    <button 
                      ref={profileBtnRef}
                      className="profile-button" 
                      onClick={toggleDropdown}
                      aria-expanded={dropdownOpen}
                      aria-haspopup="true"
                    >
                      {/* User Avatar - Restored to button */}
                      <div className="user-avatar-container">
                        {user.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={`${user.displayName}'s avatar`} 
                            className="user-avatar-image"
                            style={{width: '100%', height: '100%', objectFit: 'cover'}}
                          />
                        ) : (
                          <div className="user-avatar-container">
                            {getUserInitials()}
                          </div>
                        )}
                      </div>
                      <span className="desktop-only">{user.displayName}</span>
                      
                      {/* Admin Badge for admins */}
                      {user.isAdmin && (
                        <span 
                          className="admin-badge" 
                          style={{
                            backgroundColor: '#f59e0b',
                            color: '#000',
                            fontSize: '0.6rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginLeft: '6px',
                            fontWeight: 'bold',
                            letterSpacing: '0.5px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            textTransform: 'uppercase'
                          }}
                        >
                          ADMIN
                        </span>
                      )}
                      <div className={`dropdown-arrow ${dropdownOpen ? 'active' : ''}`}>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </button>
                    
                    {dropdownOpen && (
                      <div 
                        ref={dropdownRef}
                        className="user-dropdown"
                      >
                        <div className="dropdown-header">
                          <div className="dropdown-user-info">
                            <span className="dropdown-username">
                              {user.displayName}
                            </span>
                            <div className="dropdown-email-container">
                              <span className="dropdown-email">{user.email || 'No email provided'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="dropdown-menu-items">
                          <NavLink to="/profile" className="dropdown-menu-item" onClick={() => setDropdownOpen(false)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            My Profile
                          </NavLink>
                          
                          <NavLink to="/inventory" className="dropdown-menu-item" onClick={() => setDropdownOpen(false)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="8" x2="8" y2="8"></line>
                              <line x1="16" y1="12" x2="8" y2="12"></line>
                              <line x1="16" y1="16" x2="8" y2="16"></line>
                            </svg>
                            My Inventory
                          </NavLink>
                          
                          <NavLink to="/trades" className="dropdown-menu-item trades-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <div className="trades-dropdown-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="17 1 21 5 17 9"></polyline>
                                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                <polyline points="7 23 3 19 7 15"></polyline>
                                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                              </svg>
                              {pendingTradesCount > 0 && (
                                <span className="trades-dropdown-badge">{pendingTradesCount}</span>
                              )}
                            </div>
                            <div className="trades-dropdown-content">
                              <span>My Trades</span>
                              {pendingTradesCount > 0 && (
                                <span className="trades-dropdown-status">
                                  {pendingTradesCount} active {pendingTradesCount === 1 ? 'trade' : 'trades'}
                                </span>
                              )}
                            </div>
                          </NavLink>
                          
                          <NavLink to="/settings" className="dropdown-menu-item" onClick={() => setDropdownOpen(false)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="3"></circle>
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            Settings
                          </NavLink>
                          
                          <NavLink to="/wallet" className="dropdown-menu-item" onClick={() => setDropdownOpen(false)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                              <line x1="2" y1="10" x2="22" y2="10"></line>
                            </svg>
                            My Wallet
                          </NavLink>
                          
                          {/* Add Admin Tools link for admins */}
                          {user.isAdmin && (
                            <NavLink to="/admin/tools" className="dropdown-menu-item admin-link" onClick={() => setDropdownOpen(false)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              </svg>
                              Admin Panel
                            </NavLink>
                          )}
                        
                          <div className="dropdown-divider"></div>
                        
                        <button
                                onClick={handleLogout}
                                className="dropdown-menu-item logout"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                  <polyline points="16 17 21 12 16 7"></polyline>
                                  <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                Log Out
                        </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Add notification center NEXT TO profile button */}
                  {user && <NotificationCenter user={user} />}
                </div>
              </div>
            ) : (
                <a href={`${API_URL}/auth/steam`} className="sign-in-button">
                  <img 
                    src="Steam-Emblem.png" 
                    alt="Steam" 
                    className="steam-icon" 
                    width="24" 
                    height="24" 
                  />
                  Sign in with Steam
                </a>
              )}
            
            <button 
              className="mobile-menu-toggle" 
              aria-label="Toggle mobile menu"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className="mobile-menu">
          <div className="mobile-menu-links">
            <NavLink to="/marketplace" className={({ isActive }) => 
              isActive ? 'mobile-menu-link active' : 'mobile-menu-link'
            }>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              Marketplace
            </NavLink>
            
            {/* Change mobile "Sell Items" to also link to inventory */}
            <NavLink to="/inventory" className={({ isActive }) => 
              isActive ? 'mobile-menu-link active' : 'mobile-menu-link'
            }>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>Sell Items</span>
            </NavLink>
            
            {user && (
              <>
                <NavLink to="/inventory" className={({ isActive }) => 
                isActive ? 'mobile-menu-link active' : 'mobile-menu-link'
              }>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="8" x2="8" y2="8"></line>
                  <line x1="16" y1="12" x2="8" y2="12"></line>
                  <line x1="16" y1="16" x2="8" y2="16"></line>
                </svg>
                My Inventory
              </NavLink>
              
              <NavLink to="/trades" className={({ isActive }) => 
                isActive ? 'mobile-menu-link active' : 'mobile-menu-link'
              }>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9"></polyline>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                  <polyline points="7 23 3 19 7 15"></polyline>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                </svg>
                My Trades
              </NavLink>
              
              <NavLink to="/profile" className={({ isActive }) => 
                isActive ? 'mobile-menu-link active' : 'mobile-menu-link'
              }>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                My Profile
              </NavLink>
            </>
            )}
          
            <NavLink to="/faq" className={({ isActive }) => 
              isActive ? 'mobile-menu-link active' : 'mobile-menu-link'
            }>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              FAQ
            </NavLink>
            
            {!user && (
              <a href={`${API_URL}/auth/steam`} className="mobile-menu-link steam-login">
                <img 
                  src="Steam-Emblem.png" 
                  alt="Steam" 
                  className="steam-icon" 
                  width="24" 
                  height="24" 
                />
                Sign in with Steam
              </a>
            )}
          </div>
          
          <div className="mobile-menu-social">
            <a href="https://discord.com/channels/1361407438670139442/1361407439575974100" target="_blank" rel="noopener noreferrer" className="mobile-social-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"></path>
              </svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61575170342758" target="_blank" rel="noopener noreferrer" className="mobile-social-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* Sign In Prompt Modal - moved outside the navbar structure */}
      {showSignInPrompt && (
        <div 
          className="sign-in-prompt-modal"
          onClick={() => setShowSignInPrompt(false)}
        >
          <div 
            className="sign-in-prompt-content"
            onClick={e => e.stopPropagation()}
          >
            <h2>Sign In Required</h2>
            <p>You need to sign in with Steam to sell items on the marketplace.</p>
            <div className="sign-in-prompt-buttons">
              <button 
                className="cancel-button"
                onClick={() => setShowSignInPrompt(false)}
              >
                Cancel
              </button>
              <a 
                href={`${API_URL}/auth/steam`}
                className="sign-in-prompt-button"
              >
                <img 
                  src="Steam-Emblem.png" 
                  alt="Steam" 
                  className="steam-icon" 
                  width="24" 
                  height="24" 
                />
                Sign in with Steam
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add this CSS for the trades dropdown */}
      <style>
        {`
          .trades-dropdown-item {
            display: flex;
            align-items: center;
            padding: 12px 14px;
            gap: 12px;
          }
          
          .trades-dropdown-icon {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .trades-dropdown-badge {
            position: absolute;
            top: -4px;
            right: -6px;
            background-color: #f43f5e;
            color: white;
            font-size: 10px;
            font-weight: bold;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 2px #151C2B;
          }
          
          .trades-dropdown-content {
            display: flex;
            flex-direction: column;
            flex: 1;
          }
          
          .trades-dropdown-status {
            font-size: 11px;
            color: #10b981;
            margin-top: 2px;
            font-weight: 500;
            text-shadow: 0 0 5px rgba(16, 185, 129, 0.5);
            animation: glowPulse 2s infinite;
          }
          
          @keyframes glowPulse {
            0% { text-shadow: 0 0 5px rgba(16, 185, 129, 0.5); }
            50% { text-shadow: 0 0 10px rgba(16, 185, 129, 0.8); }
            100% { text-shadow: 0 0 5px rgba(16, 185, 129, 0.5); }
          }
        `}
      </style>
    </>
  );
};

export default Navbar; 

