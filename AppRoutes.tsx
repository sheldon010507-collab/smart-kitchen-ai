import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';

export const AppRoutes = () => {
    return (
        <Routes>
            {/* Legacy App Route - Catches all for now */}
            <Route path="/*" element={<App />} />
        </Routes>
    );
};
