import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  
  // Handle scroll to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <span className="logo-text">CS2 <span className="logo-highlight">Market</span></span>
        </Link>
        
        {/* Main Navigation Links - Desktop */}
        <div className="main-nav">
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            <i className="fas fa-home"></i>
            <span>Home</span>
          </Link>
          
          <Link to="/marketplace" className={`nav-item ${location.pathname === '/marketplace' ? 'active' : ''}`}>
            <i className="fas fa-shopping-cart"></i>
            <span>Marketplace</span>
          </Link>
          
          <Link to="/inventory" className={`nav-item ${location.pathname === '/inventory' ? 'active' : ''}`}>
            <i className="fas fa-box-open"></i>
            <span>Inventory</span>
          </Link>
          
          <Link to="/trades" className={`nav-item ${location.pathname === '/trades' ? 'active' : ''}`}>
            <i className="fas fa-exchange-alt"></i>
            <span>Trades</span>
          </Link>
          
          <div className="nav-divider"></div>
          
          <Link to="/help" className={`nav-item ${location.pathname === '/help' ? 'active' : ''}`}>
            <i className="fas fa-question-circle"></i>
            <span>Help</span>
          </Link>
        </div>
        
        {/* User Actions & Mobile Menu Button */}
        <div className="nav-actions">
          {user ? (
            <div className="user-dropdown-container" ref={dropdownRef}>
              <button 
                className="user-dropdown-button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <img 
                  src={user.avatar || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'} 
                  alt={user.displayName || 'User'} 
                  className="user-avatar"
                />
                <span className="user-name">{user.displayName || 'User'}</span>
                <i className={`fas fa-chevron-down ${isUserDropdownOpen ? 'open' : ''}`}></i>
              </button>
              
              {isUserDropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <img 
                      src={user.avatar || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'} 
                      alt={user.displayName} 
                      className="dropdown-avatar"
                    />
                    <div className="dropdown-user-info">
                      <span className="dropdown-username">{user.displayName}</span>
                      <span className="dropdown-balance">Balance: 0 ₾</span>
                    </div>
                  </div>
                  
                  <div className="dropdown-links">
                    <Link to="/profile" className="dropdown-item">
                      <i className="fas fa-user"></i>
                      <span>My Profile</span>
                    </Link>
                    <Link to="/inventory" className="dropdown-item">
                      <i className="fas fa-box-open"></i>
                      <span>My Inventory</span>
                    </Link>
                    <Link to="/trades" className="dropdown-item">
                      <i className="fas fa-exchange-alt"></i>
                      <span>My Trades</span>
                    </Link>
                    <Link to="/settings" className="dropdown-item">
                      <i className="fas fa-cog"></i>
                      <span>Settings</span>
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item logout">
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-button">
              <i className="fab fa-steam"></i>
              <span>Sign in</span>
            </Link>
          )}
          
          <button 
            className={`mobile-menu-toggle ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      <div 
        className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}
        ref={mobileMenuRef}
      >
        <div className="mobile-menu-container">
          <Link to="/" className="mobile-nav-item">
            <i className="fas fa-home"></i>
            <span>Home</span>
          </Link>
          
          <Link to="/marketplace" className="mobile-nav-item">
            <i className="fas fa-shopping-cart"></i>
            <span>Marketplace</span>
          </Link>
          
          <Link to="/inventory" className="mobile-nav-item">
            <i className="fas fa-box-open"></i>
            <span>Inventory</span>
          </Link>
          
          <Link to="/trades" className="mobile-nav-item">
            <i className="fas fa-exchange-alt"></i>
            <span>Trades</span>
          </Link>
          
          <Link to="/help" className="mobile-nav-item">
            <i className="fas fa-question-circle"></i>
            <span>Help</span>
          </Link>
          
          {!user && (
            <Link to="/login" className="mobile-nav-item login">
              <i className="fab fa-steam"></i>
              <span>Sign in with Steam</span>
            </Link>
          )}
        </div>
      </div>
      
      {/* Optional: Notification panel that slides in */}
      <div className="notification-indicator">
        <button className="notification-button">
          <i className="fas fa-bell"></i>
          <span className="notification-count">3</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 