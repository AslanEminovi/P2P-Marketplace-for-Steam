import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '../config/constants';
import NotificationCenter from './NotificationCenter';
import LanguageSwitcher from './LanguageSwitcher';
import { API_URL } from '../config/constants';

function Navbar({ user, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  
  // Handle scroll effects for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);
  
  // Reset mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  // Check if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={`glass ${isScrolled ? 'nav-scrolled' : ''}`} style={{
      padding: '1rem 2rem',
      transition: 'all 0.3s ease',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: isScrolled ? 'var(--shadow-lg)' : 'none',
    }}>
      <div className="container flex justify-between items-center" style={{ padding: 0 }}>
        {/* Logo */}
        <div className="flex items-center gap-md">
          <Link to="/" className="site-logo">
            <span className="gradient-text text-2xl font-bold">CS2 GEO</span>
          </Link>
          
          {/* Desktop navigation */}
          <div className="nav-links hidden md:flex items-center gap-md">
            <NavLink to="/" active={isActive('/')}>Home</NavLink>
            <NavLink to="/marketplace" active={isActive('/marketplace')}>Marketplace</NavLink>
            {user && (
              <>
                <NavLink to="/inventory" active={isActive('/inventory')}>Inventory</NavLink>
                <NavLink to="/my-listings" active={isActive('/my-listings')}>My Listings</NavLink>
                <NavLink to="/trades" active={isActive('/trades')}>Trades</NavLink>
              </>
            )}
          </div>
        </div>
        
        {/* Right side - user menu & actions */}
        <div className="flex items-center gap-md">
          {/* Social links */}
          <div className="social-links hidden md:flex">
            <a 
              href="https://discord.gg/your-discord-invite" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-link discord"
            >
              <i className="fab fa-discord"></i>
            </a>
            <a 
              href="https://facebook.com/your-facebook-page" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-link facebook"
            >
              <i className="fab fa-facebook"></i>
            </a>
          </div>
          
          {/* Language switcher */}
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          
          {/* User menu or login */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                className="user-menu-button flex items-center gap-sm"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
              >
                <div className="avatar">
                  <img 
                    src={user.avatar || '/default-avatar.png'} 
                    alt={user.displayName} 
                    className="avatar-image"
                  />
                  {/* Badge for balance */}
                  <div className="balance-badge">
                    {formatCurrency(user.walletBalance || 0, 'USD')}
                  </div>
                </div>
                <span className="username truncate">{user.displayName}</span>
                <svg className={`dropdown-arrow ${dropdownOpen ? 'rotate-180' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="user-dropdown-menu">
                  <Link to="/profile" className="dropdown-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Profile
                  </Link>
                  <Link to="/inventory" className="dropdown-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="8" y1="10" x2="16" y2="10"></line>
                      <line x1="8" y1="14" x2="16" y2="14"></line>
                      <line x1="8" y1="18" x2="12" y2="18"></line>
                    </svg>
                    Inventory
                  </Link>
                  <Link to="/my-listings" className="dropdown-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    My Listings
                  </Link>
                  <Link to="/steam-settings" className="dropdown-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Settings
                  </Link>
                  
                  <div className="dropdown-divider"></div>
                  
                  {user.isAdmin && (
                    <Link to="/admin/tools" className="dropdown-item admin">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                      </svg>
                      Admin Panel
                    </Link>
                  )}
                  
                  <button onClick={onLogout} className="dropdown-item logout">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a 
              href={`${API_URL}/auth/steam`} 
              className="btn btn-primary login-button flex items-center gap-sm"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" stroke="white" strokeWidth="2"/>
                <path d="M6 12L12 3L18 12L12 21L6 12Z" stroke="white" strokeWidth="2"/>
              </svg>
              Login with Steam
            </a>
          )}
          
          {/* Notification center */}
          {user && <NotificationCenter />}
          
          {/* Mobile menu button */}
          <button 
            className="mobile-menu-button md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12"></path>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu glass">
          <div className="mobile-menu-links">
            <Link to="/" className="mobile-menu-item">Home</Link>
            <Link to="/marketplace" className="mobile-menu-item">Marketplace</Link>
            {user && (
              <>
                <Link to="/inventory" className="mobile-menu-item">Inventory</Link>
                <Link to="/my-listings" className="mobile-menu-item">My Listings</Link>
                <Link to="/trades" className="mobile-menu-item">Trades</Link>
                <Link to="/profile" className="mobile-menu-item">Profile</Link>
                <Link to="/steam-settings" className="mobile-menu-item">Settings</Link>
                {user.isAdmin && (
                  <Link to="/admin/tools" className="mobile-menu-item">Admin Panel</Link>
                )}
                <button onClick={onLogout} className="mobile-menu-item logout">Logout</button>
              </>
            )}
            <div className="mobile-menu-item">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
      
      {/* Add the CSS styling directly here */}
      <style>{`
        /* NavBar styles */
        .nav-scrolled {
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
          background: rgba(22, 22, 34, 0.9);
        }
        
        /* NavLink component styles */
        .nav-link {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 500;
          letter-spacing: 0.02em;
          transition: all 0.2s ease;
          color: var(--color-text-secondary);
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
          font-size: 0.9rem;
        }
        
        .nav-link:hover {
          color: var(--color-text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 2px;
          background: var(--color-accent-primary);
          transition: all 0.3s ease;
          transform: translateX(-50%);
        }
        
        .nav-link:hover::after {
          width: 80%;
        }
        
        .nav-link.active {
          color: var(--color-text-primary);
          background: rgba(14, 230, 183, 0.1);
        }
        
        .nav-link.active::after {
          width: 80%;
          height: 2px;
          background: var(--gradient-primary);
        }
        
        /* User menu button */
        .user-menu-button {
          padding: 0.4rem 0.6rem;
          border-radius: 50px;
          background: rgba(30, 30, 48, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--color-text-primary);
          transition: all 0.2s ease;
        }
        
        .user-menu-button:hover {
          background: rgba(30, 30, 48, 0.8);
          box-shadow: 0 0 10px rgba(14, 230, 183, 0.2);
        }
        
        .avatar {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid var(--color-accent-primary);
        }
        
        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .username {
          max-width: 120px;
          font-weight: 500;
        }
        
        .dropdown-arrow {
          transition: transform 0.2s ease;
        }
        
        .rotate-180 {
          transform: rotate(180deg);
        }
        
        /* Balance badge */
        .balance-badge {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--color-bg-primary);
          color: var(--color-accent-primary);
          padding: 1px 6px;
          border-radius: 10px;
          font-size: 0.65rem;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--color-accent-primary);
        }
        
        /* Dropdown menu */
        .user-dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          min-width: 220px;
          z-index: 100;
          border-radius: 12px;
          overflow: hidden;
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          color: var(--color-text-secondary);
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }
        
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-primary);
          border-left-color: var(--color-accent-primary);
        }
        
        .dropdown-item.logout {
          color: #f87171;
        }
        
        .dropdown-item.logout:hover {
          background: rgba(248, 113, 113, 0.1);
          border-left-color: #f87171;
        }
        
        .dropdown-item.admin {
          color: var(--color-accent-primary);
        }
        
        .dropdown-item.admin:hover {
          background: rgba(14, 230, 183, 0.1);
        }
        
        .dropdown-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 8px 0;
        }
        
        /* Login button */
        .login-button {
          padding: 0.5rem 1.25rem;
          border-radius: 50px;
        }
        
        /* Mobile menu */
        .mobile-menu-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(30, 30, 48, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--color-text-primary);
          transition: all 0.2s ease;
        }
        
        .mobile-menu-button:hover {
          background: rgba(30, 30, 48, 0.8);
        }
        
        .mobile-menu {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 12px;
          animation: slideDown 0.3s ease;
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .mobile-menu-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .mobile-menu-item {
          padding: 12px 16px;
          border-radius: 8px;
          color: var(--color-text-secondary);
          transition: all 0.2s ease;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        
        .mobile-menu-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-primary);
        }
        
        .mobile-menu-item.logout {
          color: #f87171;
        }
        
        /* Media queries */
        @media (min-width: 768px) {
          .md\\:flex {
            display: flex;
          }
          
          .md\\:block {
            display: block;
          }
          
          .md\\:hidden {
            display: none;
          }
        }
        
        @media (max-width: 767px) {
          .hidden {
            display: none;
          }
        }
        
        /* Utility classes */
        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </nav>
  );
}

// NavLink component with active state
const NavLink = ({ to, children, active }) => {
  return (
    <Link 
      to={to} 
      className={`nav-link ${active ? 'active' : ''}`}
    >
      {children}
    </Link>
  );
};

export default Navbar; 