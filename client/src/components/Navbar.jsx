import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { API_URL } from '../config/constants';
import './Navbar.css';

// Remove logo import since it's not needed
// import csLogo from '../assets/cs-logo.png';

// Navbar now receives user and onLogout as props
const Navbar = ({ user, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Refs for click outside detection
  const dropdownRef = useRef(null);
  const profileBtnRef = useRef(null);
  
  // Debug: Log user data for inspection
  useEffect(() => {
    console.log("Navbar received user data:", user);
    if (user) {
      console.log("User avatar:", user.avatar);
      console.log("User display name:", user.displayName);
    }
  }, [user]);
  
  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
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
    if (!user || !user.displayName) return '?';
    
    const names = user.displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    
    return names[0][0].toUpperCase();
  };
  
  // Format balance
  const formatBalance = (balance) => {
    if (!balance) return '0.00';
    
    return (balance / 100).toFixed(2);
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

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            {/* Display logo text, Georgian text, and social links next to each other */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="logo-text">CS2 Market</span>
              <span className="georgian-text">საქართველო</span>
              <div className="logo-social-links">
                <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" className="logo-social-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"></path>
                  </svg>
                </a>
                <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="logo-social-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </div>
            </div>
          </Link>
          
          <div className="navbar-links desktop-only">
            <NavLink to="/marketplace" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              Marketplace
            </NavLink>
            <NavLink to="/inventory" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="8" x2="8" y2="8"></line>
                <line x1="16" y1="12" x2="8" y2="12"></line>
                <line x1="16" y1="16" x2="8" y2="16"></line>
              </svg>
              Sell Items
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
            <div className="user-section">
              <div className="balance-display">
                <div className="balance-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
        </div>
                <span className="balance-amount">{formatBalance(user.balance)} ₾</span>
                <Link to="/add-funds" className="balance-add">+</Link>
      </div>

              <div className="dropdown-wrapper">
                <button 
                  ref={profileBtnRef}
                  onClick={toggleDropdown}
                  className="profile-button"
                >
                  <div className="user-avatar-container">
                    {user && (user.avatar || user.avatarUrl || user.avatarfull) ? (
                      <>
                        <img 
                          src={user.avatar || user.avatarUrl || user.avatarfull} 
                          alt={user.displayName || 'User'} 
                          onError={(e) => {
                            console.log("Avatar image failed to load:", e);
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = getUserInitials();
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      </>
                    ) : (
                      getUserInitials()
                    )}
                  </div>
                  <span className="desktop-only">{user.displayName}</span>
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
                      <span className="dropdown-username">{user.displayName}</span>
                      <span className="dropdown-email">{user.email || 'No email provided'}</span>
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
                      
                      <NavLink to="/trades" className="dropdown-menu-item" onClick={() => setDropdownOpen(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="17 1 21 5 17 9"></polyline>
                          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                          <polyline points="7 23 3 19 7 15"></polyline>
                          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                  </svg>
                        My Trades
                      </NavLink>
                      
                      <NavLink to="/settings" className="dropdown-menu-item" onClick={() => setDropdownOpen(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                        Settings
                      </NavLink>
                
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
          </div>
        ) : (
            <a href={`${API_URL}/auth/steam`} className="sign-in-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
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
            Sell Items
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Sign in with Steam
            </a>
          )}
        </div>
        
        <div className="mobile-menu-social">
          <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" className="mobile-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"></path>
            </svg>
          </a>
          <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="mobile-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 
