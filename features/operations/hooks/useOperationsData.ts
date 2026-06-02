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
import { useAuthContext } from '../../../lib/AuthContext';
import { useWastageData } from './useWastageData';
import { useBatchRecipeCosting } from './useBatchRecipeCosting';
import { menuService } from '../../menu/services/menuService';

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
    const { user } = useAuthContext();
    const {
        shifts,
        staff,
        menu,
        prepTasks,
        setPrepTasks,
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

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6586675c-9966-46a3-ac5d-1d79fea93820',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOperationsData.ts:stats',message:'Avg Food Cost calc',data:{menuLen:menu.length,menuItemsWithCostsLen:menuItemsWithCosts.length,avgFoodCost:avgCost,sampleCosts:Object.fromEntries(Object.entries(menuCosts).slice(0,3))},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion

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
        prepTasks,
        inventory,
        currentBusinessId,

        // 計算數據
        stats,
        pendingStaff,
        activeStaff,


        // 操作方法
        setShifts,
        // setMenu, // Create custom handlers instead
        refreshDashboard,

        handleAddPrepTask: async (text: string) => {
            if (!currentBusinessId) return;
            const taskText = text.trim();
            if (!taskText) return;

            const { supabase } = await import('../../../lib/supabase');
            const { data, error } = await supabase
                .from('prep_tasks')
                .insert({
                    business_id: currentBusinessId,
                    task_text: taskText,
                    completed: false,
                    task_date: new Date().toISOString().split('T')[0],
                    priority: 1,
                    created_by: user?.id ?? null
                })
                .select('*')
                .single();

            if (error) {
                console.error('Failed to add prep task:', error);
                alert('Failed to add prep task');
                return;
            }

            setPrepTasks(prev => [...prev, {
                id: data.id,
                businessId: data.business_id,
                taskText: data.task_text,
                completed: data.completed,
                taskDate: data.task_date,
                priority: data.priority,
                createdAt: data.created_at,
                assignedTo: data.assigned_to,
                completedAt: data.completed_at,
                completedBy: data.completed_by,
                createdBy: data.created_by
            }]);
        },

        handleDeletePrepTask: async (id: string) => {
            if (!currentBusinessId) return;

            const { supabase } = await import('../../../lib/supabase');
            const { error } = await supabase
                .from('prep_tasks')
                .delete()
                .eq('id', id)
                .eq('business_id', currentBusinessId);

            if (error) {
                console.error('Failed to delete prep task:', error);
                alert('Failed to delete prep task');
                return;
            }

            setPrepTasks(prev => prev.filter(t => t.id !== id));
        },

        // Menu Persistence Handlers
        handleAddMenuItem: async (item: any) => {
            if (!currentBusinessId) return;
            try {
                // Separation of concerns: item vs ingredients
                const { ingredients, ...menuItemData } = item;
                const ingredientsList = ingredients?.map((ing: any) => ({
                    inventoryItemId: ing.id || ing.inventoryItemId,
                    quantity: ing.qty || ing.quantityUsed,
                    unit: ing.unit || ing.unitUsed,
                    cost: ing.cost || ing.costSnapshot || 0
                })) || [];

                await menuService.createMenuItem(currentBusinessId, menuItemData, ingredientsList);
                await refreshDashboard();
            } catch (error) {
                console.error('Failed to create menu item:', error);
                alert('Failed to save menu item');
            }
        },

        handleUpdateMenuItem: async (item: any) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6586675c-9966-46a3-ac5d-1d79fea93820',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOperationsData.ts:handleUpdateMenuItem',message:'Edit started',data:{itemId:item?.id,hasIngredients:!!item?.ingredients,ingredientsLen:item?.ingredients?.length},timestamp:Date.now(),hypothesisId:'B2'})}).catch(()=>{});
            // #endregion
            try {
                // Separation of concerns: item vs ingredients
                const { ingredients, ...menuItemData } = item;

                // If ingredients are present, format them for the service
                let ingredientsList;
                if (ingredients) {
                    ingredientsList = ingredients.map((ing: any) => ({
                        inventoryItemId: ing.id || ing.inventoryItemId,
                        quantity: ing.qty || ing.quantityUsed,
                        unit: ing.unit || ing.unitUsed,
                        cost: ing.cost || ing.costSnapshot || 0
                    }));
                }

                await menuService.updateMenuItem(item.id, menuItemData, ingredientsList);
                await refreshDashboard();
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6586675c-9966-46a3-ac5d-1d79fea93820',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOperationsData.ts:handleUpdateMenuItem',message:'Edit success',data:{itemId:item?.id},timestamp:Date.now(),hypothesisId:'B2'})}).catch(()=>{});
                // #endregion
            } catch (error) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6586675c-9966-46a3-ac5d-1d79fea93820',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOperationsData.ts:handleUpdateMenuItem',message:'Edit error',data:{itemId:item?.id,err:String(error)},timestamp:Date.now(),hypothesisId:'B2'})}).catch(()=>{});
                // #endregion
                console.error('Failed to update menu item:', error);
                alert('Failed to update menu item');
            }
        },

        handleDeleteMenuItem: async (id: string) => {
            if (!confirm('Are you sure you want to delete this item?')) return;
            try {
                await menuService.deleteMenuItem(id);
                await refreshDashboard();
            } catch (error) {
                console.error('Failed to delete menu item:', error);
                alert('Failed to delete menu item');
            }
        },
    };
}
