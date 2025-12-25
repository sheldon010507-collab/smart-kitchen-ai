/**
 * Export shopping list to CSV
 * 
 * Sanitizes values to prevent CSV injection attacks.
 */

import type { ShoppingListItem } from '../types';
import { PRIORITY_LABELS, REASON_LABELS, STATUS_LABELS } from '../constants';

/**
 * Characters that can trigger formula injection in Excel/Sheets
 */
const FORMULA_CHARS = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Sanitize a value for CSV output
 * - Escapes double quotes
 * - Wraps in quotes if contains comma, quote, or newline
 * - Prefixes with single quote if starts with formula character
 */
function sanitizeValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
        return '';
    }

    let str = String(value);

    // Prevent formula injection by prefixing with single quote
    if (FORMULA_CHARS.some(char => str.startsWith(char))) {
        str = "'" + str;
    }

    // Escape double quotes by doubling them
    str = str.replace(/"/g, '""');

    // Wrap in quotes if contains special characters
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = `"${str}"`;
    }

    return str;
}

/**
 * Format date for CSV display
 */
function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr;
    }
}

/**
 * Generate CSV content from shopping list items
 */
export function generateCsvContent(
    items: ShoppingListItem[],
    businessName?: string
): string {
    const headers = [
        'Item Name',
        'Category',
        'Quantity',
        'Unit',
        'Priority',
        'Status',
        'Reason',
        'Estimated Cost',
        'Notes',
        'Created At',
        'Purchased At',
    ];

    const rows = items.map(item => [
        sanitizeValue(item.item_name),
        sanitizeValue(item.category),
        sanitizeValue(item.quantity_needed),
        sanitizeValue(item.unit),
        sanitizeValue(PRIORITY_LABELS[item.priority]),
        sanitizeValue(STATUS_LABELS[item.status]),
        sanitizeValue(REASON_LABELS[item.reason]),
        sanitizeValue(item.estimated_cost ? `$${item.estimated_cost.toFixed(2)}` : ''),
        sanitizeValue(item.notes),
        sanitizeValue(formatDate(item.created_at)),
        sanitizeValue(formatDate(item.purchased_at)),
    ]);

    // Add header row with optional business name prefix
    const headerPrefix = businessName ? `Shopping List - ${businessName}\n\n` : '';
    const csvHeader = headers.map(h => sanitizeValue(h)).join(',');
    const csvRows = rows.map(row => row.join(','));

    return headerPrefix + [csvHeader, ...csvRows].join('\n');
}

/**
 * Trigger CSV file download in browser
 */
export function downloadCsv(
    items: ShoppingListItem[],
    filename: string = 'shopping-list',
    businessName?: string
): void {
    const csvContent = generateCsvContent(items, businessName);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
}

/**
 * Export multiple businesses to a single CSV (for Manager aggregate export)
 */
export function downloadAggregateCsv(
    itemsByBusiness: Array<{ businessName: string; items: ShoppingListItem[] }>,
    filename: string = 'shopping-list-all'
): void {
    const headers = [
        'Store',
        'Item Name',
        'Category',
        'Quantity',
        'Unit',
        'Priority',
        'Status',
        'Reason',
        'Estimated Cost',
        'Notes',
    ];

    const rows: string[][] = [];

    for (const { businessName, items } of itemsByBusiness) {
        for (const item of items) {
            rows.push([
                sanitizeValue(businessName),
                sanitizeValue(item.item_name),
                sanitizeValue(item.category),
                sanitizeValue(item.quantity_needed),
                sanitizeValue(item.unit),
                sanitizeValue(PRIORITY_LABELS[item.priority]),
                sanitizeValue(STATUS_LABELS[item.status]),
                sanitizeValue(REASON_LABELS[item.reason]),
                sanitizeValue(item.estimated_cost ? `$${item.estimated_cost.toFixed(2)}` : ''),
                sanitizeValue(item.notes),
            ]);
        }
    }

    const csvHeader = headers.map(h => sanitizeValue(h)).join(',');
    const csvRows = rows.map(row => row.join(','));
    const csvContent = [csvHeader, ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
