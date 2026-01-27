/**
 * usePrepTaskActions Hook
 * 
 * 處理 Prep Task 的完成邏輯，包括庫存自動扣減
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { PrepTask } from '../../../types';

interface InventoryDeduction {
    inventoryItemId: string;
    quantityUsed: number;
}

export function usePrepTaskActions(onSuccess?: () => void | Promise<void>) {
    const [loading, setLoading] = useState(false);

    /**
     * 完成 Prep Task 並自動扣減庫存
     * 
     * @param task - 要完成的任務
     * @param deductions - 可選的庫存扣減列表
     * @param userId - 完成任務的用戶 ID
     */
    const completeTask = useCallback(async (
        task: PrepTask,
        deductions: InventoryDeduction[] = [],
        userId?: string
    ) => {
        setLoading(true);
        try {
            // 1. 標記任務為完成
            const { error: taskError } = await supabase
                .from('prep_tasks')
                .update({
                    completed: true,
                    completed_at: new Date().toISOString(),
                    completed_by: userId || null,
                })
                .eq('id', task.id);

            if (taskError) throw taskError;

            // 2. 如果有庫存扣減，執行扣減
            if (deductions.length > 0) {
                for (const deduction of deductions) {
                    // 2a. 獲取當前庫存
                    const { data: inventoryData, error: fetchError } = await supabase
                        .from('inventory')
                        .select('quantity, quantity_value, quantity_unit')
                        .eq('id', deduction.inventoryItemId)
                        .single();

                    if (fetchError) {
                        console.error(`Failed to fetch inventory ${deduction.inventoryItemId}:`, fetchError);
                        continue;
                    }

                    // 2b. 計算新的數量
                    const currentQty = inventoryData.quantity_value || parseFloat(inventoryData.quantity) || 0;
                    const newQty = Math.max(0, currentQty - deduction.quantityUsed);

                    // 2c. 更新庫存
                    const { error: updateError } = await supabase
                        .from('inventory')
                        .update({
                            quantity_value: newQty,
                            quantity: `${newQty}`,
                        })
                        .eq('id', deduction.inventoryItemId);

                    if (updateError) {
                        console.error(`Failed to update inventory ${deduction.inventoryItemId}:`, updateError);
                        continue;
                    }

                    // 2d. 記錄影響（如果有 prep_task_inventory_impacts 表）
                    try {
                        await supabase
                            .from('prep_task_inventory_impacts')
                            .insert({
                                prep_task_id: task.id,
                                inventory_item_id: deduction.inventoryItemId,
                                quantity_used: deduction.quantityUsed,
                                unit: inventoryData.quantity_unit || 'unit',
                                recorded_at: new Date().toISOString(),
                            });
                    } catch (impactError) {
                        // 如果表不存在，忽略錯誤（優雅降級）
                        console.warn('prep_task_inventory_impacts table may not exist:', impactError);
                    }
                }
            }

            await onSuccess?.();
        } catch (err) {
            console.error('Failed to complete prep task:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [onSuccess]);

    /**
     * 取消完成狀態（撤銷操作）
     */
    const uncompleteTask = useCallback(async (taskId: string) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('prep_tasks')
                .update({
                    completed: false,
                    completed_at: null,
                    completed_by: null,
                })
                .eq('id', taskId);

            if (error) throw error;

            await onSuccess?.();
        } catch (err) {
            console.error('Failed to uncomplete prep task:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [onSuccess]);

    return {
        completeTask,
        uncompleteTask,
        loading,
    };
}
