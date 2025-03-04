# CS2 Marketplace Deployment Guide

This guide will walk you through deploying the CS2 Marketplace application using:

- MongoDB Atlas (database)
- Render (backend)
- Vercel (frontend)

## Prerequisites

1. Create accounts on:
   - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - [Render](https://render.com)
   - [Vercel](https://vercel.com)
2. Obtain a Steam API Key from [Steam Community](https://steamcommunity.com/dev/apikey)

## Step 1: Set up MongoDB Atlas

1. Create a free MongoDB Atlas account
2. Create a new cluster (the free tier is sufficient for testing)
3. Set up a database user with password
4. Whitelist all IP addresses (0.0.0.0/0) for testing purposes
5. Get your MongoDB connection string, it will look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/cs2marketplace
   ```

## Step 2: Deploy the Backend to Render

1. Fork or upload this repository to your GitHub account
2. Sign in to Render and create a new Web Service
3. Connect your GitHub repository
4. Configure the service:

   - **Name**: cs2-marketplace-backend
   - **Root Directory**: cs2-marketplace/server
   - **Runtime**: Node
   - **Build Command**: npm install
   - **Start Command**: npm start
   - **Instance Type**: Free (for testing)

5. Add the following environment variables:

   ```
   NODE_ENV=production
   PORT=10000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/cs2marketplace
   SESSION_SECRET=<generate-a-random-string>
   STEAMWEBAPI_KEY=<your-steam-web-api-key>
   STEAM_API_KEY=<your-steam-api-key>
   CLIENT_URL=<your-frontend-url> (will be set after frontend deployment)
   CALLBACK_URL=<your-backend-url>/auth/steam/return
   ```

6. Deploy the service and note the URL (e.g., https://cs2-marketplace-backend.onrender.com)

## Step 3: Deploy the Frontend to Vercel

1. Sign in to Vercel and create a new project
2. Connect your GitHub repository
3. Configure the project:

   - **Framework Preset**: Create React App
   - **Root Directory**: cs2-marketplace/client
   - **Build Command**: npm run build
   - **Output Directory**: build

4. Add the following environment variables:

   ```
   REACT_APP_API_URL=<your-backend-url> (from Step 2)
   ```

5. Deploy the project and note the URL (e.g., https://cs2-marketplace.vercel.app)

## Step 4: Update Backend Environment Variables

1. Go back to your Render dashboard
2. Update the `CLIENT_URL` environment variable with your frontend URL
3. Redeploy the backend service

## Step 5: Test the Deployment

1. Open your frontend URL in a browser
2. Try to log in with Steam
3. Check that you can view the marketplace, inventory, and other features
4. Test trading functionality between two different users

## Troubleshooting

### Steam Login Issues

- Make sure your Steam API keys are correct
- Verify the CALLBACK_URL points to your backend URL
- Check that the frontend is correctly connecting to the backend

### Database Connection Issues

- Verify your MongoDB connection string
- Make sure your database user has the correct permissions
- Check that you've whitelisted the necessary IP addresses

### General Issues

- Check browser console for frontend errors
- Check Render logs for backend errors
- Make sure all environment variables are set correctly

## Going to Production

When moving to a real production environment:

1. Use a paid tier on Render for better performance
2. Set up proper database access controls on MongoDB Atlas
3. Consider adding a custom domain
4. Set up proper monitoring and logging
5. Configure SSL certificates for your domains
