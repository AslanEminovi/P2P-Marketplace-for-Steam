import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import TradeTrackingPanel from './TradeTrackingPanel';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';

/**
 * TradeTrackingPanelManager - Manages real-time trade tracking panels
 * This component maintains the state of active trade tracking panels and handles
 * real-time updates via socket connections
 */
const TradeTrackingPanelManager = () => {
  const user = useSelector(state => state.auth.user);
  
  // Local state for active trade panels
  const [activePanels, setActivePanels] = useState([]);
  
  // Handle opening a new trade panel
  const handleOpenTradePanel = (tradeId, role = 'buyer') => {
    // Check if the panel is already open
    const existingPanel = activePanels.find(panel => panel.tradeId === tradeId);
    
    if (existingPanel) {
      // Just make sure it's open if it already exists
      setActivePanels(prev => 
        prev.map(panel => 
          panel.tradeId === tradeId ? { ...panel, isOpen: true } : panel
        )
      );
    } else {
      // Add the new panel
      setActivePanels(prev => [
        ...prev,
        { tradeId, role, isOpen: true }
      ]);
      
      // Show toast notification
      toast.success(`${role === 'buyer' ? 'Purchase' : 'Sale'} tracking panel opened!`, {
        duration: 3000,
        position: 'top-right',
        icon: '🔄',
      });
      
      // Subscribe to real-time updates
      if (socketService.isConnected()) {
        socketService.joinTradeRoom(tradeId);
        socketService.subscribeToTradeUpdates(tradeId);
      }
    }
  };
  
  // Handle closing a trade panel
  const handleCloseTradePanel = (tradeId) => {
    // Set the panel to closed
    setActivePanels(prev => 
      prev.map(panel => 
        panel.tradeId === tradeId ? { ...panel, isOpen: false } : panel
      )
    );
    
    // After animation finishes, remove it completely
    setTimeout(() => {
      setActivePanels(prev => prev.filter(panel => panel.tradeId !== tradeId));
      
      // Unsubscribe from real-time updates
      if (socketService.isConnected()) {
        socketService.leaveTradeRoom(tradeId);
        socketService.unsubscribeFromTradeUpdates(tradeId);
      }
    }, 300);
  };
  
  // Subscribe to seller offer notifications
  useEffect(() => {
    if (!socketService.isConnected() || !user) return;
    
    const handleSellerOffer = (data) => {
      console.log("[TradeTrackingPanelManager] Received seller offer:", data);
      
      // Show toast notification
      toast.success(`New offer for your item "${data.itemName || 'item'}"!`, {
        duration: 5000,
        position: 'top-center',
        icon: '💰',
      });
      
      // Automatically open trade panel for seller
      if (data.tradeId) {
        handleOpenTradePanel(data.tradeId, 'seller');
      }
    };
    
    // Listen for seller trade offers
    socketService.socket.on('seller_trade_offer', handleSellerOffer);
    
    return () => {
      socketService.socket.off('seller_trade_offer', handleSellerOffer);
    };
  }, [user]);
  
  // Expose the panel open method to the window for global access
  useEffect(() => {
    // Make the openTradePanel function available globally
    window.openTradeTrackingPanel = handleOpenTradePanel;
    
    return () => {
      // Cleanup
      window.openTradeTrackingPanel = undefined;
    };
  }, []);
  
  return (
    <>
      {/* Render all active trade panels */}
      {activePanels.map(panel => (
        <TradeTrackingPanel
          key={panel.tradeId}
          isOpen={panel.isOpen}
          onClose={() => handleCloseTradePanel(panel.tradeId)}
          tradeId={panel.tradeId}
          userRole={panel.role}
        />
      ))}
    </>
  );
};

export default TradeTrackingPanelManager; 