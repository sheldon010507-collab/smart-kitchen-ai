import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from '../App';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({ data: [], error: null })),
        })),
    },
}));

// Mock Contexts and Hooks that App.tsx expects to be provided or uses
vi.mock('../lib/AuthContext', () => ({
    useAuthContext: vi.fn(() => ({
        user: null, // Default to null (unauthenticated) for redirect test
    })),
}));

vi.mock('../lib/InventoryContext', () => ({
    useInventoryContext: vi.fn(() => ({
        inventory: [],
        loadInventory: vi.fn(),
        addItems: vi.fn(),
        deleteItem: vi.fn(),
        clearInventoryForBusiness: vi.fn(),
    })),
}));

vi.mock('../lib/BusinessContext', () => ({
    useBusiness: vi.fn(() => ({
        activeBusiness: null,
        accessibleBusinesses: [],
        currentBusinessId: null,
        setCurrentBusinessId: vi.fn(),
        staffMemberships: [],
        isMasterView: false,
    })),
    BusinessProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../hooks/useBusinessHandlers', () => ({
    useBusinessHandlers: vi.fn(() => ({
        handleLogout: vi.fn(),
        handleSwitchBusiness: vi.fn(),
    })),
}));

vi.mock('../features/shopping-list', () => ({
    useShoppingListSummary: vi.fn(() => ({
        summaries: [],
        loading: false
    })),
    ShoppingListView: () => <div>ShoppingListView</div>,
    ShoppingListSummary: () => <div>ShoppingListSummary</div>,
    FEATURE_SHOPPING_LIST_ENABLED: true
}));

vi.mock('../hooks/useTheme', () => ({
    useTheme: vi.fn(() => ({
        theme: 'light',
        toggleTheme: vi.fn(),
    })),
}));

// Mock Recharts to avoid issues with specialized rendering
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: () => <div>Pie</div>,
    Cell: () => <div>Cell</div>,
    Tooltip: () => <div>Tooltip</div>,
    Legend: () => <div>Legend</div>,
}));

// Mock all child components to isolate App logic failure
vi.mock('../components/ChefView', () => ({ default: () => <div>ChefView</div> }));
vi.mock('../components/PrivacyPolicyPage', () => ({ default: () => <div>PrivacyPolicyPage</div> }));
vi.mock('../components/SubscriptionView', () => ({ SubscriptionView: () => <div>SubscriptionView</div> }));
vi.mock('../components/MobileNav', () => ({ default: () => <div>MobileNav</div> }));
vi.mock('../components/layout/DesktopSidebar', () => ({ DesktopSidebar: () => <div>DesktopSidebar</div> }));
vi.mock('../components/layout/MobileHeader', () => ({ MobileHeader: () => <div>MobileHeader</div> }));
vi.mock('../components/ErrorBoundary', () => ({ ErrorBoundary: ({ children }: any) => <div>{children}</div> }));
vi.mock('../utils/storageUtils', () => ({ sanitizeStorage: vi.fn() }));

describe('App Smoke Test', () => {
    it('should redirect to /login if not authenticated', () => {
        // App now redirects to /login if !user.
        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });
});

