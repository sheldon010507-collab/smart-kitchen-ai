/**
 * Auto-generate shopping list items based on inventory status
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    AutoGenerateOptions,
    GeneratedShoppingItem,
    AutoGenerateResult,
    ShoppingListReason,
    ShoppingListPriority
} from '../types';

/**
 * Check if item should be skipped based on merge strategy
 */
function shouldSkip(
    itemId: string,
    existingMap: Map<string, number>,
    strategy: 'skip' | 'update' | 'add_new'
): boolean {
    if (strategy === 'add_new') return false;
    return existingMap.has(itemId);
}

/**
 * Calculate priority based on days until expiry
 */
function getExpiryPriority(daysUntilExpiry: number): ShoppingListPriority {
    if (daysUntilExpiry <= 1) return 'urgent';
    if (daysUntilExpiry <= 3) return 'normal';
    return 'low';
}

/**
 * Calculate priority based on stock level
 */
function getStockPriority(currentQty: number): ShoppingListPriority {
    return currentQty === 0 ? 'urgent' : 'normal';
}

/**
 * Generate shopping list items from inventory analysis
 * 
 * Algorithm:
 * 1. EXPIRING ITEMS: Find items expiring within threshold days
 *    - Priority based on days remaining
 *    - Quantity = current stock (for replacement)
 * 
 * 2. LOW STOCK ITEMS: Find items below minimum threshold
 *    - Priority urgent if zero stock
 *    - Quantity = min_qty - current_qty
 * 
 * 3. PREP REQUIRED: Phase 2 implementation
 */
export async function generateShoppingList(
    businessId: string,
    options: AutoGenerateOptions,
    supabase: SupabaseClient
): Promise<AutoGenerateResult> {
    const items: GeneratedShoppingItem[] = [];
    const errors: string[] = [];
    let skipped = 0;

    try {
        // Get existing pending items to check for duplicates
        const { data: existingItems, error: existingError } = await supabase
            .from('shopping_list')
            .select('inventory_item_id, quantity_needed')
            .eq('business_id', businessId)
            .eq('status', 'pending')
            .not('inventory_item_id', 'is', null);

        if (existingError) {
            errors.push(`Failed to fetch existing items: ${existingError.message}`);
        }

        const existingMap = new Map<string, number>(
            existingItems?.map(i => [i.inventory_item_id, i.quantity_needed]) ?? []
        );

        // 1. Check expiring items
        if (options.includeExpiring) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + options.expiryThresholdDays);
            const expiryDateStr = expiryDate.toISOString().split('T')[0];

            const { data: expiringItems, error: expiryError } = await supabase
                .from('inventory_items')
                .select('id, name, category, quantity_value, quantity_unit, expiry_date')
                .eq('business_id', businessId)
                .lte('expiry_date', expiryDateStr)
                .gt('quantity_value', 0);

            if (expiryError) {
                errors.push(`Failed to fetch expiring items: ${expiryError.message}`);
            } else if (expiringItems) {
                for (const item of expiringItems) {
                    if (shouldSkip(item.id, existingMap, options.mergeStrategy)) {
                        skipped++;
                        continue;
                    }

                    // Calculate days until expiry
                    const expiryDateObj = new Date(item.expiry_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    expiryDateObj.setHours(0, 0, 0, 0);
                    const daysUntilExpiry = Math.ceil(
                        (expiryDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    items.push({
                        inventory_item_id: item.id,
                        item_name: item.name,
                        category: item.category || null,
                        quantity_needed: item.quantity_value || 1,
                        unit: item.quantity_unit || 'pcs',
                        reason: 'expiring',
                        priority: getExpiryPriority(daysUntilExpiry),
                    });
                }
            }
        }

        // 2. Check low stock items
        // Note: This requires a min_quantity field in inventory_items
        // If not available, we'll skip this phase
        if (options.includeLowStock) {
            // Check if min_quantity column exists by attempting query
            const { data: lowStockItems, error: stockError } = await supabase
                .from('inventory_items')
                .select('id, name, category, quantity_value, quantity_unit')
                .eq('business_id', businessId)
                .lte('quantity_value', 2); // Simple low stock check if min_quantity not available

            if (stockError) {
                // Column might not exist, skip this phase
                errors.push(`Low stock check skipped: ${stockError.message}`);
            } else if (lowStockItems) {
                for (const item of lowStockItems) {
                    if (shouldSkip(item.id, existingMap, options.mergeStrategy)) {
                        skipped++;
                        continue;
                    }

                    // Skip if already added from expiring check
                    if (items.some(i => i.inventory_item_id === item.id)) {
                        continue;
                    }

                    // Basic restock quantity (could be enhanced with historical data)
                    const restockQty = Math.max(5, 10 - (item.quantity_value || 0));

                    items.push({
                        inventory_item_id: item.id,
                        item_name: item.name,
                        category: item.category || null,
                        quantity_needed: restockQty,
                        unit: item.quantity_unit || 'pcs',
                        reason: 'low_stock',
                        priority: getStockPriority(item.quantity_value || 0),
                    });
                }
            }
        }

        // 3. Prep required - Phase 2
        if (options.includePrepRequired) {
            errors.push('Prep-based generation not yet implemented (Phase 2)');
        }

    } catch (err: any) {
        errors.push(`Unexpected error: ${err.message}`);
    }

    return { items, skipped, errors };
}

/**
 * Insert generated items into shopping_list table
 */
export async function insertGeneratedItems(
    businessId: string,
    items: GeneratedShoppingItem[],
    userId: string,
    supabase: SupabaseClient
): Promise<{ inserted: number; errors: string[] }> {
    const errors: string[] = [];
    let inserted = 0;

    for (const item of items) {
        const { error } = await supabase.from('shopping_list').insert({
            business_id: businessId,
            inventory_item_id: item.inventory_item_id,
            item_name: item.item_name,
            category: item.category,
            quantity_needed: item.quantity_needed,
            unit: item.unit,
            reason: item.reason,
            priority: item.priority,
            status: 'pending',
            created_by: userId,
        });

        if (error) {
            // Unique constraint violation = already exists, skip silently
            if (error.code === '23505') {
                continue;
            }
            errors.push(`Failed to insert ${item.item_name}: ${error.message}`);
        } else {
            inserted++;
        }
    }

    return { inserted, errors };
}
