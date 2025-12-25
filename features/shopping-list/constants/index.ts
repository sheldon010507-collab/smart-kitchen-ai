/**
 * Shopping List Module - Constants & Configuration
 */

import type {
    ShoppingListReason,
    ShoppingListPriority,
    ShoppingListStatus,
    AutoGenerateOptions
} from '../types';

// ===================
// FEATURE FLAG
// ===================

export const FEATURE_SHOPPING_LIST_ENABLED = true;

// ===================
// AUTO-GENERATION THRESHOLDS
// ===================

export const EXPIRY_THRESHOLD_DAYS = 3;
export const LOW_STOCK_THRESHOLD_PERCENT = 20;

export const DEFAULT_AUTO_GENERATE_OPTIONS: AutoGenerateOptions = {
    includeExpiring: true,
    includeLowStock: true,
    includePrepRequired: false, // Phase 2
    expiryThresholdDays: EXPIRY_THRESHOLD_DAYS,
    lowStockThresholdPercent: LOW_STOCK_THRESHOLD_PERCENT,
    mergeStrategy: 'skip',
};

// ===================
// DISPLAY LABELS
// ===================

export const REASON_LABELS: Record<ShoppingListReason, string> = {
    low_stock: 'Low Stock',
    expiring: 'Expiring Soon',
    prep_required: 'Prep Required',
    manual: 'Manual Entry',
};

export const PRIORITY_LABELS: Record<ShoppingListPriority, string> = {
    urgent: 'Urgent',
    normal: 'Normal',
    low: 'Low',
};

export const STATUS_LABELS: Record<ShoppingListStatus, string> = {
    pending: 'Pending',
    purchased: 'Purchased',
    cancelled: 'Cancelled',
};

// ===================
// STYLING (Tailwind classes)
// ===================

export const PRIORITY_COLORS: Record<ShoppingListPriority, string> = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    normal: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const STATUS_COLORS: Record<ShoppingListStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    purchased: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-500',
};

export const REASON_ICONS: Record<ShoppingListReason, string> = {
    low_stock: '📉',
    expiring: '⏰',
    prep_required: '🍳',
    manual: '✏️',
};

// ===================
// PAGINATION
// ===================

export const ITEMS_PER_PAGE = 20;
export const SUMMARY_ITEMS_PER_PAGE = 50;

// ===================
// COMMON UNITS
// ===================

export const COMMON_UNITS = [
    'pcs',
    'kg',
    'g',
    'L',
    'ml',
    'lb',
    'oz',
    'dozen',
    'case',
    'box',
    'bag',
    'bottle',
    'can',
    'pack',
];

// ===================
// DEFAULT VALUES
// ===================

export const DEFAULT_PRIORITY: ShoppingListPriority = 'normal';
export const DEFAULT_REASON: ShoppingListReason = 'manual';
export const DEFAULT_STATUS: ShoppingListStatus = 'pending';
