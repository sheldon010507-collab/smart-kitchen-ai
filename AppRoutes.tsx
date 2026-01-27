import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';

import { DashboardPage } from './pages/DashboardPage';

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Legacy App Route as Layout */}
            <Route path="/" element={<App />}>
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="chef" element={<DashboardPage />} />
                <Route path="shopping-list" element={<div />} /> {/* Content rendered by App based on view state */}
                <Route path="operations" element={<DashboardPage />} />
            </Route>
            {/* Fallback for other paths handled by App's internal router for now */}
            <Route path="/*" element={<App />} />
        </Routes>
    );
};
