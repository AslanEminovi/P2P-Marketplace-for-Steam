import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">{t('footer.about')}</h3>
            <p className="footer-description">
              {t('footer.aboutDescription')}
            </p>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">{t('footer.links')}</h3>
            <ul className="footer-links">
              <li><Link to="/marketplace">{t('footer.marketplace')}</Link></li>
              <li><Link to="/inventory">{t('footer.inventory')}</Link></li>
              <li><Link to="/trades">{t('footer.trades')}</Link></li>
              <li><Link to="/faq">{t('footer.faq')}</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">{t('footer.support')}</h3>
            <ul className="footer-links">
              <li><Link to="/contact">{t('footer.contact')}</Link></li>
              <li><Link to="/terms">{t('footer.terms')}</Link></li>
              <li><Link to="/privacy">{t('footer.privacy')}</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-copyright">
            &copy; {currentYear} CS2 Marketplace Georgia. {t('footer.allRightsReserved')}
          </div>
          <div className="footer-disclaimer">
            {t('footer.disclaimer')}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 