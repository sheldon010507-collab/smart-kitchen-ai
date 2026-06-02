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

function normalizeName(value: string | null | undefined): string {
    return String(value || '').trim().toLowerCase();
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
                .select('id, name, category, quantity_value, quantity_unit, expiry_date, supplier')
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
                        supplier: item.supplier || null,
                    });
                }
            }
        }

        // 2. Check low stock items using Kitchen Wiki par_level
        if (options.includeLowStock) {
            const { data: inventoryItems, error: stockError } = await supabase
                .from('inventory_items')
                .select('id, name, category, quantity_value, quantity_unit, supplier')
                .eq('business_id', businessId);

            const { data: wikiItems, error: wikiError } = await supabase
                .from('kitchen_knowledge_items')
                .select('canonical_name, category, default_unit, par_level, kitchen_knowledge_aliases(alias)')
                .eq('business_id', businessId)
                .gt('par_level', 0);

            if (stockError) {
                errors.push(`Low stock check failed: ${stockError.message}`);
            } else if (wikiError) {
                errors.push(`Kitchen Wiki check failed: ${wikiError.message}`);
            } else if (inventoryItems) {
                // Import prediction utilities
                const { predictReorderQuantity, calculateReorderQuantity } = await import('./predictQuantity');
                const wikiByName = new Map<string, any>();
                for (const wikiItem of wikiItems || []) {
                    wikiByName.set(normalizeName(wikiItem.canonical_name), wikiItem);
                    for (const aliasRow of wikiItem.kitchen_knowledge_aliases || []) {
                        wikiByName.set(normalizeName(aliasRow.alias), wikiItem);
                    }
                }

                for (const item of inventoryItems) {
                    const wikiItem = wikiByName.get(normalizeName(item.name));
                    const parLevel = Number(wikiItem?.par_level || 0);

                    // Skip if quantity is above Kitchen Wiki par level
                    if (parLevel <= 0 || (item.quantity_value || 0) >= parLevel) {
                        continue;
                    }

                    if (shouldSkip(item.id, existingMap, options.mergeStrategy)) {
                        skipped++;
                        continue;
                    }

                    // Skip if already added from expiring check
                    if (items.some(i => i.inventory_item_id === item.id)) {
                        continue;
                    }

                    const unit = item.quantity_unit || 'pcs';
                    const category = item.category || wikiItem?.category || null;

                    // Use historical prediction (passes unit and category for optimization)
                    const predictedQty = await predictReorderQuantity(
                        supabase, businessId, item.name, unit, category
                    );

                    // Calculate final restock quantity
                    const restockQty = calculateReorderQuantity(
                        predictedQty,
                        item.quantity_value || 0,
                        parLevel,
                        unit,
                        category
                    );

                    items.push({
                        inventory_item_id: item.id,
                        item_name: item.name,
                        category: category,
                        quantity_needed: restockQty,
                        unit: unit,
                        reason: 'low_stock',
                        priority: getStockPriority(item.quantity_value || 0),
                        supplier: item.supplier || null,
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
