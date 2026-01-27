/**
 * useOperationsData Hook
 * 
 * 統一的 Operations Dashboard 數據層
 * - 聚合所有數據源（staff, shifts, menu, inventory）
 * - 計算衍生狀態（stats）
 * - 提供單一真相來源
 */

import { useMemo } from 'react';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { useBusiness } from '../../../lib/BusinessContext';
import { useInventoryContext } from '../../../lib/InventoryContext';
import { useWastageData } from './useWastageData';
import { useBatchRecipeCosting } from './useBatchRecipeCosting';

export interface OperationsStats {
    totalLaborCost: number;
    totalInventoryValue: number;
    totalWastage: number;
    avgFoodCost: number;
    wastageRate: number;
    staffCount: number;
    activeShifts: number;
    menuItems: number;
}

export function useOperationsData() {
    const { currentBusinessId } = useBusiness();
    const {
        shifts,
        staff,
        menu,
        setShifts,
        setMenu,
        refreshDashboard
    } = useDashboardData(currentBusinessId);
    const { inventory } = useInventoryContext();
    const { stats: wastageStats, loading: wastageLoading } = useWastageData(currentBusinessId);
    const { menuCosts } = useBatchRecipeCosting(menu, inventory);

    // 計算統計數據
    const stats = useMemo<OperationsStats>(() => {
        // Inventory Value (COGS indicator)
        const inventoryValue = inventory.reduce((sum, item) => {
            const q = item.quantityValue || parseFloat(item.quantity) || 0;
            const cost = item.unitCost || 0;
            return sum + (q * cost);
        }, 0);

        // Menu Food Cost % (Dynamic - based on real-time inventory prices)
        const menuItemsWithCosts = menu.filter(m => {
            const realCost = menuCosts[m.id];
            return m.sellingPrice > 0 && realCost !== null && realCost > 0;
        });

        const avgCost = menuItemsWithCosts.length > 0
            ? menuItemsWithCosts.reduce((sum, m) => {
                const realCost = menuCosts[m.id] || 0;
                return sum + (realCost / m.sellingPrice);
            }, 0) / menuItemsWithCosts.length
            : 0;

        // Wastage metrics
        const totalWastage = wastageStats.totalWastage;
        const wastageRate = inventoryValue > 0 ? totalWastage / inventoryValue : 0;

        return {
            totalLaborCost: shifts.reduce((sum, s) => sum + (s.totalCost || 0), 0),
            totalInventoryValue: inventoryValue,
            totalWastage,
            avgFoodCost: avgCost,
            wastageRate,
            staffCount: staff.length,
            activeShifts: shifts.filter(s => s.status === 'in_progress').length,
            menuItems: menu.length,
        };
    }, [shifts, staff, menu, inventory, wastageStats, menuCosts]);

    // 過濾員工狀態
    const pendingStaff = useMemo(
        () => staff.filter(s => String(s.status || '').toLowerCase() === 'pending'),
        [staff]
    );

    const activeStaff = useMemo(
        () => staff.filter(s => String(s.status || '').toLowerCase() === 'active'),
        [staff]
    );

    return {
        // 原始數據
        staff,
        shifts,
        menu,
        inventory,
        currentBusinessId,

        // 計算數據
        stats,
        pendingStaff,
        activeStaff,

        // 操作方法
        setShifts,
        setMenu,
        refreshDashboard,
    };
}
