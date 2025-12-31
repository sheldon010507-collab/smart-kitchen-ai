/**
 * Database Row Transformers
 * 
 * Convert between snake_case database rows and camelCase application types
 */

import {
    MenuItem,
    PrepTask,
    Shift,
    SalesReceipt,
    SalesItem,
    MenuIngredient,
    Database
} from '../types';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Normalize member status to consistent format
 * Extracted from App.tsx
 */
export const normMemberStatus = (s: any): 'Active' | 'Pending' => {
    const v = String(s || '').toLowerCase();
    return v === 'active' ? 'Active' : 'Pending';
};

/**
 * Map database row to InventoryItem type
 * Extracted from App.tsx
 */
export const mapDbRowToInventoryItem = (r: any): {
    id: string;
    businessId: string;
    name: string;
    category: string;
    location: string;
    unitCost: number;
    quantityValue: number;
    quantityUnit: string;
    quantity: string;
    expiryDate: string;
    addedDate: string;
} => {
    const qtyVal = Number(r.quantity_value ?? 0);
    const qtyUnit = (r.quantity_unit ?? 'pcs') as string;

    return {
        id: r.id,
        businessId: r.business_id,
        name: r.name,
        category: r.category || '',
        location: r.location || '',
        unitCost: Number(r.unit_cost ?? 0),
        quantityValue: qtyVal,
        quantityUnit: qtyUnit,
        quantity: `${qtyVal} ${qtyUnit}`,
        expiryDate: r.expiry_date || '',
        addedDate: r.added_date || '',
    };
};

// ============================================================
// MENU MODULE
// ============================================================

