import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaStore, FaBoxOpen, FaExchangeAlt, FaQuestionCircle, FaShieldAlt, FaEnvelope, FaDiscord, FaSteam, FaTwitter, FaInstagram } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-wave">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path fill="#1a1a2e" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,202.7C672,203,768,181,864,181.3C960,181,1056,203,1152,208C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
      
      <div className="footer-container">
        <div className="footer-logo-section">
          <div className="footer-logo">
            <h2>CS2 Marketplace</h2>
            <p className="footer-tagline">The premier CS2 trading platform in Georgia</p>
          </div>
          <div className="footer-social">
            <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <FaDiscord />
            </a>
            <a href="https://steamcommunity.com" target="_blank" rel="noopener noreferrer" aria-label="Steam">
              <FaSteam />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <FaTwitter />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
          </div>
        </div>
        
        <div className="footer-content">
          <div className="footer-section about-section">
            <h3 className="footer-title">About Us</h3>
            <p className="footer-description">
              CS2 Marketplace is the leading platform for buying and selling Counter-Strike 2 items in Georgia with secure transactions and fair prices.
            </p>
            <div className="footer-contact-info">
              <p><FaEnvelope /> contact@cs2marketplace.com</p>
            </div>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Navigation</h3>
            <ul className="footer-links">
              <li><Link to="/"><FaHome /> Home</Link></li>
              <li><Link to="/marketplace"><FaStore /> Marketplace</Link></li>
              <li><Link to="/inventory"><FaBoxOpen /> Inventory</Link></li>
              <li><Link to="/trades"><FaExchangeAlt /> Trades</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Support</h3>
            <ul className="footer-links">
              <li><Link to="/contact"><FaEnvelope /> Contact Us</Link></li>
              <li><Link to="/faq"><FaQuestionCircle /> FAQ</Link></li>
              <li><Link to="/privacy-policy"><FaShieldAlt /> Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-newsletter">
          <h3>Stay Updated</h3>
          <p>Subscribe to our newsletter for updates on new features and promotions</p>
          <div className="newsletter-form">
            <input type="email" placeholder="Enter your email" />
            <button type="button">Subscribe</button>
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