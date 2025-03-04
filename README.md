# CS2 Marketplace

A peer-to-peer marketplace for CS2 (Counter-Strike 2) items with Steam integration.

## Features

- Steam authentication
- Real wallet system with USD and GEL currencies
- Inventory management
- Marketplace listings
- Trade offers and counter-offers
- Secure webhooks for trade status updates
- User verification system

## Technologies

- **Frontend**: React, React Router
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: Passport.js with Steam OAuth
- **API Integration**: Steam Web API

## Setup

### Prerequisites

- Node.js (v14+)
- MongoDB
- Steam API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cs2-marketplace.git
   cd cs2-marketplace
   ```

2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

4. Copy the example environment file and update with your values:
   ```bash
   cp .env.example .env
   ```

5. Start the MongoDB service:
   ```bash
   # On most systems
   sudo service mongod start
   # Or
   mongod
   ```

6. Start the development server:
   ```bash
   # Start backend (from server directory)
   npm run dev

   # Start frontend (from client directory)
   npm start
   ```

## Environment Variables

The following environment variables are required:

- `PORT`: Server port (default: 5001)
- `NODE_ENV`: Environment ('development' or 'production')
- `CLIENT_URL`: URL of the client application
- `SESSION_SECRET`: Secret for session encryption
- `STEAM_WEBHOOK_SECRET`: Secret for validating webhook requests
- `MONGODB_URI`: MongoDB connection string
- `STEAM_API_KEY`: Your Steam Web API key
- `STEAM_API_BASE_URL`: Base URL for Steam Web API
- `WEBHOOK_URL`: URL for receiving trade webhooks

## API Routes

### Authentication
- `GET /auth/steam`: Initiate Steam login
- `GET /auth/steam/return`: Steam login callback
- `GET /auth/user`: Get current user data
- `GET /auth/logout`: Log out

### User 
- `GET /user/profile`: Get user profile
- `PUT /user/settings`: Update user settings
- `GET /user/notifications`: Get user notifications
- `PUT /user/notifications/read`: Mark notifications as read

### Inventory
- `GET /inventory/my`: Get user's Steam inventory

### Marketplace
- `GET /marketplace`: Get all marketplace listings
- `POST /marketplace/list`: List an item for sale
- `POST /marketplace/buy/:itemId`: Buy an item
- `GET /marketplace/my-listings`: Get user's listings
- `PUT /marketplace/cancel/:itemId`: Cancel a listing
- `PUT /marketplace/update-price/:itemId`: Update item price

### Offers
- `POST /offers/:itemId`: Create an offer
- `GET /offers/received`: Get received offers
- `GET /offers/sent`: Get sent offers
- `PUT /offers/:itemId/:offerId/accept`: Accept an offer
- `PUT /offers/:itemId/:offerId/decline`: Decline an offer
- `POST /offers/:itemId/:offerId/counterOffer`: Create counter offer

### Trades
- `GET /trades/history`: Get trade history
- `GET /trades/:tradeId`: Get specific trade details

### Wallet
- `GET /wallet/balance`: Get wallet balance
- `GET /wallet/transactions`: Get transaction history
- `POST /wallet/deposit`: Deposit funds
- `POST /wallet/withdraw`: Withdraw funds
- `POST /wallet/exchange`: Exchange between currencies

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Steam Web API](https://developer.valvesoftware.com/wiki/Steam_Web_API)
- [Passport-Steam](https://github.com/liamcurry/passport-steam)
- [MongoDB](https://www.mongodb.com/)
- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)