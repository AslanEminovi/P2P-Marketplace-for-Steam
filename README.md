# CS2 Marketplace

A sophisticated peer-to-peer marketplace for Counter-Strike 2 (CS2) items with seamless Steam integration. This platform allows users to list, buy, sell, and trade CS2 items directly with other players through a secure and intuitive interface.

![CS2 Marketplace Banner](https://i.imgur.com/PLACEHOLDER.png)

## 🌟 Key Features

- **Steam Integration**: Full Steam authentication and inventory synchronization
- **Multi-Currency Support**: Built-in wallet system with USD and GEL currencies
- **Real-Time Trading**: Secure P2P trading with Steam trade offer integration
- **Advanced Inventory Management**: Browse, filter, and manage your CS2 items
- **Dynamic Marketplace**: List items for sale with automatic price suggestions
- **Offer System**: Make and receive offers with counter-offer capability
- **Trade History**: Comprehensive trade tracking and history
- **Secure Transactions**: Protected by Steam's trading system
- **Responsive Design**: Fully responsive UI that works on desktop and mobile
- **Notification System**: Real-time notifications for trades, offers, and transactions
- **Admin Tools**: Comprehensive admin panel for marketplace management

## 🛠️ Technology Stack

### Frontend

- **Framework**: React 18
- **Routing**: React Router v6
- **State Management**: React Context API
- **UI Components**: Custom components with React Bootstrap
- **Styling**: CSS, SCSS with custom design system
- **HTTP Client**: Axios
- **Real-time Communication**: Socket.IO client
- **Form Handling**: Custom hooks
- **Authentication**: JWT-based authentication with session management

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with Steam OAuth strategy
- **Socket**: Socket.IO for real-time features
- **API Integration**: Steam Web API, Steam Trading API
- **Security**: JWT, CORS, Helmet.js, Rate limiting
- **Payment Processing**: Custom implementation with currency exchange
- **Validation**: Express Validator
- **Logging**: Winston logger
- **Environment**: dotenv for configuration

### DevOps & Infrastructure

- **Hosting**: Render.com
- **Version Control**: Git with GitHub
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint, Prettier
- **Containerization**: Docker (optional)

## 🏗️ System Architecture

The application follows a modern client-server architecture:

```
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│                 │           │                 │           │                 │
│  React Frontend │◄─────────►│  Express Backend│◄─────────►│  MongoDB Atlas  │
│                 │   REST    │                 │ Mongoose  │                 │
└─────────────────┘    API    └─────────────────┘    ODM    └─────────────────┘
                                      │
                                      │
                                      ▼
                              ┌─────────────────┐
                              │                 │
                              │   Steam APIs    │
                              │                 │
                              └─────────────────┘
```

- **Frontend** communicates with the backend through RESTful API calls
- **Backend** handles business logic, database operations, and third-party API integration
- **Real-time features** implemented using Socket.IO for instant updates
- **Authentication** managed through Steam OAuth and JWT tokens
- **Database** uses MongoDB for flexible document storage optimized for gaming items

## 📋 Prerequisites

Before you begin, ensure you have the following:

- Node.js (v16+)
- MongoDB (local or Atlas)
- Steam API Key ([Get one here](https://steamcommunity.com/dev/apikey))
- Steam Web API key for inventory access
- Git

## ⚙️ Installation & Setup

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/AslanEminovi/P2P-Marketplace-for-Steam.git
   cd cs2-marketplace
   ```

2. **Set up environment variables**

   ```bash
   # Create .env file in server directory
   cp server/.env.example server/.env

   # Edit the .env file with your credentials
   # Important variables include:
   # - MONGO_URI
   # - STEAM_API_KEY
   # - STEAMWEBAPI_KEY
   # - SESSION_SECRET
   # - CLIENT_URL
   ```

3. **Install server dependencies**

   ```bash
   cd server
   npm install
   ```

4. **Install client dependencies**

   ```bash
   cd ../client
   npm install
   ```

5. **Run the development servers**

   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

### Production Deployment

For production deployment on Render.com:

1. Create a web service for the backend
2. Create a static site for the frontend
3. Configure environment variables in Render dashboard
4. Link your GitHub repository for automatic deployments

## 🔧 Configuration Options

### Required Environment Variables

| Variable             | Description                   | Example                                                      |
| -------------------- | ----------------------------- | ------------------------------------------------------------ |
| `NODE_ENV`           | Environment mode              | `development` or `production`                                |
| `PORT`               | Server port                   | `5001`                                                       |
| `MONGO_URI`          | MongoDB connection string     | `mongodb+srv://user:pass@cluster.mongodb.net/cs2marketplace` |
| `CLIENT_URL`         | Frontend URL                  | `http://localhost:3000`                                      |
| `SESSION_SECRET`     | Secret for session encryption | Random string                                                |
| `STEAM_API_KEY`      | Steam API key                 | Get from Steam Dev portal                                    |
| `STEAMWEBAPI_KEY`    | Steam Web API key             | Separate key for web API access                              |
| `STEAM_CALLBACK_URL` | OAuth callback URL            | `http://localhost:5001/auth/steam/return`                    |

## 🚀 Usage Guide

### For Users:

1. **Sign in with Steam** - Click the Steam login button and authorize the application
2. **Browse Marketplace** - View available CS2 items from other users
3. **List Items** - Sync your Steam inventory and list items for sale
4. **Make Offers** - Send offers for items with your desired price
5. **Manage Trades** - Accept, decline, or counter offers
6. **Complete Trades** - Follow the trade process through Steam's trade system
7. **Track History** - View your transaction and trade history

### For Admins:

1. Access admin panel at `/admin/tools`
2. Manage users, items, and trades
3. View system statistics
4. Configure marketplace settings
5. Handle reported issues

## 📊 API Documentation

The backend provides a RESTful API with the following main endpoints:

### Authentication

- `GET /auth/steam`: Initiate Steam login
- `GET /auth/steam/return`: Steam login callback
- `GET /auth/user`: Get current user data
- `GET /auth/logout`: Log out

### User

- `GET /user/profile`: Get user profile
- `PUT /user/settings`: Update user settings

### Inventory

- `GET /inventory/my`: Get user's Steam inventory

### Marketplace

- `GET /marketplace`: Get all marketplace listings
- `POST /marketplace/list`: List an item for sale
- `POST /marketplace/buy/:itemId`: Buy an item

### Trades

- `GET /trades/history`: Get trade history
- `GET /trades/:tradeId`: Get specific trade details

For a complete API reference, see the [API Documentation](API.md).

## 🤝 Contributing

We welcome contributions to improve CS2 Marketplace! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate tests.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Steam Web API](https://developer.valvesoftware.com/wiki/Steam_Web_API)
- [Passport-Steam](https://github.com/liamcurry/passport-steam)
- [MongoDB](https://www.mongodb.com/)
- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [Node.js](https://nodejs.org/)

## 📞 Contact

Aslan Eminovi - [GitHub](https://github.com/AslanEminovi)

Project Link: [https://github.com/AslanEminovi/P2P-Marketplace-for-Steam](https://github.com/AslanEminovi/P2P-Marketplace-for-Steam)
