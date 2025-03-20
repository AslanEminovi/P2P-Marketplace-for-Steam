import React from 'react';
// Import our mock implementation instead
import { useTranslation } from '../utils/languageUtils';
// This component isn't needed but to avoid breaking the app, let's keep it simple
// and just make it a non-functional but non-breaking component

const LanguageSwitcher = () => {
  // Only English option now, simplified version
  return (
    <div className="language-switcher">
      <button 
        className="active"
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;