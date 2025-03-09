import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '../config/constants';
import NotificationCenter from './NotificationCenter';
import LanguageSwitcher from './LanguageSwitcher';
import { API_URL } from '../config/constants';

function Navbar({ user, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  
  // Add scroll event listener
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

  const navbarStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: scrolled ? 'rgba(18, 18, 18, 0.95)' : 'transparent',
    backdropFilter: scrolled ? 'blur(10px)' : 'none',
    color: 'white',
    boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 1000,
    transition: 'all 0.3s ease'
  };

  const logoStyles = {
    fontSize: '1.75rem', 
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 50%, #3f51b5 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textDecoration: 'none',
    marginRight: '1rem'
  };

  const navLinkStyles = {
    color: '#e2e8f0', 
    textDecoration: 'none',
    transition: 'all 0.2s',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.1)'
  };

  const navLinkHoverStyles = {
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(106, 13, 173, 0.3)'
  };

  const adminButtonStyles = {
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    backgroundColor: '#6a0dad',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    border: '1px solid #8e24aa',
    boxShadow: '0 0 15px rgba(106, 13, 173, 0.6)',
    transition: 'all 0.2s ease-in-out'
  };

  const adminButtonHoverStyles = {
    backgroundColor: '#8e24aa',
    boxShadow: '0 0 20px rgba(138, 43, 226, 0.8)',
    transform: 'translateY(-2px)'
  };

  const userProfileStyles = {
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem',
    padding: '0.5rem',
    borderRadius: '8px',
    transition: 'all 0.2s',
    backgroundColor: 'rgba(255,255,255,0.1)',
    userSelect: 'none'
  };

  const userProfileHoverStyles = {
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: 'translateY(-2px)'
  };

  const dropdownStyles = {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(138, 43, 226, 0.4)',
    borderRadius: '12px',
    padding: '0.5rem',
    marginTop: '0.5rem',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    zIndex: 1000,
    minWidth: '200px'
  };

  const dropdownLinkStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1.5rem', 
    color: '#e2e8f0',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    borderRadius: '8px'
  };

  const dropdownLinkHoverStyles = {
    backgroundColor: '#6a0dad',
    transform: 'translateX(4px)'
  };

  return (
    <nav style={navbarStyles} className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link 
            to="/"
            style={logoStyles}
          >
            CS2 GEO
          </Link>
          <div className="social-links">
            <a 
              href="https://discord.gg/your-discord-invite" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-link discord"
              style={{ color: '#e2e8f0', marginRight: '1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <i className="fab fa-discord" style={{ fontSize: '1.5rem' }}></i>
              <span>Discord</span>
            </a>
            <a 
              href="https://facebook.com/your-facebook-page" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-link facebook"
              style={{ color: '#e2e8f0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <i className="fab fa-facebook" style={{ fontSize: '1.5rem' }}></i>
              <span>Facebook</span>
            </a>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link 
            to="/" 
            style={navLinkStyles} 
            onMouseEnter={(e) => {
              Object.assign(e.target.style, navLinkHoverStyles);
            }} 
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Home
          </Link>
          <Link 
            to="/marketplace" 
            style={navLinkStyles}
            onMouseEnter={(e) => {
              Object.assign(e.target.style, navLinkHoverStyles);
            }} 
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Marketplace
          </Link>
        </div>
      </div>

      <div style={{ position: 'relative' }} ref={dropdownRef}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <LanguageSwitcher />
            
            <NotificationCenter user={user} />
            
            {/* Admin Button - Only visible for admin users */}
            {user.isAdmin && (
              <Link
                to="/admin/tools"
                onClick={() => {
                  console.log("Admin button clicked");
                  console.log("User isAdmin:", user.isAdmin);
                }}
                style={adminButtonStyles}
                onMouseEnter={(e) => {
                  Object.assign(e.target.style, adminButtonHoverStyles);
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#6a0dad';
                  e.target.style.boxShadow = '0 0 15px rgba(106, 13, 173, 0.6)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Admin
              </Link>
            )}
            
            <div 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={userProfileStyles}
              onMouseEnter={(e) => {
                Object.assign(e.target.style, userProfileHoverStyles);
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <img 
                src={user.avatar} 
                alt={user.displayName}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #8e24aa' }}
              />
              <span style={{ color: '#e2e8f0' }}>{user.displayName}</span>
            </div>
            {dropdownOpen && (
              <div style={dropdownStyles}>
                <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>{user.displayName}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        <span style={{ color: '#8e24aa' }}>
                          Balance: {formatCurrency(user.walletBalance || 0, 'USD')}
                        </span>
                        <span style={{ color: '#94a3b8' }}>
                          {formatCurrency(user.walletBalanceGEL || 0, 'GEL')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Link 
                  to="/inventory" 
                  style={dropdownLinkStyles}
                  onClick={() => setDropdownOpen(false)}
                  onMouseEnter={(e) => {
                    Object.assign(e.target.style, dropdownLinkHoverStyles);
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.transform = 'translateX(0)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 16V8.00002C20.9996 7.6493 20.9071 7.30483 20.7315 7.00119C20.556 6.69754 20.3037 6.44539 20 6.27002L13 2.27002C12.696 2.09449 12.3511 2.00208 12 2.00208C11.6489 2.00208 11.304 2.09449 11 2.27002L4 6.27002C3.69626 6.44539 3.44398 6.69754 3.26846 7.00119C3.09294 7.30483 3.00036 7.6493 3 8.00002V16C3.00036 16.3508 3.09294 16.6952 3.26846 16.9989C3.44398 17.3025 3.69626 17.5547 4 17.73L11 21.73C11.304 21.9056 11.6489 21.998 12 21.998C12.3511 21.998 12.696 21.9056 13 21.73L20 17.73C20.3037 17.5547 20.556 17.3025 20.7315 16.9989C20.9071 16.6952 20.9996 16.3508 21 16Z" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7.5 4.21002L12 6.81002L16.5 4.21002" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7.5 19.79V14.6L3 12" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12L16.5 14.6V19.79" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.27002 6.96002L12 12.01L20.73 6.96002" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 22.08V12" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  My Inventory
                </Link>
                
                <Link 
                  to="/my-listings" 
                  style={dropdownLinkStyles}
                  onClick={() => setDropdownOpen(false)}
                  onMouseEnter={(e) => {
                    Object.assign(e.target.style, dropdownLinkHoverStyles);
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.transform = 'translateX(0)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 10.5098H15" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 7.5V13.5" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  My Listings
                </Link>

                <Link
                  to="/profile"
                  style={dropdownLinkStyles}
                  onClick={() => setDropdownOpen(false)}
                  onMouseEnter={(e) => {
                    Object.assign(e.target.style, dropdownLinkHoverStyles);
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.transform = 'translateX(0)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  My Profile
                </Link>

                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    onLogout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1.5rem',
                    color: '#e2e8f0',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#6a0dad';
                    e.target.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.transform = 'translateX(0)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 8V6C14 5.46957 13.7893 4.96086 13.4142 4.58579C13.0391 4.21071 12.5304 4 12 4H5C4.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V18C3 18.5304 3.21071 19.0391 3.58579 19.4142C3.96086 19.7893 4.46957 20 5 20H12C12.5304 20 13.0391 19.7893 13.4142 19.4142C13.7893 19.0391 14 18.5304 14 18V16" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 12H21M21 12L18 9M21 12L18 15" stroke="#8e24aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <a 
            href={`${API_URL}/auth/steam`} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 50%, #3f51b5 100%)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(106, 13, 173, 0.3)',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(106, 13, 173, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(106, 13, 173, 0.3)';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Sign in with Steam
          </a>
        )}
      </div>
    </nav>
  );
}

export default Navbar; 