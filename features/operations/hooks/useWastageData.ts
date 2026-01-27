/**
 * useWastageData Hook
 * 
 * 聚合 WastageRecord 數據，計算浪費統計
 * - 總浪費金額
 * - 浪費率 (wastage cost / inventory value)
 * - 按時間範圍過濾
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { WastageRecord } from '../../../types';

interface WastageStats {
    totalWastage: number;
    wastageRate: number;
    recordCount: number;
    topReasons: Array<{ reason: string; cost: number }>;
}

export function useWastageData(businessId: string | null, days: number = 30) {
    const [wastageRecords, setWastageRecords] = useState<WastageRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!businessId) {
            setWastageRecords([]);
            setLoading(false);
            return;
        }

        loadWastageData();
    }, [businessId, days]);

    const loadWastageData = async () => {
        setLoading(true);
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const { data, error } = await supabase
                .from('wastage_records')
                .select('*')
                .eq('business_id', businessId)
                .gte('recorded_at', cutoffDate.toISOString())
                .order('recorded_at', { ascending: false });

            if (error) throw error;

            // Map snake_case to camelCase
            const records: WastageRecord[] = (data || []).map(row => ({
                id: row.id,
                businessId: row.business_id,
                inventoryItemId: row.inventory_item_id,
                itemName: row.item_name,
                quantity: row.quantity,
                unit: row.unit,
                unitCost: row.unit_cost,
                totalCost: row.total_cost,
                reason: row.reason,
                notes: row.notes,
                expiryDate: row.expiry_date,
                daysPastExpiry: row.days_past_expiry,
                category: row.category,
                recordedBy: row.recorded_by,
                recordedAt: row.recorded_at,
            }));

            setWastageRecords(records);
        } catch (err) {
            console.error('Failed to load wastage data:', err);
            setWastageRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo<WastageStats>(() => {
        const totalWastage = wastageRecords.reduce((sum, r) => sum + r.totalCost, 0);

        // Group by reason
        const reasonMap: Record<string, number> = {};
        wastageRecords.forEach(r => {
            reasonMap[r.reason] = (reasonMap[r.reason] || 0) + r.totalCost;
        });

        const topReasons = Object.entries(reasonMap)
            .map(([reason, cost]) => ({ reason, cost }))
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 3);

        return {
            totalWastage,
            wastageRate: 0, // Will be calculated in useOperationsData with inventory context
            recordCount: wastageRecords.length,
            topReasons,
        };
    }, [wastageRecords]);

    return {
        wastageRecords,
        stats,
        loading,
        refresh: loadWastageData,
    };
}
