import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import './i18n/config';
import { AuthProvider } from './context/AuthContext';

// Error handling helper
const logError = (message, error) => {
  console.error(`[index.jsx] ${message}`, error);
  
  // Also log to visible error display if available
  if (typeof document !== 'undefined') {
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
      errorDisplay.style.display = 'block';
      errorDisplay.textContent += `[index.jsx] ${message}: ${error?.message || error}\n`;
      if (error?.stack) {
        errorDisplay.textContent += `${error.stack}\n`;
      }
    }
  }
};

try {
  console.log("[index.jsx] Starting app initialization");
  const container = document.getElementById('root');
  
  if (!container) {
    throw new Error('Root element not found');
  }
  
  console.log("[index.jsx] Found root element, creating React root");
  const root = createRoot(container);
  
  console.log("[index.jsx] Rendering React app...");
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
  console.log("[index.jsx] React rendering completed");
} catch (error) {
  logError("Failed to initialize React application", error);
} 