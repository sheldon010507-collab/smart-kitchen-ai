/**
 * Dictionary Service
 * 
 * Provides smart RAG dictionary loading for inventory scanning.
 * Returns commonly used items for better AI matching.
 */

import { supabase } from '../../../lib/supabase';
import type { DictionaryItem } from '../types';

/**
 * Get smart dictionary for a business
 * 
 * Returns items that are:
 * - Currently in stock (quantity > 0), OR
 * - Recently updated (last 30 days)
 * 
 * Limited to maxItems for token efficiency
 */
export async function getSmartDictionary(
    businessId: string,
    maxItems: number = 30
): Promise<DictionaryItem[]> {
    // 🆕 Early return if no businessId (avoid invalid query)
    if (!businessId || businessId.trim() === '') {
        console.warn('[DictionaryService] No businessId provided, returning empty dictionary');
        return [];
    }

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
            .from('inventory_items')
            .select('id, name, quantity_unit, quantity_value, category')
            .eq('business_id', businessId)
            .or(`quantity_value.gt.0,updated_at.gte.${thirtyDaysAgo.toISOString()}`)
            .order('updated_at', { ascending: false })
            .limit(maxItems);

        if (error) {
            console.error('[DictionaryService] Query failed:', error);
            return []; // Return empty, don't block the flow
        }

        return (data || []).map(item => ({
            id: item.id,
            name: item.name,
            unit: item.quantity_unit || 'pcs',
            currentQty: item.quantity_value || 0,
            category: item.category,
        }));
    } catch (err) {
        console.error('[DictionaryService] Error:', err);
        return [];
    }
}

/**
 * Get all dictionary item names as string array
 * (for backward compatibility with existing code)
 */
export async function getDictionaryNames(
    businessId: string,
    maxItems: number = 50
): Promise<string[]> {
    const items = await getSmartDictionary(businessId, maxItems);
    return items.map(item => item.name);
}
