import { describe, expect, it, vi } from 'vitest';
import { importReceiptItems } from '../../mcp/kitchen-tools/src/tools/receipts';

function builder(response: any = { data: null, error: null }) {
  const b: any = {
    select: vi.fn(() => b),
    insert: vi.fn(() => b),
    upsert: vi.fn(() => b),
    update: vi.fn(() => b),
    eq: vi.fn(() => b),
    order: vi.fn(() => b),
    single: vi.fn(() => Promise.resolve(response)),
    maybeSingle: vi.fn(() => Promise.resolve(response)),
  };
  return b;
}

describe('receipt import MCP tool', () => {
  it('adds parsed receipt quantities to existing inventory items', async () => {
    const inventoryRows = [{
      id: 'item-1',
      business_id: 'biz-1',
      name: 'Whole Milk',
      category: 'Dairy',
      location: 'Fridge',
      quantity_value: 2,
      quantity_unit: 'L',
      unit_cost: 1.2,
      expiry_date: null,
      min_stock_level: 4,
    }];

    const inventoryBuilder = builder({ data: inventoryRows, error: null });
    inventoryBuilder.order = vi.fn(() => Promise.resolve({ data: inventoryRows, error: null }));
    inventoryBuilder.eq = vi.fn(() => inventoryBuilder);
    inventoryBuilder.update = vi.fn(() => inventoryBuilder);

    const auditBuilder = builder({ data: null, error: null });
    const receiptLogBuilder = builder({ data: null, error: null });

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'inventory_items') return inventoryBuilder;
        if (table === 'agent_action_log') return auditBuilder;
        if (table === 'receipt_import_logs') return receiptLogBuilder;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await importReceiptItems(db as any, {
      actor: { supabase_user_id: 'user-1', role: 'Manager' },
      business: { business_id: 'biz-1', name: 'Cloud cafe', access_role: 'owner' },
      telegram_user_id: 'tg-1',
      telegram_username: 'manager',
      supplier: 'Booker',
      items: [{ item_name: 'milk', quantity: 3, unit: 'L', total_price: 6 }],
    });

    expect(result.ok).toBe(true);
    expect(inventoryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      quantity_value: 5,
      quantity_unit: 'L',
      unit_cost: 2,
    }));
    expect(auditBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      tool_name: 'kitchen_import_receipt_items',
      status: 'executed',
    }));
  });
});
