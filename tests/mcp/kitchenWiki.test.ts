import { describe, expect, it, vi } from 'vitest';
import { upsertKnowledgeItem } from '../../mcp/kitchen-tools/src/tools/knowledge';

function builder(response: any = { data: null, error: null }) {
  const b: any = {
    select: vi.fn(() => b),
    insert: vi.fn(() => b),
    upsert: vi.fn(() => b),
    update: vi.fn(() => b),
    eq: vi.fn(() => b),
    in: vi.fn(() => b),
    maybeSingle: vi.fn(() => Promise.resolve(response)),
    single: vi.fn(() => Promise.resolve(response)),
  };
  return b;
}

describe('Kitchen Wiki MCP tools', () => {
  it('upserts a canonical knowledge item and aliases for an accessible store', async () => {
    const knowledgeBuilder = builder({
      data: {
        id: 'wiki-1',
        business_id: 'biz-1',
        canonical_name: 'Whole Milk',
      },
      error: null,
    });
    const aliasBuilder = builder({ data: null, error: null });

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'kitchen_knowledge_items') return knowledgeBuilder;
        if (table === 'kitchen_knowledge_aliases') return aliasBuilder;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await upsertKnowledgeItem(db as any, {
      business_id: 'biz-1',
      actor_user_id: 'user-1',
      canonical_name: 'Whole Milk',
      aliases: ['milk', 'ARLA WHOLE MILK 2L'],
      category: 'Dairy',
      default_location: 'Fridge',
      default_unit: 'L',
      par_level: 6,
      shelf_life_days: 7,
    });

    expect(result.ok).toBe(true);
    expect(knowledgeBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
      business_id: 'biz-1',
      canonical_name: 'Whole Milk',
      category: 'Dairy',
      default_location: 'Fridge',
      default_unit: 'L',
      par_level: 6,
      shelf_life_days: 7,
      updated_by: 'user-1',
    }), { onConflict: 'business_id,canonical_name' });
    expect(aliasBuilder.upsert).toHaveBeenCalledWith([
      { business_id: 'biz-1', knowledge_item_id: 'wiki-1', alias: 'milk' },
      { business_id: 'biz-1', knowledge_item_id: 'wiki-1', alias: 'ARLA WHOLE MILK 2L' },
    ], { onConflict: 'business_id,alias' });
  });

  it('creates a zero-stock inventory row when a new wiki item is missing from inventory', async () => {
    const knowledgeBuilder = builder({
      data: {
        id: 'wiki-2',
        business_id: 'biz-1',
        canonical_name: 'Cream',
      },
      error: null,
    });
    const inventoryBuilder = builder({
      data: {
        id: 'item-2',
        name: 'Cream',
        quantity_value: 0,
        quantity_unit: 'bottle',
        min_stock_level: 2,
      },
      error: null,
    });

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'kitchen_knowledge_items') return knowledgeBuilder;
        if (table === 'inventory_items') return inventoryBuilder;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await upsertKnowledgeItem(db as any, {
      business_id: 'biz-1',
      actor_user_id: 'user-1',
      canonical_name: 'Cream',
      category: 'Dairy',
      default_location: 'Fridge',
      default_unit: 'bottle',
      par_level: 2,
    });

    expect(result.ok).toBe(true);
    expect(inventoryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      business_id: 'biz-1',
      name: 'Cream',
      canonical_name: 'Cream',
      category: 'Dairy',
      location: 'Fridge',
      quantity_value: 0,
      quantity_unit: 'bottle',
      min_stock_level: 2,
    }));
    expect((result.data as any).created_inventory).toEqual(expect.objectContaining({
      id: 'item-2',
      name: 'Cream',
    }));
  });
});
