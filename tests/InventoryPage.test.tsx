import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryPage } from '../pages/InventoryPage';

// Mock Dependencies
vi.mock('../lib/BusinessContext', () => ({
    useBusiness: () => ({
        activeBusiness: { id: 'biz-1', name: 'Test Biz', customCategories: [], customLocations: [] },
        isMasterView: false,
        refreshBusinesses: vi.fn(),
        currentBusinessId: 'biz-1'
    })
}));

vi.mock('../lib/AuthContext', () => ({
    useAuthContext: () => ({
        user: { id: 'user-1', email: 'manager@example.com', user_metadata: { role: 'Manager' } },
    }),
}));

vi.mock('../lib/InventoryContext', () => ({
    useInventoryContext: () => ({
        inventory: [{ id: 'item-1', name: 'Carrot', businessId: 'biz-1' }],
        deleteItem: vi.fn(),
        updateItem: vi.fn(),
        addItems: vi.fn(),
        loadInventory: vi.fn(),
        addItemsWithDbCheck: vi.fn(),
    })
}));

vi.mock('react-router-dom', () => ({
    useOutletContext: () => ({
        onOpenScanner: vi.fn()
    }),
    useNavigate: vi.fn()
}));

// Mock Child Components to avoid deep rendering
vi.mock('../features/inventory/InventoryView', () => ({
    InventoryView: ({ onAddItem, onEditInventoryItem }: any) => (
        <div>
            <div data-testid="inventory-view">Inventory View</div>
            <button data-testid="add-btn" onClick={onAddItem}>Add Item</button>
            <button data-testid="edit-btn" onClick={() => onEditInventoryItem({ id: 'item-1' })}>Edit Item</button>
        </div>
    )
}));

vi.mock('../components/EditItemModal', () => ({
    default: ({ isOpen }: any) => isOpen ? <div data-testid="edit-modal">Edit Modal</div> : null
}));

vi.mock('../components/WastageModal', () => ({
    default: ({ item }: any) => item ? <div data-testid="wastage-modal">Wastage Modal</div> : null
}));

vi.mock('../components/setup', () => ({
    InventorySetupWizard: () => <div>Setup Wizard</div>,
    DraftInventoryItem: {},
    MergeStrategy: {}
}));

vi.mock('../components/modals/MetaManagerModal', () => ({
    MetaManagerModal: () => <div>Meta Manager</div>
}));

// Mock supabase to avoid errors in InventoryPage imports
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => ({ data: {}, error: null })) })) }))
        }))
    }
}));

describe('InventoryPage', () => {
    it('should render InventoryView', () => {
        render(<InventoryPage />);
        expect(screen.getByTestId('inventory-view')).toBeInTheDocument();
    });

    it('should open EditItemModal when requested', () => {
        render(<InventoryPage />);
        fireEvent.click(screen.getByTestId('edit-btn'));
        expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
    });
});
