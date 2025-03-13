import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '../config/constants';
import NotificationCenter from './NotificationCenter';
import LanguageSwitcher from './LanguageSwitcher';
import { API_URL } from '../config/constants';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const profileBtnRef = useRef(null);
  const location = useLocation();
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // This effect handles clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event) {
      // Only process if dropdown is open
      if (!dropdownOpen) return;
      
      // Check if click was outside both the dropdown and the profile button
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    }
    
    // Add the event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      // Clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);
  
  // Toggle dropdown function
  const toggleDropdown = (e) => {
    e.stopPropagation();
    setDropdownOpen(!dropdownOpen);
  };
  
  // Close mobile menu when changing routes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            CS2 GEO
          </Link>
          
          <div className="navbar-links desktop-only">
            <Link to="/" className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}>
              Home
            </Link>
            <Link to="/marketplace" className={`navbar-link ${location.pathname === '/marketplace' ? 'active' : ''}`}>
              Marketplace
            </Link>
          </div>
        </div>
        
        <div className="navbar-right">
          <div className="social-links desktop-only">
            <a href="https://discord.gg/your-discord-invite" target="_blank" rel="noopener noreferrer" className="social-link">
              <i className="fab fa-discord"></i>
            </a>
            <a href="https://facebook.com/your-facebook-page" target="_blank" rel="noopener noreferrer" className="social-link">
              <i className="fab fa-facebook"></i>
            </a>
          </div>
          
          {user ? (
            <div className="user-section">
              <div className="balance-display desktop-only">
                <span className="balance-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8.5V7C2 5.89543 2.89543 5 4 5H20C21.1046 5 22 5.89543 22 7V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 12C16 11.4477 16.4477 11 17 11H22V13H17C16.4477 13 16 12.5523 16 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8" cy="12" r="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="balance-amount">{formatCurrency(user.walletBalance || 0)}</span>
                <Link to="/wallet" className="balance-add">+</Link>
              </div>
              
              <div className="user-profile-wrapper">
                <div 
                  className="user-profile" 
                  onClick={toggleDropdown}
                  ref={profileBtnRef}
                >
                  <div className="user-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name || 'User'} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <span className="dropdown-arrow">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
                
                {dropdownOpen && (
                  <div className="dropdown-menu" ref={dropdownRef}>
                    <div className="dropdown-header">
                      <span className="dropdown-username">{user.name || 'User'}</span>
                      <span className="dropdown-email">{user.email || ''}</span>
                    </div>
                    
                    <div className="dropdown-links">
                      <Link to="/profile" className="dropdown-link" onClick={() => setDropdownOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        My Profile
                      </Link>
                      
                      <Link to="/inventory" className="dropdown-link" onClick={() => setDropdownOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 16V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H19C20.1046 18 21 17.1046 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 14H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M11 14H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        My Inventory
                      </Link>
                      
                      <Link to="/trades" className="dropdown-link" onClick={() => setDropdownOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 17L10 11L4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        My Trades
                      </Link>
                      
                      <Link to="/wallet" className="dropdown-link" onClick={() => setDropdownOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 8.5V7C2 5.89543 2.89543 5 4 5H20C21.1046 5 22 5.89543 22 7V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M16 12C16 11.4477 16.4477 11 17 11H22V13H17C16.4477 13 16 12.5523 16 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="8" cy="12" r="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        My Wallet
                      </Link>
                      
                      <div className="dropdown-divider"></div>
                      
                      <button className="dropdown-link logout-button" onClick={() => {
                        setDropdownOpen(false);
                        onLogout();
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 8V6C14 5.46957 13.7893 4.96086 13.4142 4.58579C13.0391 4.21071 12.5304 4 12 4H5C4.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V18C3 18.5304 3.21071 19.0391 3.58579 19.4142C3.96086 19.7893 4.46957 20 5 20H12C12.5304 20 13.0391 19.7893 13.4142 19.4142C13.7893 19.0391 14 18.5304 14 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 12H21M21 12L18 9M21 12L18 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <a href={`${API_URL}/auth/steam`} className="sign-in-button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Sign in with Steam
            </a>
          )}
          
          <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="mobile-menu">
        <div className="mobile-menu-links">
          <Link to="/" className={`mobile-menu-link ${location.pathname === '/' ? 'active' : ''}`}>
            Home
          </Link>
          <Link to="/marketplace" className={`mobile-menu-link ${location.pathname === '/marketplace' ? 'active' : ''}`}>
            Marketplace
          </Link>
          
          {user && (
            <>
              <Link to="/profile" className="mobile-menu-link">
                My Profile
              </Link>
              <Link to="/inventory" className="mobile-menu-link">
                My Inventory
              </Link>
              <Link to="/trades" className="mobile-menu-link">
                My Trades
              </Link>
              <Link to="/wallet" className="mobile-menu-link">
                My Wallet ({formatCurrency(user.walletBalance || 0)})
              </Link>
              <button className="mobile-menu-link logout-button" onClick={onLogout}>
                Sign Out
              </button>
            </>
          )}
          
          {!user && (
            <a href={`${API_URL}/auth/steam`} className="mobile-menu-link steam-login">
              Sign in with Steam
            </a>
          )}
        </div>
        
        <div className="mobile-menu-social">
          <a href="https://discord.gg/your-discord-invite" target="_blank" rel="noopener noreferrer" className="mobile-social-link">
            <i className="fab fa-discord"></i> Discord
          </a>
          <a href="https://facebook.com/your-facebook-page" target="_blank" rel="noopener noreferrer" className="mobile-social-link">
            <i className="fab fa-facebook"></i> Facebook
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 