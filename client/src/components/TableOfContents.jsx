import React, { useState, useEffect } from 'react';
import './TableOfContents.css';

/**
 * A reusable table of contents component that follows scroll and highlights active sections
 * 
 * @param {Object} props
 * @param {Array} props.items - Array of items with { id, title, icon } structure
 * @param {number} props.offset - Offset for active section detection (default: 100)
 * @param {Function} props.onItemClick - Optional callback for when an item is clicked 
 */
const TableOfContents = ({ items, offset = 100, onItemClick }) => {
  const [activeSection, setActiveSection] = useState(items[0]?.id || '');
  
  // Track scroll position to update active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset;
      
      // Find the section that is currently in view
      const sections = items.map(item => document.getElementById(item.id)).filter(Boolean);
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        // If we've scrolled past the top of the section, it's the active one
        if (section.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Call once to set initial active section
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [items, offset]);

  // Scroll to the section when an item is clicked
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - offset + 10,
        behavior: 'smooth'
      });
      setActiveSection(id);
      
      if (onItemClick) {
        onItemClick(id);
      }
    }
  };

  return (
    <div className="toc-container">
      <h2 className="toc-title">Table of Contents</h2>
      <ul className="toc-list">
        {items.map((item) => (
          <li 
            key={item.id}
            className={`toc-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => scrollToSection(item.id)}
          >
            {item.icon && <span className="toc-icon">{item.icon}</span>}
            <span className="toc-text">{item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TableOfContents; 