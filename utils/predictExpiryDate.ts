/**
 * Predict Expiry Date based on historical data
 * 
 * Logic:
 * 1. Find same item in history
 * 2. Calculate average shelf life (expiry_date - added_date)
 * 3. Return today + average shelf life
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// Default shelf life by category (days)
const DEFAULT_SHELF_LIFE: Record<string, number> = {
    'dairy': 7,
    'produce': 5,
    'meat': 3,
    'seafood': 2,
    'fresh': 5,
    'frozen': 90,
    'dry goods': 180,
    'beverages': 30,
    'condiments': 90,
    'bakery': 3,
    'default': 7
};

/**
 * Predict expiry date for an item based on historical data
 */
export async function predictExpiryDate(
    supabase: SupabaseClient,
    businessId: string,
    itemName: string,
    category?: string | null
): Promise<Date> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // Query historical items with same name
        const { data, error } = await supabase
            .from('inventory_items')
            .select('added_date, expiry_date')
            .eq('business_id', businessId)
            .ilike('name', itemName)
            .not('expiry_date', 'is', null)
            .not('added_date', 'is', null)
            .order('added_date', { ascending: false })
            .limit(10);

        if (error || !data || data.length === 0) {
            // No history, use category default
            return getDefaultExpiryDate(today, category);
        }

        // Calculate average shelf life
        let totalDays = 0;
        let validCount = 0;

        for (const item of data) {
            const addedDate = new Date(item.added_date);
            const expiryDate = new Date(item.expiry_date);
            const shelfLifeDays = Math.round(
                (expiryDate.getTime() - addedDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Only count reasonable values (1-365 days)
            if (shelfLifeDays > 0 && shelfLifeDays <= 365) {
                totalDays += shelfLifeDays;
                validCount++;
            }
        }

        if (validCount === 0) {
            return getDefaultExpiryDate(today, category);
        }

        const avgShelfLife = Math.round(totalDays / validCount);
        const predictedExpiry = new Date(today);
        predictedExpiry.setDate(predictedExpiry.getDate() + avgShelfLife);

        console.log(`[predictExpiryDate] ${itemName}: avg shelf life = ${avgShelfLife} days`);

        return predictedExpiry;
    } catch (err) {
        console.error('[predictExpiryDate] Error:', err);
        return getDefaultExpiryDate(today, category);
    }
}

/**
 * Get default expiry date based on category
 */
function getDefaultExpiryDate(today: Date, category?: string | null): Date {
    const lowerCategory = category?.toLowerCase() || 'default';

    // Find matching category
    let shelfLife = DEFAULT_SHELF_LIFE['default'];
    for (const [key, days] of Object.entries(DEFAULT_SHELF_LIFE)) {
        if (lowerCategory.includes(key)) {
            shelfLife = days;
            break;
        }
    }

    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + shelfLife);
    return expiryDate;
}

/**
 * Format date to YYYY-MM-DD for input fields
 */
export function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Batch predict for multiple items
 */
export async function predictExpiryDateBatch(
    supabase: SupabaseClient,
    businessId: string,
    items: Array<{ name: string; category?: string | null }>
): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const item of items) {
        const expiry = await predictExpiryDate(supabase, businessId, item.name, item.category);
        results.set(item.name, formatDateForInput(expiry));
    }

    return results;
}
