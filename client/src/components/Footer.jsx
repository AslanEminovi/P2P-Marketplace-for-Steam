import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">About Us</h3>
            <p className="footer-description">
              CS2 Marketplace is the leading platform for buying and selling Counter-Strike 2 items in Georgia with secure transactions and fair prices.
            </p>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/marketplace">Marketplace</Link></li>
              <li><Link to="/inventory">Inventory</Link></li>
              <li><Link to="/trades">Trades</Link></li>
              <li><Link to="/">Home</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Support</h3>
            <ul className="footer-links">
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-copyright">
            &copy; {currentYear} CS2 Marketplace Georgia. All rights reserved.
          </div>
          <div className="footer-disclaimer">
            This site is not affiliated with Valve Corporation. All game assets belong to their respective owners.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 