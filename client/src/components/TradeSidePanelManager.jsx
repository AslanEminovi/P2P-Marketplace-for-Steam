import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import TradeSidePanel from './TradeSidePanel';
import socketService from '../services/socketService';
import { fetchTradeDetails, clearSellerTradeOffer } from '../redux/slices/tradesSlice';
import toast from 'react-hot-toast';

/**
 * TradeSidePanelManager - Manages real-time trade side panels
 * This component maintains the state of active trade panels and handles
 * real-time updates via socket connections
 */
const TradeSidePanelManager = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Get current user and sellerTradeOffer from Redux store
  const user = useSelector(state => state.auth.user);
  const sellerTradeOffer = useSelector(state => state.trades.sellerTradeOffer);
  
  // Local state for active trade panels
  const [activeTradePanels, setActiveTradePanels] = useState([]);
  
  // Handle new trade offers coming from Redux
  useEffect(() => {
    if (sellerTradeOffer && sellerTradeOffer.tradeId) {
      console.log("[TradeSidePanelManager] Received seller trade offer:", sellerTradeOffer);
      
      // Check if this trade panel is already open
      const existingPanel = activeTradePanels.find(panel => panel.tradeId === sellerTradeOffer.tradeId);
      
      if (!existingPanel) {
        // Fetch the trade details first to ensure we have the data
        dispatch(fetchTradeDetails(sellerTradeOffer.tradeId));
        
        // Add the new panel with a slight delay to ensure data is loaded
        setTimeout(() => {
          setActiveTradePanels(prev => [
            ...prev,
            {
              tradeId: sellerTradeOffer.tradeId,
              role: sellerTradeOffer.role || 'seller',
              isOpen: true
            }
          ]);
          
          // Show toast notification to confirm panel is opening
          toast.success('New trade offer received! Panel opening automatically.', {
            duration: 5000,
            position: 'top-center',
            icon: '💰',
          });
        }, 300);
      } else if (existingPanel && !existingPanel.isOpen) {
        // If panel exists but is closed, make it open again
        setActiveTradePanels(prev => 
          prev.map(panel => 
            panel.tradeId === sellerTradeOffer.tradeId 
              ? { ...panel, isOpen: true } 
              : panel
          )
        );
        
        // Show toast that we're reopening the panel
        toast.success('Reopening trade offer panel!', {
          duration: 3000,
          position: 'top-right',
        });
      }
      
      // Clear the sellerTradeOffer from Redux after processing
      // Use a slight delay to avoid race conditions
      setTimeout(() => {
        dispatch(clearSellerTradeOffer());
      }, 500);
    }
  }, [sellerTradeOffer, dispatch, activeTradePanels]);
  
  // Subscribe to real-time trade updates via socket
  useEffect(() => {
    if (!socketService.isConnected() || !user) return;
    
    console.log("[TradeSidePanelManager] Setting up socket listeners for trade panels");
    
    // Handle trade status updates
    const handleTradeUpdate = (update) => {
      console.log("[TradeSidePanelManager] Received trade update:", update);
      
      // If this trade is in our active panels, update its data
      if (activeTradePanels.some(panel => panel.tradeId === update.tradeId)) {
        dispatch(fetchTradeDetails(update.tradeId));
      }
      
      // If a trade is completed or cancelled and the trade panel is open, navigate to trades page after delay
      if (update.status && ['completed', 'cancelled', 'rejected'].includes(update.status)) {
        setTimeout(() => {
          if (activeTradePanels.some(panel => panel.tradeId === update.tradeId && panel.isOpen)) {
            // Close the panel first
            handleCloseTradePanel(update.tradeId);
            
            // Then navigate after small delay
            setTimeout(() => navigate('/trades'), 300);
          }
        }, 3000); // Wait 3 seconds to show the completion status before navigating
      }
    };
    
    // Handle new trade offers directly
    const handleNewTradeOffer = (data) => {
      console.log("[TradeSidePanelManager] Received direct trade offer:", data);
      
      // Only process if this user is the seller
      if (user && user._id === data.sellerId) {
        // Show toast notification
        toast.success(`New offer from ${data.buyerName || 'a buyer'} for your "${data.itemName || 'item'}"!`, {
          duration: 5000,
          position: 'top-center',
          icon: '💰',
        });
        
        // Automatically open trade panel for seller
        if (data.tradeId) {
          // Check if panel is already open
          if (!activeTradePanels.some(panel => panel.tradeId === data.tradeId)) {
            handleOpenTradePanel(data.tradeId, 'seller');
          }
        }
      }
    };
    
    // Listen for trade updates
    socketService.socket.on('trade_update', handleTradeUpdate);
    
    // Listen for new trade offers through multiple event types to ensure we catch them
    socketService.socket.on('seller_trade_offer', handleNewTradeOffer);
    socketService.socket.on('newTradeOffer', handleNewTradeOffer);
    
    // Setup socket for each active trade panel
    activeTradePanels.forEach(panel => {
      if (panel.isOpen) {
        // Join the trade room to receive real-time updates
        socketService.joinTradeRoom(panel.tradeId);
        // Subscribe to trade updates
        socketService.subscribeToTradeUpdates(panel.tradeId);
      }
    });
    
    // Cleanup function
    return () => {
      console.log("[TradeSidePanelManager] Cleaning up socket listeners");
      
      // Remove event listeners
      socketService.socket.off('trade_update', handleTradeUpdate);
      socketService.socket.off('seller_trade_offer', handleNewTradeOffer);
      socketService.socket.off('newTradeOffer', handleNewTradeOffer);
      
      // Unsubscribe from all active trade rooms
      activeTradePanels.forEach(panel => {
        if (panel.isOpen) {
          socketService.leaveTradeRoom(panel.tradeId);
          socketService.unsubscribeFromTradeUpdates(panel.tradeId);
        }
      });
    };
  }, [activeTradePanels, user, navigate, dispatch]);
  
  // Handle opening a new trade panel
  const handleOpenTradePanel = (tradeId, role = 'buyer') => {
    // Check if the panel is already open
    const existingPanel = activeTradePanels.find(panel => panel.tradeId === tradeId);
    
    if (existingPanel) {
      // Just make sure it's open if it already exists
      setActiveTradePanels(prev => 
        prev.map(panel => 
          panel.tradeId === tradeId ? { ...panel, isOpen: true } : panel
        )
      );
    } else {
      // Fetch trade details
      dispatch(fetchTradeDetails(tradeId));
      
      // Add the new panel
      setActiveTradePanels(prev => [
        ...prev,
        { tradeId, role, isOpen: true }
      ]);
      
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
    setActiveTradePanels(prev => 
      prev.map(panel => 
        panel.tradeId === tradeId ? { ...panel, isOpen: false } : panel
      )
    );
    
    // After animation finishes, remove it completely
    setTimeout(() => {
      setActiveTradePanels(prev => prev.filter(panel => panel.tradeId !== tradeId));
      
      // Unsubscribe from real-time updates
      if (socketService.isConnected()) {
        socketService.leaveTradeRoom(tradeId);
        socketService.unsubscribeFromTradeUpdates(tradeId);
      }
    }, 300);
  };
  
  // Expose the panel open method to the window for global access
  useEffect(() => {
    // Make the openTradePanel function available globally
    window.openTradePanel = handleOpenTradePanel;
    
    return () => {
      window.openTradePanel = undefined;
    };
  }, []);
  
  return (
    <>
      {/* Render all active trade panels */}
      {activeTradePanels.map(panel => (
        <TradeSidePanel
          key={panel.tradeId}
          isOpen={panel.isOpen}
          onClose={() => handleCloseTradePanel(panel.tradeId)}
          tradeId={panel.tradeId}
          role={panel.role}
        />
      ))}
    </>
  );
};

export default TradeSidePanelManager; 