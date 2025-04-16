import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../utils/languageUtils';

// Define rarity colors mapping
const RARITY_COLORS = {
  'Consumer Grade': '#b0c3d9',
  'Industrial Grade': '#5e98d9',
  'Mil-Spec Grade': '#4b69ff',
  'Restricted': '#8847ff',
  'Classified': '#d32ce6',
  'Covert': '#eb4b4b',
  '★': '#e4ae39',
  // Defaults for unknown types
  'default': '#b0c3d9'
};

// Define wear color mapping
const WEAR_COLORS = {
  'Factory New': '#4cd94c',
  'Minimal Wear': '#87d937',
  'Field-Tested': '#d9d937',
  'Well-Worn': '#d98037',
  'Battle-Scarred': '#d94040',
  // Default for unknown wear
  'default': '#94a3b8'
};

// Map of exterior abbreviations to full names
const EXTERIOR_FULL_NAMES = {
  'fn': 'Factory New',
  'mw': 'Minimal Wear',
  'ft': 'Field-Tested',
  'ww': 'Well-Worn',
  'bs': 'Battle-Scarred'
};

const ItemCard3D = ({ 
  item, 
  onClick, 
  className, 
  featured = false,
  highlight = false,
  showActions = true,
  style = {}
}) => {
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();
  
  if (!item) return null;
  
  // Get rarity color - fallback to default if not found
  const getRarityColor = (rarity) => {
    return RARITY_COLORS[rarity] || RARITY_COLORS.default;
  };
  
  // Get wear color - fallback to default if not found
  const getWearColor = (wear) => {
    return WEAR_COLORS[wear] || WEAR_COLORS.default;
  };
  
  // Extract weapon name without wear information
  const getItemBaseName = () => {
    if (!item.marketHashName) return 'Unknown Item';
    
    // Remove wear information from the name if present
    let name = item.marketHashName.replace(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i, '').trim();
    
    // Truncate long names
    if (name.length > 25) {
      name = name.substring(0, 22) + '...';
    }
    return name;
  };
  
  // Extract or identify wear from item data
  const getWearName = () => {
    // First check if exterior or wear is provided directly
    if (item.exterior) {
      // Convert potential abbreviations to full names
      return EXTERIOR_FULL_NAMES[item.exterior.toLowerCase()] || item.exterior;
    }
    
    if (item.wear) {
      // Convert potential abbreviations to full names
      return EXTERIOR_FULL_NAMES[item.wear.toLowerCase()] || item.wear;
    }
    
    // Then try to extract from market hash name
    if (item.marketHashName) {
      const wearMatch = item.marketHashName.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i);
      if (wearMatch) {
        return wearMatch[0];
      }
    }
    
    return null;
  };
  
  const wearName = getWearName();
  const rarityColor = getRarityColor(item.rarity);
  const itemBaseName = getItemBaseName();
  
  return (
    <motion.div
      className={`item-card-3d ${className || ''} ${highlight ? 'highlighted' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        boxShadow: `0 10px 30px ${rarityColor}33, 0 0 0 2px ${rarityColor}55`
      }}
      transition={{ 
        type: 'spring',
        damping: 20,
        stiffness: 300,
        duration: 0.4
      }}
      whileHover={{
        y: -8,
        boxShadow: `0 15px 30px ${rarityColor}55, 0 0 0 2px ${rarityColor}66`,
        scale: 1.02
      }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: 'relative',
        backgroundColor: `rgba(${parseInt(rarityColor.slice(1, 3), 16)}, ${parseInt(rarityColor.slice(3, 5), 16)}, ${parseInt(rarityColor.slice(5, 7), 16)}, 0.15)`,
        borderRadius: '16px',
        overflow: 'hidden',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        border: `1px solid ${rarityColor}33`,
        backdropFilter: 'blur(10px)',
        ...style
      }}
    >
      {/* Rarity pattern overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at top right, ${rarityColor}22, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
      
      {/* Background animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 0.5 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `linear-gradient(135deg, ${rarityColor}11 0%, ${rarityColor}22 100%)`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      
      {/* Item image container with 3D effect */}
      <motion.div
        style={{
          position: 'relative',
          padding: featured ? '30px' : '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          perspective: '1000px'
        }}
      >
        <motion.div
          animate={{
            rotateY: hovered ? 8 : 0,
            rotateX: hovered ? -8 : 0,
            z: hovered ? 20 : 0
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            width: '100%', 
            height: featured ? '180px' : '140px',
            position: 'relative',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Shadow underneath image */}
          <motion.div
            animate={{
              opacity: hovered ? 0.7 : 0.3,
              scale: hovered ? 0.85 : 0.9,
            }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              bottom: '-15%',
              left: '10%',
              right: '10%',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              filter: 'blur(8px)',
              zIndex: 1
            }}
          />
          
          {/* Actual item image */}
          <motion.img
            src={item.imageUrl}
            alt={item.marketHashName}
            animate={{
              y: hovered ? -10 : 0,
              scale: hovered ? 1.05 : 1,
              rotateY: hovered ? 5 : 0
            }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              transformStyle: 'preserve-3d',
              zIndex: 5
            }}
          />
          
          {/* Rarity border glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: hovered ? 0.8 : highlight ? 0.5 : 0,
              scale: hovered ? 1.1 : 1
            }}
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              right: '-10%',
              bottom: '-10%',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${rarityColor}33 0%, transparent 70%)`,
              zIndex: 2,
              filter: 'blur(10px)',
              pointerEvents: 'none'
            }}
          />
        </motion.div>
      </motion.div>
      
      {/* Item details */}
      <div
        style={{
          padding: featured ? '20px' : '15px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: '8px',
          position: 'relative',
          zIndex: 5,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {/* Item name with exterior in parentheses */}
        <h3
          style={{
            margin: 0,
            color: '#f1f1f1',
            fontSize: featured ? '1.1rem' : '0.95rem',
            fontWeight: '600',
            lineHeight: 1.3
          }}
        >
          {itemBaseName} {wearName && <span style={{ opacity: 0.75, fontWeight: '400' }}>({wearName})</span>}
        </h3>
        
        {/* Wear indicator with full name */}
        {wearName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: getWearColor(wearName)
              }}
            />
            <span
              style={{
                color: getWearColor(wearName),
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              {wearName}
            </span>
          </div>
        )}
        
        {/* Price details */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span
              style={{
                color: '#4ade80',
                fontWeight: 'bold',
                fontSize: featured ? '1.25rem' : '1.1rem'
              }}
            >
              ${item.price?.toFixed(2)}
            </span>
            
            {item.discount && (
              <motion.span
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotateZ: [0, -3, 0]
                }}
                transition={{ 
                  repeat: Infinity,
                  repeatDelay: 5,
                  duration: 0.5
                }}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  padding: '3px 6px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                  <polyline points="17 18 23 18 23 12"></polyline>
                </svg>
                {item.discount}%
              </motion.span>
            )}
          </div>
          
          {/* GEL price if available */}
          {item.priceGEL && (
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              ₾{parseFloat(item.priceGEL).toFixed(2)} GEL
            </span>
          )}
          
          {/* Seller info if provided */}
          {item.owner && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
                padding: '5px 0',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {item.owner.avatar ? (
                  <img
                    src={item.owner.avatar}
                    alt={item.owner.displayName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#4ade80',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.7rem'
                    }}
                  >
                    {item.owner.displayName?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.owner.displayName || t('common.unknownSeller')}
              </span>
              {item.owner.isOnline !== undefined && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: item.owner.isOnline ? '#4ade80' : '#94a3b8',
                    marginLeft: 'auto',
                    boxShadow: item.owner.isOnline ? '0 0 5px rgba(74, 222, 128, 0.5)' : 'none'
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Action button - only shown when hovered and showActions is true */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 10 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            bottom: '15px',
            left: '15px',
            right: '15px',
            padding: '10px 0',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '12px',
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10,
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)'
          }}
        >
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="view-item-button"
            onClick={(e) => {
              e.stopPropagation();
              onClick(item);
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 8px 16px rgba(124, 58, 237, 0.4)'
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
              transition: 'all 0.2s ease',
              border: 'none',
              outline: 'none',
              width: 'auto',
              margin: '0 auto'
            }}
          >
            View Item
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ItemCard3D;