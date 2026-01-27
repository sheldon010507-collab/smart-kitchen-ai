import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';
import { AuthProvider } from './lib/AuthContext';
import { InventoryProvider } from './lib/InventoryContext';
import { BusinessProvider } from './lib/BusinessContext';
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BusinessProvider>
          <InventoryProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </InventoryProvider>
        </BusinessProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);