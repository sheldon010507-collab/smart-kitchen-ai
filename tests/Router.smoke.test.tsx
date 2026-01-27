import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../AppRoutes';

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        },
        from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(), limit: vi.fn() })) })) })),
    }
}));

// Mock LoginPage to avoid rendering real one (which also imports Supabase)
vi.mock('../pages/LoginPage', () => ({
    LoginPage: () => <div data-testid="login-page">Login Page</div>
}));

// Reuse mocks from App.smoke.test.tsx (mocking App is enough?)
// If AppRoutes renders App, and App is huge, we might want to mock App to just test routing.
vi.mock('../App', () => ({
    default: () => <div data-testid="legacy-app">Legacy App</div>
}));

describe('Router Integration', () => {
    it('should render Legacy App at root path', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <AppRoutes />
            </MemoryRouter>
        );
        expect(screen.getByTestId('legacy-app')).toBeInTheDocument();
        expect(screen.getByText('Legacy App')).toBeInTheDocument();
    });

    it('should fall back to Legacy App for unknown routes', () => {
        render(
            <MemoryRouter initialEntries={['/unknown/route']}>
                <AppRoutes />
            </MemoryRouter>
        );
        expect(screen.getByTestId('legacy-app')).toBeInTheDocument();
    });
});
