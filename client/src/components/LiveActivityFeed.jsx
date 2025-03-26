import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import socketService from '../services/socketService';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const LiveActivityFeed = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const feedRef = useRef(null);

  useEffect(() => {
    const handleUserActivity = (activity) => {
      setActivities(prev => [activity, ...prev].slice(0, 50));
    };

    const handleMarketActivity = (activity) => {
      setActivities(prev => [activity, ...prev].slice(0, 50));
    };

    socketService.on('user_activity', handleUserActivity);
    socketService.on('market_activity', handleMarketActivity);

    return () => {
      socketService.off('user_activity', handleUserActivity);
      socketService.off('market_activity', handleMarketActivity);
    };
  }, []);

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
    setShowSidePanel(true);
  };

  const handleCloseSidePanel = () => {
    setShowSidePanel(false);
    setSelectedActivity(null);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'join':
        return '👋';
      case 'logout':
        return '👋';
      case 'listing':
        return '📝';
      case 'purchase':
        return '💰';
      case 'offer':
        return '🤝';
      default:
        return '📢';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'join':
        return 'text-green-400';
      case 'logout':
        return 'text-red-400';
      case 'listing':
        return 'text-blue-400';
      case 'purchase':
        return 'text-purple-400';
      case 'offer':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <>
      <div className="live-activity-feed" ref={feedRef}>
        <div className="activity-header" onClick={() => setIsOpen(!isOpen)}>
          <h3>{t('home.featured.liveActivity')}</h3>
          <button className="activity-toggle">
            {isOpen ? '▼' : '▲'}
          </button>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="activity-list"
            >
              {activities.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="activity-item"
                  onClick={() => handleActivityClick(activity)}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-xl ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </span>
                    <div>
                      <p className="text-white">{activity.message || activity.action}</p>
                      <span className="activity-time">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showSidePanel && selectedActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleCloseSidePanel}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 h-full w-96 bg-gray-900 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">
                  {t('home.featured.activityDetails')}
                </h3>
                <button
                  onClick={handleCloseSidePanel}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-2xl ${getActivityColor(selectedActivity.type)}`}>
                    {getActivityIcon(selectedActivity.type)}
                  </span>
                  <h4 className="text-lg font-medium text-white">
                    {selectedActivity.type.charAt(0).toUpperCase() + selectedActivity.type.slice(1)}
                  </h4>
                </div>
                <p className="text-gray-300 mb-4">{selectedActivity.message || selectedActivity.action}</p>
                <div className="text-sm text-gray-400">
                  {formatDistanceToNow(new Date(selectedActivity.timestamp), { addSuffix: true })}
                </div>
                {selectedActivity.item && (
                  <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                    <h5 className="text-white font-medium mb-2">Item Details</h5>
                    <p className="text-gray-300">{selectedActivity.item.marketHashName}</p>
                    {selectedActivity.item.price && (
                      <p className="text-green-400 mt-1">${selectedActivity.item.price}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveActivityFeed; 