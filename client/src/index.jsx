import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import './i18n/config';
import { AuthProvider } from './context/AuthContext';

// Simple error handler for any issues during app startup
const handleError = (error) => {
  console.error('Error initializing app:', error);
  
  // Try to show a visible error message to the user
  const errorDisplay = document.getElementById('error-display');
  if (errorDisplay) {
    errorDisplay.style.display = 'block';
    errorDisplay.textContent = `App initialization error: ${error.message}`;
  }
};

try {
  // Get the root element
  const container = document.getElementById('root');
  
  if (!container) {
    throw new Error('Root element not found');
  }
  
  // Create root and render the app
  const root = createRoot(container);
  
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
} catch (error) {
  handleError(error);
} 