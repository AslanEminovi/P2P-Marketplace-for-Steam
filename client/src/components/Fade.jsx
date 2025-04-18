import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * Fade component for animated transitions
 * Use this for smooth transitions when showing/hiding elements
 */
const Fade = ({ 
  show = true, 
  children, 
  duration = 0.3,
  delay = 0,
  className = '',
  direction = null // 'up', 'down', 'left', 'right' or null for fade only
}) => {
  // Determine the animation variants based on direction
  const getVariants = () => {
    const baseVariants = {
      hidden: {
        opacity: 0,
        transition: {
          duration,
          delay: 0,
        }
      },
      visible: {
        opacity: 1,
        transition: {
          duration,
          delay,
        }
      }
    };

    // Add direction-based transforms if specified
    if (direction === 'up') {
      baseVariants.hidden.y = 20;
      baseVariants.visible.y = 0;
    } else if (direction === 'down') {
      baseVariants.hidden.y = -20;
      baseVariants.visible.y = 0;
    } else if (direction === 'left') {
      baseVariants.hidden.x = 20;
      baseVariants.visible.x = 0;
    } else if (direction === 'right') {
      baseVariants.hidden.x = -20;
      baseVariants.visible.x = 0;
    }

    return baseVariants;
  };

  const variants = getVariants();

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          className={className}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={variants}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

Fade.propTypes = {
  show: PropTypes.bool,
  children: PropTypes.node.isRequired,
  duration: PropTypes.number,
  delay: PropTypes.number,
  className: PropTypes.string,
  direction: PropTypes.oneOf([null, 'up', 'down', 'left', 'right'])
};

export default Fade; 