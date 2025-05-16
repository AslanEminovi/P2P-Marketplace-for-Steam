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
  
  // DEV: Test button to simulate receiving a seller trade offer
  const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
  const handleTestOffer = () => {
    if (!user) {
      toast.error('No user logged in for test offer.');
      return;
    }
    dispatch({
      type: 'trades/setSellerTradeOffer/fulfilled',
      payload: {
        tradeId: 'test-trade-id-' + Date.now(),
        role: 'seller',
        itemName: 'Test Item',
        sellerId: user._id,
      },
    });
    toast.success('Test seller trade offer dispatched!', { icon: '🧪' });
  };
  
  // Handle new trade offers coming from Redux
  useEffect(() => {
    if (sellerTradeOffer && sellerTradeOffer.tradeId) {
      console.log("[TradeSidePanelManager] sellerTradeOffer from Redux:", sellerTradeOffer);
      console.log("[TradeSidePanelManager] Current activeTradePanels:", activeTradePanels);
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
          console.log("[TradeSidePanelManager] Opened new trade panel for tradeId", sellerTradeOffer.tradeId);
        }, 300);
      } else if (existingPanel && !existingPanel.isOpen) {
        setActiveTradePanels(prev => 
          prev.map(panel => 
            panel.tradeId === sellerTradeOffer.tradeId 
              ? { ...panel, isOpen: true } 
              : panel
          )
        );
        toast.success('Reopening trade offer panel!', {
          duration: 3000,
          position: 'top-right',
        });
        console.log("[TradeSidePanelManager] Reopened existing trade panel for tradeId", sellerTradeOffer.tradeId);
      } else {
        console.warn("[TradeSidePanelManager] Trade panel already open for tradeId", sellerTradeOffer.tradeId);
        toast.error('Trade panel already open for this offer.', { position: 'top-center' });
      }
      // Clear the sellerTradeOffer from Redux after processing
      setTimeout(() => {
        dispatch(clearSellerTradeOffer());
        console.log("[TradeSidePanelManager] Cleared sellerTradeOffer from Redux");
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
      setActiveTradePanels(prev => 
        prev.map(panel => 
          panel.tradeId === tradeId ? { ...panel, isOpen: true } : panel
        )
      );
      console.log("[TradeSidePanelManager] handleOpenTradePanel: Panel already exists, set isOpen true", tradeId);
    } else {
      dispatch(fetchTradeDetails(tradeId));
      setActiveTradePanels(prev => [
        ...prev,
        { tradeId, role, isOpen: true }
      ]);
      if (socketService.isConnected()) {
        socketService.joinTradeRoom(tradeId);
        socketService.subscribeToTradeUpdates(tradeId);
      }
      console.log("[TradeSidePanelManager] handleOpenTradePanel: Opened new panel for tradeId", tradeId);
    }
  };
  
  // Handle closing a trade panel
  const handleCloseTradePanel = (tradeId) => {
    setActiveTradePanels(prev => 
      prev.map(panel => 
        panel.tradeId === tradeId ? { ...panel, isOpen: false } : panel
      )
    );
    setTimeout(() => {
      setActiveTradePanels(prev => prev.filter(panel => panel.tradeId !== tradeId));
      if (socketService.isConnected()) {
        socketService.leaveTradeRoom(tradeId);
        socketService.unsubscribeFromTradeUpdates(tradeId);
      }
      console.log("[TradeSidePanelManager] Closed and removed trade panel for tradeId", tradeId);
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
      {/* DEV ONLY: Test button for simulating seller trade offer */}
      {isDev && (
        <button style={{ position: 'fixed', top: 10, right: 10, zIndex: 2000, background: '#222', color: '#fff', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} onClick={handleTestOffer}>
          Simulate Seller Trade Offer
        </button>
      )}
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