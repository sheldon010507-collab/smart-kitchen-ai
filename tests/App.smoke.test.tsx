import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    useBusiness: vi.fn(() => ({})),
    BusinessProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../hooks/useBusinessHandlers', () => ({
    useBusinessHandlers: vi.fn(() => ({
        handleLogout: vi.fn(),
        handleSwitchBusiness: vi.fn(),
        handleOpenCreateStore: vi.fn(),
        handleOpenEditStore: vi.fn(),
        handleSaveStore: vi.fn(),
        handleDeleteStore: vi.fn(),
        handleJoinStoreSubmit: vi.fn(),
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

// Mock Recharts to avoid issues with specialized rendering
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: () => <div>Pie</div>,
    Cell: () => <div>Cell</div>,
    Tooltip: () => <div>Tooltip</div>,
    Legend: () => <div>Legend</div>,
}));

describe('App Smoke Test', () => {
    it('should render without crashing', () => {
        render(<App />);
        expect(screen.getByText(/Select Your Role/i)).toBeInTheDocument();
    });
});
