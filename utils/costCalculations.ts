/**
 * Cost Calculation Utilities
 * 
 * Extracted from App.tsx for reusability
 */

import { InventoryItem } from '../types';

/**
 * Convert between units for cost calculation
 * Handles common kitchen unit conversions
 * 
 * @param invItem - Inventory item with cost info
 * @param usageQty - Quantity used in recipe
 * @param usageUnit - Unit of the usage quantity
 * @returns Calculated cost for this usage
 */
export const calculateIngredientCost = (
    invItem: InventoryItem,
    usageQty: number,
    usageUnit: string
): number => {
    const invUnit = (invItem.quantityUnit || 'pcs').toLowerCase();
    const uUnit = usageUnit.toLowerCase();
    const costPerInvUnit = invItem.unitCost || 0;

    let ratio = 0;

    // Same unit
    if (uUnit === invUnit) {
        ratio = usageQty;
    }
    // Weight conversions
    else if (invUnit === 'kg' && uUnit === 'g') {
        ratio = usageQty / 1000;
    }
    else if (invUnit === 'g' && uUnit === 'kg') {
        ratio = usageQty * 1000;
    }
    // Volume conversions
    else if (invUnit === 'l' && uUnit === 'ml') {
        ratio = usageQty / 1000;
    }
    else if (invUnit === 'ml' && uUnit === 'l') {
        ratio = usageQty * 1000;
    }
    // Imperial conversions
    else if (invUnit === 'lb' && uUnit === 'oz') {
        ratio = usageQty / 16;
    }
    else if (invUnit === 'oz' && uUnit === 'lb') {
        ratio = usageQty * 16;
    }
    // Fallback: assume same unit
    else {
        ratio = usageQty;
    }

    return ratio * costPerInvUnit;
};

/**
 * Unit conversion ratios
 */
export const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
    kg: { g: 1000, lb: 2.205, oz: 35.274 },
    g: { kg: 0.001, oz: 0.035 },
    l: { ml: 1000, gal: 0.264 },
    ml: { l: 0.001 },
    lb: { oz: 16, kg: 0.454, g: 453.6 },
    oz: { lb: 0.0625, g: 28.35 },
};

/**
 * Convert quantity between units
 */
export const convertUnit = (
    quantity: number,
    fromUnit: string,
    toUnit: string
): number | null => {
    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();

    if (from === to) return quantity;

    const conversions = UNIT_CONVERSIONS[from];
    if (!conversions || !conversions[to]) return null;

    return quantity * conversions[to];
};

/**
 * Format currency value
 */
export const formatCurrency = (
    value: number,
    currency: string = 'GBP',
    locale: string = 'en-GB'
): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(value);
};

/**
 * Calculate gross margin percentage
 */
export const calculateMargin = (sellingPrice: number, cost: number): number => {
    if (sellingPrice <= 0) return 0;
    return ((sellingPrice - cost) / sellingPrice) * 100;
};
