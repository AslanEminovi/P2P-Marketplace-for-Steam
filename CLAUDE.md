# CS2 Marketplace Project

## Project Overview
The CS2 Marketplace is a specialized platform for trading Counter-Strike 2 items. It targets Georgian users with a fully localized interface and GEL (Georgian Lari) currency support alongside USD. The platform facilitates secure item trading through Steam's API with an escrow system.

### Core Features
- **Steam Integration**: Authentication and inventory sync through Steam API
- **Item Marketplace**: Browse, buy, and sell CS2 items with price history tracking
- **Trade System**: Secure peer-to-peer trading with escrow and dispute resolution
- **Wallet System**: Supports both USD and GEL currencies
- **User Verification**: Three-tier verification system for increased security and limits
- **Internationalization**: Georgian and English language support
- **3D Item Cards**: Interactive 3D item previews using CSS3D transforms
- **Real-time Notifications**: For trades, offers, and marketplace activity

## Technology Stack
- **Frontend**: React (client directory)
  - State management with React hooks
  - CSS-in-JS styling approach
  - CSS animations (removed Framer Motion)
  - i18next for internationalization
- **Backend**: Node.js/Express (server directory)
  - MongoDB database with Mongoose
  - Passport.js for Steam authentication
  - JWT for secure API access
- **APIs**:
  - Steam Web API for inventory, profiles, and trading
  - Exchange rate API for USD/GEL conversion

## Recent Fixes (March 2, 2025)

### Steam API Fixes
- Fixed inventory synchronization with cache busting parameters
- Added profile refresh functionality in UI and API
- Implemented automatic profile refresh mechanism

### Removed Framer Motion
- Completely removed motion library from components
- Replaced with pure CSS animations
- Fixed TradeHistory.jsx motion errors
- Updated App.jsx to no longer use AnimatePresence
- Added CSS spinner and bell animations

## Key Files Modified:
- `/server/services/steamApiService.js` - Added refresh profile methods with cache busting
- `/server/controllers/inventoryController.js` - Added cache busting for inventory data
- `/server/routes/authRoutes.js` - Added refresh endpoint and auto-refresh
- `/server/config/passport.js` - Updated profile on every login
- `/client/src/pages/Profile.jsx` - Added refresh button in UI
- `/client/src/components/TradeHistory.jsx` - Removed motion components
- `/client/src/components/NotificationCenter.jsx` - Replaced animations
- `/client/src/App.jsx` - Simplified animation system

## Project Architecture

### Frontend Routes
- `/` - Home/landing page
- `/marketplace` - Browse available items
- `/inventory` - User's CS2 inventory
- `/profile` - User profile and settings
- `/trades` - Trade history and active trades
- `/trades/:tradeId` - Trade detail page
- `/my-listings` - User's listed items

### API Endpoints
- `/auth/*` - Authentication routes (Steam OAuth)
- `/inventory/*` - Inventory management
- `/marketplace/*` - Listing and purchasing items
- `/trades/*` - Trade creation and management
- `/wallet/*` - Wallet operations
- `/user/*` - User profile and settings

## Database Models
- **User**: Profile info, wallet balances, settings
- **Item**: CS2 items with market data and ownership
- **Trade**: Trade records with status history
- **MarketListing**: Items listed for sale

## Common Commands
- `cd /Users/mac/Documents/steam/cs2-marketplace/client && npm start` - Start client
- `cd /Users/mac/Documents/steam/cs2-marketplace/server && npm start` - Start server

## Current Issues
- Steam API profile pictures don't update automatically (fixed)
- Inventory doesn't update immediately after selling items (fixed)
- Performance issues with 3D item cards on mobile
- Need to implement wallet withdrawal system

## Recent Implementation (March 2, 2025)

### WebSocket Real-Time Updates
- Implemented Socket.io for real-time communication
- Added server-side socket service for handling events
- Integrated client-side socket service
- Added WebSocket support for:
  - Trade updates
  - Inventory changes
  - Market listings
  - Wallet balance updates
  - Real-time notifications

## Future Enhancements
- Add item float value visualization
- Implement seller ratings and reviews
- Add item price history charts
- Implement 2FA for high-value transactions