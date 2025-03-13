import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          CS2 Market
        </Link>

        <div className="navbar-links">
          <Link
            to="/"
            className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link
            to="/marketplace"
            className={`navbar-link ${location.pathname === '/marketplace' ? 'active' : ''}`}
          >
            Marketplace
          </Link>
          {user && (
            <Link
              to="/inventory"
              className={`navbar-link ${location.pathname === '/inventory' ? 'active' : ''}`}
            >
              Inventory
            </Link>
          )}
          {user && (
            <Link
              to="/trades"
              className={`navbar-link ${location.pathname === '/trades' ? 'active' : ''}`}
            >
              Trades
            </Link>
          )}
          <Link
            to="/help"
            className={`navbar-link ${location.pathname === '/help' ? 'active' : ''}`}
          >
            Help
          </Link>
        </div>

        <div className="navbar-auth">
          {user ? (
            <div className="user-menu" ref={menuRef}>
              <button
                className="user-menu-button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <img
                  src={user.avatarUrl || '/default-avatar.png'}
                  alt={user.displayName}
                  className="user-avatar"
                />
                <span>{user.displayName}</span>
              </button>

              {isUserMenuOpen && (
                <div className="user-menu-dropdown">
                  <Link to="/profile" className="user-menu-item">
                    Profile
                  </Link>
                  <Link to="/inventory" className="user-menu-item">
                    Inventory
                  </Link>
                  <Link to="/trades" className="user-menu-item">
                    Trades
                  </Link>
                  <div className="user-menu-divider" />
                  <button onClick={handleLogout} className="user-menu-item">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-button">
              Sign in with Steam
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 