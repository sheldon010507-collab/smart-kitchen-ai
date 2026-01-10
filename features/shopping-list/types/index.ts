/**
 * Shopping List Module - Type Definitions
 * 
 * Types for the shopping list/procurement feature.
 */

// ===================
// ENUMS (as union types)
// ===================

export type ShoppingListReason = 'low_stock' | 'expiring' | 'prep_required' | 'manual';
export type ShoppingListPriority = 'urgent' | 'normal' | 'low';
export type ShoppingListStatus = 'pending' | 'purchased' | 'cancelled';

// ===================
// MAIN INTERFACE
// ===================

/**
 * Shopping list item - matches database schema
 */
export interface ShoppingListItem {
    id: string;
    business_id: string;
    inventory_item_id: string | null;
    item_name: string;
    category: string | null;
    quantity_needed: number;
    unit: string;
    estimated_cost: number | null;
    reason: ShoppingListReason;
    priority: ShoppingListPriority;
    status: ShoppingListStatus;
    created_by: string;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
    purchased_at: string | null;
    notes: string | null;
    // 從 inventory_items JOIN 或直接存儲
    supplier?: string | null;
}

// ===================
// INPUT TYPES
// ===================

/**
 * Input for creating a new shopping list item
 */
export interface CreateShoppingListItem {
    business_id: string;
    inventory_item_id?: string;
    item_name: string;
    category?: string;
    quantity_needed: number;
    unit: string;
    estimated_cost?: number;
    reason: ShoppingListReason;
    priority?: ShoppingListPriority;
    notes?: string;
}

/**
 * Input for updating an existing shopping list item
 */
export interface UpdateShoppingListItem {
    id: string;
    item_name?: string;
    category?: string;
    quantity_needed?: number;
    unit?: string;
    estimated_cost?: number;
    priority?: ShoppingListPriority;
    status?: ShoppingListStatus;
    notes?: string;
}

// ===================
// AUTO-GENERATION
// ===================

/**
 * Options for auto-generating shopping list items
 */
export interface AutoGenerateOptions {
    includeExpiring: boolean;
    includeLowStock: boolean;
    includePrepRequired: boolean;
    expiryThresholdDays: number;
    lowStockThresholdPercent: number;
    mergeStrategy: 'skip' | 'update' | 'add_new';
}

/**
 * Generated item before insertion
 */
export interface GeneratedShoppingItem {
    inventory_item_id: string;
    item_name: string;
    category: string | null;
    quantity_needed: number;
    unit: string;
    reason: ShoppingListReason;
    priority: ShoppingListPriority;
    supplier?: string | null;
}

/**
 * Result from auto-generation
 */
export interface AutoGenerateResult {
    items: GeneratedShoppingItem[];
    skipped: number;
    errors: string[];
}

// ===================
// SUMMARY & AGGREGATION
// ===================

/**
 * Summary for Manager Master Dashboard
 */
export interface BusinessShoppingListSummary {
    business_id: string;
    business_name: string;
    pending_count: number;
    urgent_count: number;
    total_items: number;
}

/**
 * Grouped view for "Group by Ingredient" toggle
 */
export interface GroupedShoppingItem {
    item_name: string;
    category: string | null;
    unit: string;
    total_quantity: number;
    businesses: Array<{
        business_id: string;
        business_name: string;
        quantity: number;
        priority: ShoppingListPriority;
    }>;
    highest_priority: ShoppingListPriority;
}

// ===================
// UI STATE
// ===================

export type ShoppingListTab = 'pending' | 'purchased' | 'cancelled' | 'routines';

export interface ShoppingListFilters {
    tab: ShoppingListTab;
    category?: string;
    priority?: ShoppingListPriority;
    searchQuery?: string;
}

export type ShoppingListSortField = 'item_name' | 'priority' | 'created_at' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface ShoppingListSort {
    field: ShoppingListSortField;
    direction: SortDirection;
}

// ===================
// ROUTINE LIST (定期採購模板)
// ===================

/**
 * Routine list - reusable shopping list templates
 */
export interface RoutineList {
    id: string;
    business_id: string;
    name: string;
    description: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    item_count?: number;  // Computed from items
}

/**
 * Routine list item
 */
export interface RoutineListItem {
    id: string;
    routine_list_id: string;
    item_name: string;
    quantity_needed: number;
    unit: string;
    category: string | null;
    supplier: string | null;
    notes: string | null;
    sort_order: number;
}

/**
 * Create routine list input
 */
export interface CreateRoutineList {
    business_id: string;
    name: string;
    description?: string;
}

/**
 * Create routine list item input
 */
export interface CreateRoutineListItem {
    routine_list_id: string;
    item_name: string;
    quantity_needed: number;
    unit: string;
    category?: string;
    supplier?: string;
    notes?: string;
    sort_order?: number;
}

