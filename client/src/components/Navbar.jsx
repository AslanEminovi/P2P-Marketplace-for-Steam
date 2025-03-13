import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config/constants';
import './Navbar.css';

// Remove logo import since it's not needed
// import csLogo from '../assets/cs-logo.png';

const Navbar = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Refs for click outside detection
  const dropdownRef = useRef(null);
  const profileBtnRef = useRef(null);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get token from localStorage if available
        const authToken = localStorage.getItem('auth_token');
        const config = {
          withCredentials: true,
          params: {}
        };
        
        // Include token in request if available
        if (authToken) {
          config.params.auth_token = authToken;
          console.log("Including auth token in request:", authToken.substring(0, 4) + "...");
        }
        
        // Make request with proper configuration
        const response = await axios.get(`${API_URL}/auth/me`, config);
        console.log("Auth response:", response.data);
        
        if (response.data && response.data.user) {
          console.log("Setting user data from /auth/me:", response.data.user);
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUser(null);
      }
    };
    
    checkAuth();
  }, []);
  
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
  
  // NEW IMPLEMENTATION: Handle click outside of dropdown with improved event capture
  useEffect(() => {
    function handleClickOutside(event) {
      // Check if dropdown is open before doing anything
      if (!dropdownOpen) return;
      
      // Don't close if clicking the profile button
      if (profileBtnRef.current && profileBtnRef.current.contains(event.target)) {
        console.log("Click on profile button - keeping dropdown open");
        return;
      }
      
      // Don't close if clicking inside the dropdown
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        console.log("Click inside dropdown - keeping dropdown open");
        return;
      }
      
      // Only close if clicking outside both the dropdown and the profile button
      console.log("Click detected outside dropdown - closing dropdown");
      setDropdownOpen(false);
    }
    
    // Use capture phase to ensure our handler runs before others
    document.addEventListener("mousedown", handleClickOutside, true);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [dropdownOpen]);
  
  // Close mobile menu when changing routes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);
  
  // Debug: Log user data for inspection
  useEffect(() => {
    console.log("Navbar received user data:", user);
    if (user) {
      console.log("User avatar:", user.avatar);
      console.log("User display name:", user.displayName);
    }
  }, [user]);
  
  // NEW IMPLEMENTATION: Separate dropdown component with better event handling
  const ProfileDropdown = () => {
    const navigate = useNavigate();
    
    // Don't render if dropdown isn't open
    if (!dropdownOpen) return null;
    
    console.log("Rendering dropdown menu, visible:", dropdownOpen);
    
    // Handler for navigation items - uses mouse events for better response
    const handleNavigate = (e, path) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Menu item clicked, will navigate to:", path);
      
      // Close dropdown and navigate with a slight delay to ensure event processing
      setTimeout(() => {
        setDropdownOpen(false);
        navigate(path);
      }, 100);
    };
    
    // Handle logout with better event handling
    const handleLogout = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Logout clicked");
      
      // Close dropdown and redirect with a slight delay to ensure event processing
      setTimeout(() => {
        setDropdownOpen(false);
        window.location.href = `${API_URL}/auth/logout`;
      }, 100);
    };
    
    return (
      <div 
        ref={dropdownRef}
        className="dropdown-container"
        // Capture and stop all events from bubbling
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '280px',
          backgroundColor: '#151C2B',
          border: '1px solid #3373F2',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          zIndex: 9999
        }}
      >
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(51, 115, 242, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{
            fontWeight: 600,
            color: '#FFFFFF',
            fontSize: '14px'
          }}>
            {user.displayName}
          </span>
          <span style={{
            fontSize: '12px',
            color: '#BBC7DB'
          }}>
            {user.email || 'No email provided'}
          </span>
        </div>
        
        <div style={{ padding: '8px' }}>
          {/* Profile Link - Now a button with onClick handler */}
          <a 
            href="/profile"
            onClick={(e) => handleNavigate(e, '/profile')}
            className="dropdown-menu-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              color: '#BBC7DB',
              textDecoration: 'none',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              marginBottom: '4px',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            My Profile
          </a>
          
          {/* Inventory Link - Now a button with onClick handler */}
          <a 
            href="/inventory"
            onClick={(e) => handleNavigate(e, '/inventory')}
            className="dropdown-menu-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              color: '#BBC7DB',
              textDecoration: 'none',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              marginBottom: '4px',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="8" x2="8" y2="8"></line>
              <line x1="16" y1="12" x2="8" y2="12"></line>
              <line x1="16" y1="16" x2="8" y2="16"></line>
            </svg>
            My Inventory
          </a>
          
          {/* Trades Link - Now a button with onClick handler */}
          <a 
            href="/trades"
            onClick={(e) => handleNavigate(e, '/trades')}
            className="dropdown-menu-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              color: '#BBC7DB',
              textDecoration: 'none',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              marginBottom: '4px',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            My Trades
          </a>
          
          {/* Settings Link - Now a button with onClick handler */}
          <a 
            href="/settings"
            onClick={(e) => handleNavigate(e, '/settings')}
            className="dropdown-menu-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              color: '#BBC7DB',
              textDecoration: 'none',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              marginBottom: '4px',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </a>
          
          <div style={{
            height: '1px',
            background: 'rgba(51, 115, 242, 0.3)',
            margin: '8px 0'
          }}></div>
          
          {/* Logout Button - Now an anchor with onClick handler */}
          <a 
            href="#logout"
            onClick={handleLogout}
            className="dropdown-menu-link logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              color: '#BBC7DB',
              textDecoration: 'none',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log Out
          </a>
        </div>
      </div>
    );
  };
  
  // Improved toggle function with better event handling
  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("BEFORE toggle - dropdown state:", dropdownOpen);
    setDropdownOpen(!dropdownOpen);
    console.log("AFTER toggle - dropdown state will be:", !dropdownOpen);
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
  
  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            {/* Replace image with text-only logo */}
            <span className="logo-text">CS2 Market</span>
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
            {/* Change "Sell Items" to link to inventory */}
            <NavLink to="/inventory" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="8" x2="8" y2="8"></line>
                <line x1="16" y1="12" x2="8" y2="12"></line>
                <line x1="16" y1="16" x2="8" y2="16"></line>
              </svg>
              Sell Items
            </NavLink>
            <NavLink to="/blog" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                <path d="M2 2l7.586 7.586"></path>
                <circle cx="11" cy="11" r="2"></circle>
              </svg>
              Blog
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
          <div className="social-links desktop-only">
            <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" className="social-link">
              <i className="fab fa-discord"></i>
            </a>
            <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="social-link">
              <i className="fab fa-facebook"></i>
            </a>
          </div>
          
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
              
              <div style={{ position: 'relative' }}>
                <button 
                  ref={profileBtnRef}
                  onClick={toggleDropdown}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="profile-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    color: '#FFFFFF'
                  }}
                >
                  <div className="user-avatar-container" style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#3373F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: '#0A0E17',
                    overflow: 'hidden'
                  }}>
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
                  <div className={`dropdown-arrow ${dropdownOpen ? 'active' : ''}`} style={{
                    display: 'flex',
                    alignItems: 'center'
                  }}>
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
                
                {/* Render the dropdown if it's open */}
                {dropdownOpen && <ProfileDropdown />}
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
        
          <NavLink to="/blog" className={({ isActive }) => 
            isActive ? 'mobile-menu-link active' : 'mobile-menu-link'
          }>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
            Blog
          </NavLink>
          
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
            <i className="fab fa-discord"></i>
          </a>
          <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="mobile-social-link">
            <i className="fab fa-facebook"></i>
          </a>
          <a href="https://reddit.com/" target="_blank" rel="noopener noreferrer" className="mobile-social-link">
            <i className="fab fa-reddit"></i>
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 
