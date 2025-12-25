/**
 * Export shopping list to PDF using browser print API
 * 
 * Creates a printable HTML document and triggers print dialog.
 */

import type { ShoppingListItem } from '../types';
import { PRIORITY_LABELS, REASON_LABELS, STATUS_LABELS, PRIORITY_COLORS } from '../constants';

/**
 * Format date for display
 */
function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Get priority color as inline CSS (simpler than Tailwind for print)
 */
function getPriorityStyle(priority: string): string {
    switch (priority) {
        case 'urgent':
            return 'background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 12px;';
        case 'normal':
            return 'background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 12px;';
        case 'low':
            return 'background-color: #f3f4f6; color: #4b5563; padding: 2px 6px; border-radius: 4px; font-size: 12px;';
        default:
            return '';
    }
}

/**
 * Generate HTML content for PDF export
 */
function generatePdfHtml(
    items: ShoppingListItem[],
    title: string = 'Shopping List',
    businessName?: string
): string {
    const dateStr = new Date().toLocaleDateString();

    const tableRows = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.item_name)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.category) || '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity_needed} ${escapeHtml(item.unit)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
        <span style="${getPriorityStyle(item.priority)}">${PRIORITY_LABELS[item.priority]}</span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${STATUS_LABELS[item.status]}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${REASON_LABELS[item.reason]}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.notes) || '-'}</td>
    </tr>
  `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          color: #1f2937;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 4px;
        }
        .subtitle {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        th {
          text-align: left;
          padding: 10px 8px;
          background-color: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
          font-weight: 600;
        }
        .summary {
          margin-top: 20px;
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 8px;
          font-size: 14px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      <div class="subtitle">
        ${businessName ? `<strong>${escapeHtml(businessName)}</strong> • ` : ''}
        Generated on ${dateStr} • ${items.length} items
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th style="text-align: right;">Quantity</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div class="summary">
        <strong>Summary:</strong>
        ${items.filter(i => i.status === 'pending').length} pending •
        ${items.filter(i => i.priority === 'urgent' && i.status === 'pending').length} urgent •
        ${items.filter(i => i.status === 'purchased').length} purchased
      </div>
    </body>
    </html>
  `;
}

/**
 * Open print dialog with shopping list content
 */
export function printShoppingList(
    items: ShoppingListItem[],
    title: string = 'Shopping List',
    businessName?: string
): void {
    const html = generatePdfHtml(items, title, businessName);

    // Open new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        alert('Please allow pop-ups to print the shopping list.');
        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
        printWindow.print();
    };

    // Also trigger print immediately in case onload doesn't fire
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

/**
 * Print aggregate shopping list for multiple businesses
 */
export function printAggregateShoppingList(
    itemsByBusiness: Array<{ businessName: string; items: ShoppingListItem[] }>,
    title: string = 'Shopping List - All Stores'
): void {
    const dateStr = new Date().toLocaleDateString();
    const totalItems = itemsByBusiness.reduce((sum, b) => sum + b.items.length, 0);

    const businessSections = itemsByBusiness.map(({ businessName, items }) => {
        if (items.length === 0) return '';

        const tableRows = items.map(item => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.item_name)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.category) || '-'}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity_needed} ${escapeHtml(item.unit)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">
          <span style="${getPriorityStyle(item.priority)}">${PRIORITY_LABELS[item.priority]}</span>
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.notes) || '-'}</td>
      </tr>
    `).join('');

        return `
      <div style="margin-bottom: 24px; page-break-inside: avoid;">
        <h3 style="font-size: 16px; margin-bottom: 8px; color: #374151;">
          ${escapeHtml(businessName)} 
          <span style="font-weight: normal; color: #9ca3af;">(${items.length} items)</span>
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb;">Item</th>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb;">Category</th>
              <th style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb;">Qty</th>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb;">Priority</th>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb;">Notes</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          color: #1f2937;
        }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      <div class="subtitle">
        Generated on ${dateStr} • ${itemsByBusiness.length} stores • ${totalItems} total items
      </div>
      ${businessSections}
    </body>
    </html>
  `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        alert('Please allow pop-ups to print the shopping list.');
        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.print();
    }, 500);
}
