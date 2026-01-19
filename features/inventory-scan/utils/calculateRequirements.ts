/**
 * Core Algorithm: Calculate Prep and Shopping Requirements
 * 
 * Execution order:
 * 1. Calculate all prep item gaps (par_level - current_qty)
 * 2. Convert prep gaps to raw material demand
 * 3. Calculate raw material shopping gaps
 */

import { SKUWithState, PrepRequirement, ShoppingTask, RequirementCalculation } from '../types';

/**
 * Calculate prep and shopping requirements from inventory state
 */
export function calculateRequirements(
    rawItems: SKUWithState[],
    prepItems: SKUWithState[]
): RequirementCalculation {
    const prepList: PrepRequirement[] = [];
    const shoppingList: ShoppingTask[] = [];

    // Temporary map: accumulate raw material demand
    const rawMaterialDemand: Map<string, number> = new Map();

    // Initialize all raw material demand to 0
    rawItems.forEach(item => {
        rawMaterialDemand.set(item.id, 0);
    });

    // ==========================================
    // Step 1: Process all prep items (Child Level)
    // ==========================================
    prepItems.forEach(prep => {
        // Calculate prep gap
        const deficit = prep.par_level - prep.current_qty;

        // If gap > 0, generate prep task
        if (deficit > 0) {
            // Find parent raw material
            const parentRaw = rawItems.find(r => r.id === prep.parent_sku_id);

            // Calculate raw material consumption
            const rawConsumption = deficit * (prep.usage_per_unit || 0);

            prepList.push({
                action: 'PREP',
                sku_id: prep.id,
                item_name: prep.name,
                quantity: deficit,
                unit: prep.unit,
                parent_raw_name: parentRaw?.name,
                raw_consumption: rawConsumption
            });

            // Accumulate raw material demand to parent
            if (prep.parent_sku_id && prep.usage_per_unit) {
                const currentDemand = rawMaterialDemand.get(prep.parent_sku_id) || 0;
                rawMaterialDemand.set(prep.parent_sku_id, currentDemand + rawConsumption);
            }
        }
    });

    // ==========================================
    // Step 2: Process all raw materials (Parent Level)
    // ==========================================
    rawItems.forEach(raw => {
        // Get total demand from prep items
        const demandFromPrep = rawMaterialDemand.get(raw.id) || 0;

        // Calculate shopping gap
        // Formula: (prep demand + safety stock) - current inventory
        const totalNeeded = demandFromPrep + raw.safety_stock;
        const buyDeficit = totalNeeded - raw.current_qty;

        // If deficit > 0, need to buy
        if (buyDeficit > 0) {
            // Determine priority
            let priority: 'urgent' | 'normal' | 'low' = 'normal';
            if (raw.current_qty === 0) {
                priority = 'urgent';  // Completely out of stock
            } else if (raw.current_qty < raw.safety_stock) {
                priority = 'urgent';  // Below safety stock
            } else if (buyDeficit > demandFromPrep * 0.5) {
                priority = 'normal';  // Significant gap
            } else {
                priority = 'low';     // Minor gap
            }

            shoppingList.push({
                action: 'BUY',
                sku_id: raw.id,
                item_name: raw.name,
                quantity: Math.round(buyDeficit * 100) / 100,  // 2 decimal places
                unit: raw.unit,
                reason: demandFromPrep > 0
                    ? `Prep requires ${demandFromPrep.toFixed(2)} ${raw.unit}`
                    : `Below safety stock ${raw.safety_stock} ${raw.unit}`,
                priority
            });
        }
    });

    // Calculate summary
    const summary = {
        total_prep_items: prepList.length,
        total_shopping_items: shoppingList.length,
        estimated_prep_time: prepList.reduce((acc, item) => {
            // Assume each prep task takes ~5 minutes per unit
            return acc + Math.ceil(item.quantity) * 5;
        }, 0)
    };

    return {
        prep_list: prepList,
        shopping_list: shoppingList,
        summary
    };
}

/**
 * Format calculation results as readable text
 */
export function formatRequirements(result: RequirementCalculation): string {
    let output = '📋 Today\'s Work List\n\n';

    if (result.prep_list.length > 0) {
        output += '🔪 Prep Tasks:\n';
        result.prep_list.forEach((task, i) => {
            output += `${i + 1}. ${task.item_name}: Make ${task.quantity} ${task.unit}`;
            if (task.raw_consumption) {
                output += ` (uses ${task.raw_consumption.toFixed(2)} ${task.parent_raw_name || 'material'})`;
            }
            output += '\n';
        });
        output += '\n';
    }

    if (result.shopping_list.length > 0) {
        output += '🛒 Shopping List:\n';
        result.shopping_list.forEach((task, i) => {
            const priorityIcon = task.priority === 'urgent' ? '🔴' : task.priority === 'normal' ? '🟡' : '🟢';
            output += `${i + 1}. ${priorityIcon} ${task.item_name}: Buy ${task.quantity} ${task.unit}\n`;
            output += `   Reason: ${task.reason}\n`;
        });
    }

    if (result.prep_list.length === 0 && result.shopping_list.length === 0) {
        output += '✅ Great! Inventory is sufficient, no prep or shopping needed.';
    }

    return output;
}

/**
 * Sort shopping list by priority
 */
export function sortShoppingListByPriority(tasks: ShoppingTask[]): ShoppingTask[] {
    const priorityOrder = { urgent: 0, normal: 1, low: 2 };
    return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Sort prep list by raw consumption (highest first for efficiency)
 */
export function sortPrepListByConsumption(tasks: PrepRequirement[]): PrepRequirement[] {
    return [...tasks].sort((a, b) => (b.raw_consumption || 0) - (a.raw_consumption || 0));
}
