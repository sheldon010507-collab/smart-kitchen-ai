import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../../pages/DashboardPage';
// Import the hook to access the mock
import { useBusiness } from '../../lib/BusinessContext';
import { useAuthContext } from '../../lib/AuthContext';

// Mock contexts
vi.mock('../../lib/AuthContext', () => ({
    useAuthContext: vi.fn(),
    AuthProvider: ({ children }: { children: any }) => <div>{children}</div>
}));

vi.mock('../../lib/BusinessContext', () => ({
    useBusiness: vi.fn(() => ({
        activeBusiness: { id: 'biz_1', name: 'Test Biz', accessRole: 'Manager' },
        currentBusinessId: 'biz_1',
        isMasterView: false,
        businesses: [],
        // Add setters to avoid destructuring errors if DashboardPage uses them
        setCurrentBusinessId: vi.fn(),
        setBusinesses: vi.fn(),
        createBusiness: vi.fn(),
        updateBusiness: vi.fn(),
        deleteBusiness: vi.fn(),
        joinBusinessByCode: vi.fn(),
    })),
    BusinessProvider: ({ children }: { children: any }) => <div>{children}</div>
}));

vi.mock('../../lib/InventoryContext', () => ({
    useInventoryContext: vi.fn(() => ({
        inventory: [],
        addItems: vi.fn(),
    })),
}));

vi.mock('../../hooks/useDashboardData', () => ({
    useDashboardData: vi.fn(() => ({
        shifts: [],
        menu: [],
        prepTasks: [],
        loading: false,
        refreshDashboard: vi.fn(),
    })),
}));

vi.mock('../../features/shopping-list', () => ({
    useShoppingListSummary: vi.fn(() => ({
        summaries: [],
        loading: false
    }))
}));

// Mock child components
vi.mock('../../features/operations', () => ({
    OperationsPage: () => <div>OperationsPage Mock</div>
}));
vi.mock('../../features/dashboard/MasterDashboard', () => ({
    MasterDashboard: () => <div>MasterDashboard Mock</div>
}));
vi.mock('../../features/dashboard/StaffDashboard', () => ({
    StaffDashboard: () => <div>StaffDashboard Mock</div>
}));
vi.mock('../../components/StoreModal', () => ({
    default: ({ isOpen }: any) => isOpen ? <div>StoreModal Mock</div> : null
}));
vi.mock('../../components/modals/JoinStoreModal', () => ({
    JoinStoreModal: ({ isOpen }: any) => isOpen ? <div>JoinStoreModal Mock</div> : null
}));
vi.mock('../../components/modals/TemplateOnboardingModal', () => ({
    default: ({ isOpen }: any) => isOpen ? <div>TemplateOnboardingModal Mock</div> : null
}));
vi.mock('../../components/ChefView', () => ({
    default: () => <div>ChefView Mock</div>
}));


describe('DashboardPage', () => {
    it('should render OperationsPage for Manager with Business', () => {
        (useAuthContext as any).mockReturnValue({
            user: { id: 'u1', user_metadata: { role: 'Manager' } }
        });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        expect(screen.getByText('OperationsPage Mock')).toBeInTheDocument();
    });

    it('should render MasterDashboard for Manager without Business', () => {
        (useAuthContext as any).mockReturnValue({
            user: { id: 'u1', user_metadata: { role: 'Manager' } }
        });

        // Override BusinessContext for this test
        (useBusiness as any).mockReturnValue({
            activeBusiness: null,
            currentBusinessId: null,
            isMasterView: true,
            businesses: [],
            setCurrentBusinessId: vi.fn(),
            setBusinesses: vi.fn(),
        });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        expect(screen.getByText('MasterDashboard Mock')).toBeInTheDocument();
    });

    it('should open JoinStoreModal when url has ?join=true', () => {
        (useAuthContext as any).mockReturnValue({
            user: { id: 'u2', user_metadata: { role: 'Staff' } }
        });
        (useBusiness as any).mockReturnValue({
            activeBusiness: { id: 'biz_1' },
            currentBusinessId: 'biz_1',
            isMasterView: false,
            businesses: [],
            setCurrentBusinessId: vi.fn(),
        });

        render(
            <MemoryRouter initialEntries={['/dashboard?join=true']}>
                <DashboardPage />
            </MemoryRouter>
        );

        // Check if JoinStoreModal Mock is rendered
        expect(screen.getByText('JoinStoreModal Mock')).toBeInTheDocument();
    });

    it('should NOT open JoinStoreModal by default', () => {
        (useAuthContext as any).mockReturnValue({
            user: { id: 'u2', user_metadata: { role: 'Staff' } }
        });
        (useBusiness as any).mockReturnValue({
            activeBusiness: { id: 'biz_1' },
            currentBusinessId: 'biz_1',
            isMasterView: false,
            businesses: [], // Added missing businesses
        });

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <DashboardPage />
            </MemoryRouter>
        );

        expect(screen.queryByText('JoinStoreModal Mock')).not.toBeInTheDocument();
    });
});
