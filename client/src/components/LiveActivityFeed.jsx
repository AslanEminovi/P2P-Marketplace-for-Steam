import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronUp, 
  faChevronDown, 
  faTimes, 
  faShoppingCart, 
  faTag, 
  faUser, 
  faExchangeAlt, 
  faBell
} from '@fortawesome/free-solid-svg-icons';
import socketService from '../services/socketService';
import './LiveActivityFeed.css';

const LiveActivityFeed = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newEventsCount, setNewEventsCount] = useState(0);
  const activitiesRef = useRef(null);
  const maxActivities = 50;

  useEffect(() => {
    // Listen for market updates
    socketService.on('market_update', (data) => {
      addActivity({
        type: data.type || 'listing',
        itemName: data.itemName,
        price: data.price,
        user: data.user,
        timestamp: new Date().toISOString()
      });
    });

    // Listen for user activities
    socketService.on('user_activity', (data) => {
      addActivity({
        type: 'user_activity',
        action: data.action,
        user: data.user,
        timestamp: new Date().toISOString()
      });
    });

    // DEV ONLY: Simulate initial activities for testing
    if (process.env.NODE_ENV === 'development') {
      simulateInitialActivities();
      
      // Simulate periodic updates
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          simulateNewActivity();
        }
      }, 15000);
      
      return () => clearInterval(interval);
    }

    return () => {
      socketService.off('market_update');
      socketService.off('user_activity');
    };
  }, []);

  // Scroll to bottom when new activities are added and feed is open
  useEffect(() => {
    if (isOpen && activitiesRef.current) {
      activitiesRef.current.scrollTop = activitiesRef.current.scrollHeight;
    }
    
    if (!isOpen && activities.length > 0) {
      setNewEventsCount(prev => prev + 1);
    }
  }, [activities, isOpen]);

  const addActivity = (activity) => {
    setActivities(prev => {
      const newActivities = [activity, ...prev].slice(0, maxActivities);
      return newActivities;
    });
  };

  const toggleFeed = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setNewEventsCount(0);
    }
  };

  const formatActivityMessage = (activity) => {
    switch (activity.type) {
      case 'listing':
        return t('activity.new_listing', {
          user: activity.user || 'Anonymous',
          item: activity.itemName || 'an item',
          price: formatPrice(activity.price)
        });
      case 'sale':
        return t('activity.item_sold', {
          item: activity.itemName || 'an item',
          price: formatPrice(activity.price)
        });
      case 'user_activity':
        switch (activity.action) {
          case 'join':
            return t('activity.user_joined', {
              user: activity.user || 'Anonymous'
            });
          case 'logout':
            return t('activity.user_left', {
              user: activity.user || 'Anonymous'
            });
          default:
            return t('activity.user_action', {
              user: activity.user || 'Anonymous',
              action: activity.action
            });
        }
      default:
        return t('activity.generic', {
          type: activity.type
        });
    }
  };

  const formatPrice = (price) => {
    if (!price) return '';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) {
      return t('time.just_now');
    } else if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return t('time.minutes_ago', { mins });
    } else if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return t('time.hours_ago', { hours });
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
             ' ' + date.toLocaleDateString();
    }
  };

  const getActivityIcon = (activity) => {
    switch (activity.type) {
      case 'listing':
        return faTag;
      case 'sale':
        return faShoppingCart;
      case 'user_activity':
        return faUser;
      case 'trade':
        return faExchangeAlt;
      default:
        return faBell;
    }
  };

  const getActivityColor = (activity) => {
    switch (activity.type) {
      case 'listing':
        return '#4ade80'; // green
      case 'sale':
        return '#f97316'; // orange
      case 'user_activity':
        return '#60a5fa'; // blue
      case 'trade':
        return '#a78bfa'; // purple
      default:
        return '#f8fafc'; // light
    }
  };

  // DEV ONLY: Simulate initial activities for testing
  const simulateInitialActivities = () => {
    const initialActivities = [
      {
        type: 'listing',
        itemName: 'AWP | Dragon Lore (Factory New)',
        price: 1800.50,
        user: 'DragonHunter',
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString()
      },
      {
        type: 'sale',
        itemName: 'AK-47 | Redline (Field-Tested)',
        price: 45.75,
        user: 'RedlineSniper',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      },
      {
        type: 'user_activity',
        action: 'join',
        user: 'CS2Enthusiast',
        timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString()
      },
      {
        type: 'listing',
        itemName: 'M4A4 | Howl (Minimal Wear)',
        price: 950.25,
        user: 'HowlMaster',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      }
    ];
    
    setActivities(initialActivities);
  };

  // DEV ONLY: Simulate a new activity for testing
  const simulateNewActivity = () => {
    const activityTypes = ['listing', 'sale', 'user_activity', 'trade'];
    const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    
    const items = [
      'AWP | Asiimov (Field-Tested)',
      'Butterfly Knife | Fade (Factory New)',
      'Glock-18 | Fade (Factory New)',
      'M9 Bayonet | Crimson Web (Minimal Wear)',
      'AK-47 | Fire Serpent (Field-Tested)'
    ];
    
    const users = [
      'SkinCollector',
      'CS2Pro',
      'MarketGuru',
      'TradeExpert',
      'AWPMaster'
    ];
    
    const userActions = ['join', 'logout', 'update_profile'];
    
    let activity = {
      timestamp: new Date().toISOString()
    };
    
    switch (type) {
      case 'listing':
      case 'sale':
        activity = {
          ...activity,
          type,
          itemName: items[Math.floor(Math.random() * items.length)],
          price: Math.floor(Math.random() * 1000) + 10 + Math.random(),
          user: users[Math.floor(Math.random() * users.length)]
        };
        break;
      case 'user_activity':
        activity = {
          ...activity,
          type,
          action: userActions[Math.floor(Math.random() * userActions.length)],
          user: users[Math.floor(Math.random() * users.length)]
        };
        break;
      case 'trade':
        activity = {
          ...activity,
          type,
          itemName: items[Math.floor(Math.random() * items.length)],
          targetItem: items[Math.floor(Math.random() * items.length)],
          user: users[Math.floor(Math.random() * users.length)]
        };
        break;
    }
    
    addActivity(activity);
  };

  return (
    <div className={`live-activity-feed ${isOpen ? 'open' : 'minimized'}`}>
      <div className="live-activity-header" onClick={toggleFeed}>
        <div className="live-activity-title">
          <div className="pulse-dot"></div>
          {t('activity.live_activity')}
          {newEventsCount > 0 && (
            <div className="new-events-badge">
              {newEventsCount > 99 ? '99+' : newEventsCount}
            </div>
          )}
        </div>
        <div className="live-activity-controls">
          <button className="toggle-button">
            <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronUp} />
          </button>
        </div>
      </div>
      
      <div className="live-activity-content" ref={activitiesRef}>
        {activities.length === 0 ? (
          <div className="no-activities">{t('activity.no_activities')}</div>
        ) : (
          <div className="activities-list">
            {activities.map((activity, index) => (
              <div className="activity-item" key={index} style={{ borderLeftColor: getActivityColor(activity) }}>
                <div className="activity-icon" style={{ color: getActivityColor(activity) }}>
                  <FontAwesomeIcon icon={getActivityIcon(activity)} />
                </div>
                <div className="activity-details">
                  <div className="activity-text">{formatActivityMessage(activity)}</div>
                  <div className="activity-time">{formatTimestamp(activity.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed; 