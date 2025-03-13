# CS2 Marketplace

![CS2 Marketplace Banner](https://i.imgur.com/EH5UTkl.png)

A sophisticated peer-to-peer marketplace for Counter-Strike 2 (CS2) items with seamless Steam integration. This platform empowers players to list, buy, sell, and trade CS2 skins directly with other community members through a secure, user-friendly, and commission-free interface.

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#%EF%B8%8F-technology-stack">Tech Stack</a> •
  <a href="#%EF%B8%8F-system-architecture">Architecture</a> •
  <a href="#-installation--setup">Installation</a> •
  <a href="#-usage-guide">Usage</a> •
  <a href="#-contributing">Contributing</a>
</p>

## 🌟 Key Features

### Core Marketplace Functionality

- **Steam Integration**

  - Secure OAuth authentication through Steam
  - Real-time inventory synchronization
  - Steam Guard protection for all trades
  - Automated trade offer generation and handling

- **Multi-Currency Support**

  - Built-in wallet system with USD and GEL currencies
  - Real-time currency conversion
  - Transparent pricing with no hidden fees
  - Deposit and withdrawal options

- **Advanced Trading System**
  - Secure P2P trading with Steam trade offer integration
  - Direct item-for-item trades with optional currency balance
  - Trade offer status tracking and verification
  - Automated trade confirmation and execution

### User Experience

- **Intelligent Inventory Management**

  - Comprehensive inventory filtering by:
    - Weapon type, rarity, wear, and price range
    - Pattern index and float value
    - Sticker combinations and special attributes
  - Real-time inventory valuation
  - Price history tracking for informed decisions

- **Dynamic Marketplace**

  - Intelligent price suggestions based on market trends
  - Real-time market data and price fluctuations
  - Custom listing durations and auto-renewal options
  - Promotional tools for sellers to highlight their listings

- **Communication System**
  - Integrated chat for negotiation between traders
  - Trade offer comments and feedback
  - Reputation system for trusted traders
  - Dispute resolution process

### Security & Management

- **Secure Transaction System**

  - Protected by Steam's robust trading infrastructure
  - Multi-factor authentication for sensitive actions
  - Comprehensive escrow system for high-value trades
  - Fraud detection and prevention measures

- **Advanced User Profiles**

  - Trade reputation and history
  - Customizable profile pages
  - Trading statistics and analytics
  - Achievement system for platform engagement

- **Comprehensive Admin Tools**
  - Full marketplace monitoring and management
  - User management and moderation tools
  - Transaction auditing and reporting
  - System health monitoring and analytics dashboard

## 🛠️ Technology Stack

### Frontend

<p align="center">
  <img src="https://img.shields.io/badge/React-18.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/React%20Router-6.3.0-CA4245?style=for-the-badge&logo=react-router&logoColor=white" alt="React Router" />
  <img src="https://img.shields.io/badge/Axios-0.27.2-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" />
  <img src="https://img.shields.io/badge/Socket.IO-4.5.1-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/SCSS-7.0.2-CC6699?style=for-the-badge&logo=sass&logoColor=white" alt="SCSS" />
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white" alt="JWT" />
</p>

- **Framework**: React 18 with functional components and hooks
- **Routing**: React Router v6 with protected routes and lazy loading
- **State Management**: React Context API with custom reducers
- **UI Components**: Custom component library with React Bootstrap foundation
- **Styling**: SCSS with CSS modules, custom design system, and responsive layouts
- **HTTP Client**: Axios with request/response interceptors and error handling
- **Real-time Communication**: Socket.IO client with reconnection strategies
- **Form Handling**: Custom form hooks with validation
- **Authentication**: JWT-based authentication with refresh tokens and session management
- **Data Visualization**: Chart.js for analytics and market trends
- **Performance**: React.memo, useMemo, useCallback for optimized rendering
- **Testing**: Jest and React Testing Library for component testing

### Backend

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-16.x-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.18.1-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-5.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Mongoose-6.3.5-880000?style=for-the-badge&logo=mongoose&logoColor=white" alt="Mongoose" />
  <img src="https://img.shields.io/badge/Passport-0.6.0-34E27A?style=for-the-badge&logo=passport&logoColor=white" alt="Passport" />
  <img src="https://img.shields.io/badge/Socket.IO-4.5.1-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.IO" />
</p>

- **Runtime**: Node.js with ES modules support
- **Framework**: Express.js with middleware architecture
- **Database**: MongoDB with Mongoose ODM for data modeling and validation
- **Authentication**:
  - Passport.js with Steam OpenID strategy
  - JWT tokens with refresh token rotation
  - Role-based access control system
- **Real-time Features**:
  - Socket.IO server with rooms and namespaces
  - Event-driven architecture for real-time updates
- **API Integration**:
  - Steam Web API client for inventory fetching
  - Steam Trading API for offer creation and management
  - Custom rate limiting and caching strategies
- **Security**:
  - JWT with private/public key signing
  - CORS protection with allowlist
  - Helmet.js for HTTP header security
  - Rate limiting for API abuse prevention
  - Data sanitization and validation
- **Payment Processing**:
  - Custom implementation with currency exchange
  - Transaction rollback capabilities
  - Audit logging for financial operations
- **Validation**: Express Validator with custom validation chains
- **Logging**: Winston logger with multiple transports
- **Environment**: dotenv with schema validation
- **Error Handling**: Global error handler with standardized error responses
- **Performance**: Redis caching for high-traffic routes and query optimization

### DevOps & Infrastructure

<p align="center">
  <img src="https://img.shields.io/badge/Render-Cloud-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
  <img src="https://img.shields.io/badge/Git-2.36.1-F05032?style=for-the-badge&logo=git&logoColor=white" alt="Git" />
  <img src="https://img.shields.io/badge/GitHub-Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Docker-20.10.16-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/ESLint-8.15.0-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint" />
  <img src="https://img.shields.io/badge/Prettier-2.6.2-F7B93E?style=for-the-badge&logo=prettier&logoColor=black" alt="Prettier" />
</p>

- **Hosting**: Render.com web services with auto-scaling
- **Version Control**: Git with GitHub for collaborative development
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Code Quality**:
  - ESLint with custom rule configuration
  - Prettier for consistent code formatting
  - Husky for pre-commit hooks
- **Containerization**: Docker with multi-stage builds for optimized images
- **Monitoring**: Application performance monitoring with Sentry
- **Documentation**: API documentation with Swagger/OpenAPI
- **Testing**:
  - Jest for unit and integration testing
  - Supertest for API endpoint testing
  - Cypress for end-to-end testing

## 🏗️ System Architecture

The CS2 Marketplace follows a modern, scalable architecture designed to handle real-time trading with high reliability and security.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐  │
│  │  Marketplace│    │  Inventory   │    │   Trading   │    │  User    │  │
│  │  Interface  │    │  Management  │    │   Platform  │    │ Profile  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────────┘  │
│              React Components & Custom Hooks                            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMMUNICATION LAYER                              │
│                                                                         │
│  ┌─────────────────────┐                      ┌─────────────────────┐   │
│  │   RESTful API       │◄────────────────────►│   WebSocket         │   │
│  │   (Axios + JWT)     │                      │   (Socket.IO)        │   │
│  └─────────────────────┘                      └─────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVER LAYER                                   │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐  │
│  │  Auth       │    │  API         │    │  Socket     │    │ Business │  │
│  │  Service    │    │  Controllers │    │  Handlers   │    │  Logic   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────────┘  │
│                                                                         │
│         Express.js Middleware Stack & Application Services              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                     │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐  │
│  │  MongoDB    │    │  Redis Cache │    │  File       │    │  External│  │
│  │  Database   │    │  (Optional)  │    │  Storage    │    │  APIs    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────────┘  │
│                                                               │         │
└───────────────────────────────────────────────────────────────┼─────────┘
                                                                │
                                                                ▼
                                                      ┌───────────────────┐
                                                      │                   │
                                                      │   Steam APIs      │
                                                      │                   │
                                                      └───────────────────┘
```

### Architecture Components in Detail

#### 1. Client Layer

The frontend is built on React with a component-based architecture that promotes reusability and maintainability:

- **Application Shell**: Core layout components that define the structure of the application
- **Feature Modules**: Encapsulated components for marketplace, inventory, trading, and user management
- **Service Layer**: Abstractions for API calls, WebSocket communication, and local state management
- **Context Providers**: Global state management using React Context API with custom reducers
- **Custom Hooks**: Reusable logic for common operations like form handling, authentication, and API requests
- **UI Component Library**: Consistent design system with reusable interface elements

#### 2. Communication Layer

Handles all data exchange between client and server:

- **RESTful API**: Standard HTTP endpoints for CRUD operations following REST principles
- **WebSocket Connection**: Real-time bidirectional communication for instant updates on trades, offers, and marketplace changes
- **Authentication Flow**: Secure token-based authentication with refresh token rotation
- **Request/Response Interceptors**: Centralized error handling and request formatting

#### 3. Server Layer

Implements the core business logic and application services:

- **Authentication Service**:

  - Steam OpenID integration
  - JWT token generation and validation
  - Session management
  - Role-based access control

- **API Controllers**:

  - Route handlers for all application features
  - Input validation and sanitization
  - Response formatting
  - Error handling

- **Socket Handlers**:

  - Real-time event processing
  - Notification distribution
  - Live updates for marketplace and trading
  - Connection state management

- **Business Logic Services**:

  - Trading system implementation
- Inventory management
  - Marketplace operations
  - User management
  - Security enforcement

- **Middleware Stack**:
  - Request authentication
  - Rate limiting
  - CORS protection
  - Logging and monitoring
  - Error handling

#### 4. Data Layer

Manages persistence and external integrations:

- **MongoDB Database**:

  - Document-based storage for all application data
  - Mongoose schemas with validation
  - Indexes for query optimization
  - Aggregation pipelines for complex data retrieval

- **Redis Cache (Optional)**:

  - Frequently accessed data caching
  - Session storage
  - Rate limiting counters
  - Pub/Sub for scalable WebSocket implementation

- **File Storage**:

  - Item images
  - User assets
  - System backups
  - Logs and audit trails

- **External API Integration**:
  - Steam Web API for inventory data
  - Steam Trading API for offer management
  - Currency exchange services
  - Analytics and monitoring services

### Key Architectural Features

- **Scalability**: Stateless server design allows horizontal scaling to handle traffic spikes
- **Reliability**: Error handling and recovery mechanisms at every layer
- **Security**: Multiple layers of protection for user data and transactions
- **Performance**: Optimized data access patterns and caching strategies
- **Maintainability**: Modular design with clear separation of concerns
- **Testability**: Isolated components that can be tested independently

## 📋 Prerequisites

Before you begin, ensure you have the following:

- Node.js (v16+)
- MongoDB (local or Atlas)
- Steam API Key ([Get one here](https://steamcommunity.com/dev/apikey))
- Steam Web API key for inventory access
- Git
- npm or yarn package manager
- A modern web browser (Chrome, Firefox, Edge recommended)

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
   # - JWT_SECRET
   # - JWT_REFRESH_SECRET
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

5. **Initialize the database (optional)**

   ```bash
   cd ../server
   npm run seed
   ```

6. **Run the development servers**

   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm start
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - API Documentation: http://localhost:5001/api-docs (if Swagger is configured)

### Production Deployment on Render.com

1. **Create a web service for the backend**

   - Connect your GitHub repository
   - Select the `server` directory as the root
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add all required environment variables

2. **Create a static site for the frontend**

   - Connect your GitHub repository
   - Select the `client` directory as the root
   - Set build command: `npm install && npm run build`
   - Set publish directory: `build`
   - Add environment variable: `REACT_APP_API_URL=<your-backend-url>`

3. **Set up a MongoDB database**

   - Use MongoDB Atlas or another provider
   - Configure the connection string in your backend environment variables

4. **Configure DNS and SSL**

   - Set up custom domains if desired
   - Ensure SSL certificates are properly configured

5. **Monitor deployment**
   - Check logs for any issues
   - Verify connectivity between frontend and backend

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
| `JWT_SECRET`         | Secret for JWT signing        | Random string                                                |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens     | Random string                                                |
| `JWT_EXPIRES_IN`     | Token expiration time         | `1h`                                                         |
| `SOCKET_CORS_ORIGIN` | Socket.IO CORS origin         | `http://localhost:3000`                                      |
| `LOG_LEVEL`          | Logging verbosity             | `info`, `debug`, `error`                                     |

### Optional Configuration

| Variable               | Description                        | Default               |
| ---------------------- | ---------------------------------- | --------------------- |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window               | `60000` (1 minute)    |
| `RATE_LIMIT_MAX`       | Max requests per window            | `100`                 |
| `REDIS_URL`            | Redis connection string (optional) | `null`                |
| `ENABLE_SWAGGER`       | Enable API documentation           | `true` in development |
| `MAX_UPLOAD_SIZE`      | Maximum file upload size           | `5242880` (5MB)       |

## 🚀 Usage Guide

### For Users:

1. **Sign in with Steam**

   - Click the Steam login button on the homepage
   - Authorize the application through Steam's authentication page
   - Your Steam profile will be automatically linked to your marketplace account

2. **Browse Marketplace**

   - Navigate to the marketplace section
   - Use filters to find specific items (weapon type, rarity, wear, price range)
   - Sort listings by price, popularity, or recency
   - View detailed item information by clicking on listings

3. **List Items for Sale**

   - Go to your inventory page
   - Select items you wish to sell
   - Set your asking price (the system will suggest market rates)
   - Choose listing duration and visibility options
   - Confirm and publish your listings

4. **Make and Manage Offers**

   - Find an item you want to purchase
   - Click "Make Offer" to propose your price
   - Add a message to the seller (optional)
   - View and manage your offers in your dashboard
   - Respond to counteroffers from sellers

5. **Complete Trades**

   - Accept favorable offers
   - Follow prompts to complete the Steam trade
   - Confirm receipt of items through the platform
   - Rate your trading experience

6. **Track History and Analytics**
   - View comprehensive transaction records
   - Analyze your trading patterns and profits
   - Export reports for personal record-keeping
   - Monitor market trends for better trading decisions

### For Admins:

1. **Access Admin Panel**

   - Navigate to `/admin/dashboard` (requires admin privileges)
   - Authenticate with additional security measures

2. **User Management**

   - View all registered users
   - Check user verification status
   - Moderate user profiles and listings
   - Address reported issues and disputes

3. **Marketplace Monitoring**

   - View real-time trading activity
   - Analyze market trends and popular items
   - Monitor for suspicious trading patterns
   - Generate platform usage reports

4. **System Configuration**

   - Configure platform settings
   - Manage notification templates
   - Set fee structures (if applicable)
   - Toggle feature availability

5. **Content Moderation**
   - Review flagged listings or messages
   - Manage community guidelines compliance
   - Implement temporary restrictions when necessary
   - Provide feedback to users about policy violations

## 📊 API Documentation

The backend provides a comprehensive RESTful API with the following main endpoints:

### Authentication

- `GET /auth/steam`: Initiate Steam login
- `GET /auth/steam/return`: Steam login callback
- `GET /auth/user`: Get current user data
- `GET /auth/logout`: Log out
- `POST /auth/refresh`: Refresh access token

### User Management

- `GET /user/profile`: Get user profile
- `PUT /user/settings`: Update user settings
- `GET /user/:userId`: Get public user profile
- `PUT /user/wallet`: Update wallet settings
- `GET /user/statistics`: Get user trading statistics

### Inventory Management

- `GET /inventory/my`: Get user's Steam inventory
- `POST /inventory/refresh`: Force refresh inventory from Steam
- `GET /inventory/filters`: Get available inventory filters
- `POST /inventory/valuation`: Get estimated value of inventory items

### Marketplace Operations

- `GET /marketplace`: Get all marketplace listings
- `GET /marketplace/filters`: Get available marketplace filters
- `POST /marketplace/list`: List an item for sale
- `DELETE /marketplace/list/:listingId`: Remove listing
- `GET /marketplace/trending`: Get trending items
- `GET /marketplace/search`: Search marketplace items
- `GET /marketplace/item/:itemId`: Get detailed item information

### Trading System

- `POST /trades/offer`: Create a new trade offer
- `GET /trades/offers/sent`: Get sent offers
- `GET /trades/offers/received`: Get received offers
- `PUT /trades/offer/:offerId/accept`: Accept an offer
- `PUT /trades/offer/:offerId/decline`: Decline an offer
- `PUT /trades/offer/:offerId/counter`: Make a counteroffer
- `GET /trades/history`: Get trade history
- `GET /trades/:tradeId`: Get specific trade details

### Admin API

- `GET /admin/users`: Get all users
- `GET /admin/trades`: Get all trades
- `GET /admin/statistics`: Get platform statistics
- `PUT /admin/user/:userId/status`: Update user status
- `DELETE /admin/listing/:listingId`: Remove marketplace listing
- `POST /admin/announcement`: Create system announcement

For a complete API reference with request/response schemas, see the [API Documentation](API.md).

## 🤝 Contributing

We welcome contributions to improve CS2 Marketplace! Please follow these steps:

1. **Fork the repository**

   - Click the Fork button in the top-right corner of the repository page

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/P2P-Marketplace-for-Steam.git
   cd cs2-marketplace
   ```

3. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

4. **Make your changes**

   - Follow the coding standards and project structure
   - Add tests for new functionality
   - Ensure all existing tests pass

5. **Commit your changes**

   ```bash
   git commit -m 'Add some amazing feature'
   ```

6. **Push to your branch**

   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and feature branch
   - Provide a clear description of your changes

### Coding Standards

- Use ESLint and Prettier for code formatting
- Follow the existing architectural patterns
- Write meaningful commit messages
- Document new features or API changes
- Add appropriate error handling
- Include unit tests for new functionality

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Steam Web API](https://developer.valvesoftware.com/wiki/Steam_Web_API) - For inventory access and authentication
- [Passport-Steam](https://github.com/liamcurry/passport-steam) - Steam authentication strategy
- [MongoDB](https://www.mongodb.com/) - Database platform
- [React](https://reactjs.org/) - Frontend framework
- [Express](https://expressjs.com/) - Backend framework
- [Socket.IO](https://socket.io/) - Real-time communication
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - JWT implementation
- [Axios](https://axios-http.com/) - HTTP client
- [Winston](https://github.com/winstonjs/winston) - Logging library
- [CORS](https://github.com/expressjs/cors) - Cross-Origin Resource Sharing middleware
- [Helmet](https://helmetjs.github.io/) - Security middleware

## 📞 Contact

Aslan Eminovi - [GitHub](https://github.com/AslanEminovi)

Project Link: [https://github.com/AslanEminovi/P2P-Marketplace-for-Steam](https://github.com/AslanEminovi/P2P-Marketplace-for-Steam)

---

<p align="center">
  Made with ❤️ for the CS2 community
</p>
