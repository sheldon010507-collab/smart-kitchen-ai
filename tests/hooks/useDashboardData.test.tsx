import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
        })),
    },
}));

describe('useDashboardData', () => {
    const businessId = 'biz_123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch shifts and menu on mount', async () => {
        // Mock responses
        const mockShifts = [{ id: 's1', business_id: businessId, status: 'in_progress' }];
        const mockMenu = [{ id: 'm1', business_id: businessId, name: 'Burger' }];

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'shifts') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: mockShifts, error: null }),
                };
            }
            if (table === 'menu_items') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockResolvedValue({ data: mockMenu, error: null }),
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
            };
        });

        const { result } = renderHook(() => useDashboardData(businessId));

        // Initial state
        expect(result.current.loading).toBe(true);
        expect(result.current.shifts).toEqual([]);
        expect(result.current.menu).toEqual([]);

        // Wait for data
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.shifts).toHaveLength(1);
        expect(result.current.menu).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed' } }),
        }));

        const { result } = renderHook(() => useDashboardData(businessId));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should catch error (implementation detail: maybe expose error state or just log it)
        // For now just ensure it doesn't crash and loading finishes
        expect(result.current.shifts).toEqual([]);
    });
});
