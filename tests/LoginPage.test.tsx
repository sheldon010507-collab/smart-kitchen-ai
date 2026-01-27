import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';

// Mock SupabaseLogin to avoid complex internal logic and Supabase calls
// We just want to test that LoginPage handles the success callback correctly
vi.mock('../components/SupabaseLogin', () => ({
    default: ({ onLoginSuccess }: { onLoginSuccess: (u: any, r: string) => void }) => (
        <button
            data-testid="login-btn"
            onClick={() => onLoginSuccess({ id: 'test-user' }, 'Manager')}
        >
            Mock Login
        </button>
    )
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual('react-router-dom')),
    useNavigate: () => mockNavigate
}));

describe('LoginPage', () => {
    it('should render SupabaseLogin', () => {
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );
        expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    });

    it('should navigate to /dashboard on login success', async () => {
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        screen.getByTestId('login-btn').click();

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });
});
