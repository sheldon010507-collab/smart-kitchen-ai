import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../AppRoutes';

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
