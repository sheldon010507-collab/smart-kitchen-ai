import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

// Use vi.hoisted to share mocks
const { mockFrom, mockSelect, mockEq, mockUseAuth } = vi.hoisted(() => {
    const mockEq = vi.fn();
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    // Proper signature for mockFrom
    const mockFrom = vi.fn((_table?: any) => ({ select: mockSelect }));
    const mockUseAuth = vi.fn();
    return { mockFrom, mockSelect, mockEq, mockUseAuth };
});

// Mock AuthContext
vi.mock('../../lib/AuthContext', () => ({
    useAuthContext: mockUseAuth,
}));

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: mockFrom,
    },
}));

// Import AFTER mocks
import { BusinessProvider, useBusiness } from '../../lib/BusinessContext';

describe('BusinessContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock returns
        mockEq.mockResolvedValue({ data: [], error: null });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ select: mockSelect });

        // Default Auth: Manager
        mockUseAuth.mockReturnValue({
            user: {
                id: 'user-123',
                email: 'test@example.com',
                user_metadata: { role: 'Manager' }
            },
            loading: false
        });
    });

    it('should load businesses for manager', async () => {
        // Mock Manager Business List
        const mockBusinesses = [
            { id: 'biz-1', name: 'Test Biz', owner_id: 'user-123', join_code: 'CODE' }
        ];

        // Setup Supabase Return for 'businesses' table
        mockFrom.mockImplementation((table) => {
            if (table === 'businesses') {
                return { select: () => ({ eq: () => Promise.resolve({ data: mockBusinesses, error: null }) }) };
            }
            return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
        });

        // Wrapper
        const wrapper = ({ children }: { children: ReactNode }) => (
            <BusinessProvider>{children}</BusinessProvider>
        );

        // Render Hook
        const { result } = renderHook(() => useBusiness(), { wrapper });

        // Assert initial loading state (might be too fast to catch true, but let's see)
        // await waitFor(() => expect(result.current.loading).toBe(true)); 

        // Wait for data load
        await waitFor(() => {
            expect(result.current.businesses).toHaveLength(1);
        });

        expect(result.current.businesses[0].name).toBe('Test Biz');
    });
});
