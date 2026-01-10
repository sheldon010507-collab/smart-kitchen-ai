/**
 * Draft Migration Utilities
 * Handles backward compatibility for legacy draft data in LocalStorage
 */
import { DraftInventoryItem } from '../components/setup/types';

/**
 * Migrate legacy draft items to new field names
 * Handles: unit → quantityUnit, cost → unitCost, suggestedPar → minStockLevel
 */
export function migrateLegacyDraft(item: any): DraftInventoryItem {
    return {
        ...item,
        // Migrate to new field names, prefer new if exists
        quantityUnit: item.quantityUnit ?? item.unit,
        unitCost: item.unitCost ?? item.cost,
        minStockLevel: item.minStockLevel ?? item.suggestedPar,
        supplier: item.supplier ?? '',
        notes: item.notes ?? '',
    };
}

/**
 * Migrate an array of legacy draft items
 */
export function migrateLegacyDraftItems(items: any[]): DraftInventoryItem[] {
    return items.map(migrateLegacyDraft);
}