export function toMenuItem(row: Database.MenuItemRow): MenuItem {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        description: row.description ?? undefined,
        sellingPrice: row.selling_price,
        estimatedCost: row.estimated_cost ?? undefined,
        category: row.category ?? undefined,
        imageUrl: row.image_url ?? undefined,
        isActive: row.is_active,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toMenuItemRow(item: Partial<MenuItem>): Partial<Database.MenuItemRow> {
    const row: Partial<Database.MenuItemRow> = {};
    if (item.id !== undefined) row.id = item.id;
    if (item.businessId !== undefined) row.business_id = item.businessId;
    if (item.name !== undefined) row.name = item.name;
    if (item.description !== undefined) row.description = item.description;
    if (item.sellingPrice !== undefined) row.selling_price = item.sellingPrice;
    if (item.estimatedCost !== undefined) row.estimated_cost = item.estimatedCost;
    if (item.category !== undefined) row.category = item.category;
    if (item.imageUrl !== undefined) row.image_url = item.imageUrl;
    if (item.isActive !== undefined) row.is_active = item.isActive;
    if (item.sortOrder !== undefined) row.sort_order = item.sortOrder;
    return row;
}

// ============================================================
// PREP TASKS
// ============================================================

export function toPrepTask(row: Database.PrepTaskRow): PrepTask {
    return {
        id: row.id,
        businessId: row.business_id,
        taskText: row.task_text,
        assignedTo: row.assigned_to ?? undefined,
        completed: row.completed,
        completedAt: row.completed_at ?? undefined,
        completedBy: row.completed_by ?? undefined,
        taskDate: row.task_date,
        priority: row.priority,
        createdBy: row.created_by ?? undefined,
        createdAt: row.created_at,
    };
}

export function toPrepTaskRow(task: Partial<PrepTask>): Partial<Database.PrepTaskRow> {
    const row: Partial<Database.PrepTaskRow> = {};
    if (task.id !== undefined) row.id = task.id;
    if (task.businessId !== undefined) row.business_id = task.businessId;
    if (task.taskText !== undefined) row.task_text = task.taskText;
    if (task.assignedTo !== undefined) row.assigned_to = task.assignedTo;
    if (task.completed !== undefined) row.completed = task.completed;
    if (task.completedAt !== undefined) row.completed_at = task.completedAt;
    if (task.completedBy !== undefined) row.completed_by = task.completedBy;
    if (task.taskDate !== undefined) row.task_date = task.taskDate;
    if (task.priority !== undefined) row.priority = task.priority;
    if (task.createdBy !== undefined) row.created_by = task.createdBy;
    return row;
}

// ============================================================
// SHIFTS
// ============================================================

export function toShift(row: Database.ShiftRow): Shift {
    return {
        id: row.id,
        businessId: row.business_id,
        userId: row.user_id,
        shiftDate: row.shift_date,
        scheduledStart: row.scheduled_start ?? undefined,
        scheduledEnd: row.scheduled_end ?? undefined,
        actualStart: row.actual_start ?? undefined,
        actualEnd: row.actual_end ?? undefined,
        hourlyRate: row.hourly_rate ?? undefined,
        totalHours: row.total_hours ?? undefined,
        totalCost: row.total_cost ?? undefined,
        notes: row.notes ?? undefined,
        status: row.status,
        createdAt: row.created_at,
    };
}

export function toShiftRow(shift: Partial<Shift>): Partial<Database.ShiftRow> {
    const row: Partial<Database.ShiftRow> = {};
    if (shift.id !== undefined) row.id = shift.id;
    if (shift.businessId !== undefined) row.business_id = shift.businessId;
    if (shift.userId !== undefined) row.user_id = shift.userId;
    if (shift.shiftDate !== undefined) row.shift_date = shift.shiftDate;
    if (shift.scheduledStart !== undefined) row.scheduled_start = shift.scheduledStart;
    if (shift.scheduledEnd !== undefined) row.scheduled_end = shift.scheduledEnd;
    if (shift.actualStart !== undefined) row.actual_start = shift.actualStart;
    if (shift.actualEnd !== undefined) row.actual_end = shift.actualEnd;
    if (shift.hourlyRate !== undefined) row.hourly_rate = shift.hourlyRate;
    if (shift.totalHours !== undefined) row.total_hours = shift.totalHours;
    if (shift.totalCost !== undefined) row.total_cost = shift.totalCost;
    if (shift.notes !== undefined) row.notes = shift.notes;
    if (shift.status !== undefined) row.status = shift.status;
    return row;
}

// ============================================================
// SALES
// ============================================================

export function toSalesReceipt(row: Database.SalesReceiptRow): SalesReceipt {
    return {
        id: row.id,
        businessId: row.business_id,
        receiptNumber: row.receipt_number ?? undefined,
        tableNumber: row.table_number ?? undefined,
        totalAmount: row.total_amount,
        taxAmount: row.tax_amount ?? undefined,
        discountAmount: row.discount_amount ?? undefined,
        paymentMethod: row.payment_method ?? undefined,
        status: row.status,
        servedBy: row.served_by ?? undefined,
        notes: row.notes ?? undefined,
        createdAt: row.created_at,
    };
}

export function toSalesItem(row: Database.SalesItemRow): SalesItem {
    return {
        id: row.id,
        receiptId: row.receipt_id,
        menuItemId: row.menu_item_id ?? undefined,
        itemName: row.item_name,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        subtotal: row.subtotal,
        notes: row.notes ?? undefined,
    };
}

// ============================================================
// BATCH CONVERTERS
// ============================================================

export function toMenuItems(rows: Database.MenuItemRow[]): MenuItem[] {
    return rows.map(toMenuItem);
}

export function toPrepTasks(rows: Database.PrepTaskRow[]): PrepTask[] {
    return rows.map(toPrepTask);
}

export function toShifts(rows: Database.ShiftRow[]): Shift[] {
    return rows.map(toShift);
}

export function toSalesReceipts(rows: Database.SalesReceiptRow[]): SalesReceipt[] {
    return rows.map(toSalesReceipt);
}

export function toSalesItems(rows: Database.SalesItemRow[]): SalesItem[] {
    return rows.map(toSalesItem);
}
