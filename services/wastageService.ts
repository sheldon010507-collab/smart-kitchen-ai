/**
 * Wastage Service
 * 
 * Handles recording and retrieving wastage records for inventory loss tracking.
 */

import { supabase } from '../lib/supabase';
import type { WastageRecord, WastageReason } from '../types';

interface RecordWastageParams {
    businessId: string;
    inventoryItemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    reason: WastageReason;
    notes?: string;
    expiryDate?: string;
    category?: string;
    userId?: string;
}

/**
 * Record a wastage event and deduct from inventory
 */
export async function recordWastage(params: RecordWastageParams): Promise<{
    success: boolean;
    error?: string;
}> {
    const {
        businessId,
        inventoryItemId,
        itemName,
        quantity,
        unit,
        unitCost,
        reason,
        notes,
        expiryDate,
        category,
        userId,
    } = params;

    try {
        // 1. Calculate days past expiry
        let daysPastExpiry: number | null = null;
        if (expiryDate) {
            const expiry = new Date(expiryDate);
            const today = new Date();
            daysPastExpiry = Math.floor((today.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24));
        }

        // 2. Insert wastage record
        const { error: insertError } = await supabase
            .from('wastage_records')
            .insert({
                business_id: businessId,
                inventory_item_id: inventoryItemId,
                item_name: itemName,
                quantity,
                unit,
                unit_cost: unitCost,
                reason,
                notes,
                expiry_date: expiryDate,
                days_past_expiry: daysPastExpiry,
                category,
                recorded_by: userId,
            });

        if (insertError) throw insertError;

        // 3. Deduct from inventory
        const { data: currentItem, error: fetchError } = await supabase
            .from('inventory_items')
            .select('quantity_value')
            .eq('id', inventoryItemId)
            .single();

        if (fetchError) {
            console.warn('[Wastage] Could not fetch inventory item:', fetchError);
            // Continue anyway, record was saved
        } else {
            const newQuantity = Math.max(0, (currentItem?.quantity_value || 0) - quantity);

            const { error: updateError } = await supabase
                .from('inventory_items')
                .update({
                    quantity_value: newQuantity,
                    quantity: `${newQuantity} ${unit}`,
                })
                .eq('id', inventoryItemId);

            if (updateError) {
                console.warn('[Wastage] Could not update inventory:', updateError);
            }
        }

        console.log(`[Wastage] Recorded: ${quantity} ${unit} of ${itemName}, loss: £${(quantity * unitCost).toFixed(2)}`);

        return { success: true };
    } catch (err: any) {
        console.error('[Wastage] Failed:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get wastage records for reporting
 */
export async function getWastageRecords(
    businessId: string,
    options?: {
        startDate?: string;
        endDate?: string;
        reason?: WastageReason;
        limit?: number;
    }
): Promise<WastageRecord[]> {
    try {
        let query = supabase
            .from('wastage_records')
            .select('*')
            .eq('business_id', businessId)
            .order('recorded_at', { ascending: false });

        if (options?.startDate) {
            query = query.gte('recorded_at', options.startDate);
        }
        if (options?.endDate) {
            query = query.lte('recorded_at', options.endDate);
        }
        if (options?.reason) {
            query = query.eq('reason', options.reason);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(row => ({
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
    } catch (err) {
        console.error('[Wastage] Failed to fetch records:', err);
        return [];
    }
}

/**
 * Get wastage statistics for dashboard
 */
export async function getWastageStats(
    businessId: string,
    days: number = 30
): Promise<{
    totalLoss: number;
    totalItems: number;
    byReason: Record<WastageReason, number>;
}> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await getWastageRecords(businessId, {
        startDate: startDate.toISOString(),
    });

    const byReason: Record<string, number> = {};
    let totalLoss = 0;

    records.forEach(r => {
        totalLoss += r.totalCost || 0;
        byReason[r.reason] = (byReason[r.reason] || 0) + (r.totalCost || 0);
    });

    return {
        totalLoss,
        totalItems: records.length,
        byReason: byReason as Record<WastageReason, number>,
    };
}
