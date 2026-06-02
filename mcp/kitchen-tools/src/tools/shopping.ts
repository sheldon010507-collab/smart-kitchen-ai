import { supabase } from '../supabase.js';
import { resolveBusiness } from '../businessResolver.js';
import { logAgentAction } from './audit.js';
import { canSeeSensitiveFields } from '../permissions.js';
import type { BusinessSelectionInput, ToolResult } from '../types.js';

function normalizeName(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

export async function suggestReorder(input: BusinessSelectionInput): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  const businessId = resolved.data.business.business_id;
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, category, quantity_value, quantity_unit, min_stock_level, supplier')
    .eq('business_id', businessId);

  if (error) return { ok: false, error: error.message };

  const { data: knowledge, error: knowledgeError } = await supabase
    .from('kitchen_knowledge_items')
    .select('canonical_name, category, default_unit, par_level, kitchen_knowledge_aliases(alias)')
    .eq('business_id', businessId)
    .gt('par_level', 0);

  if (knowledgeError) return { ok: false, error: knowledgeError.message };

  const wikiByName = new Map<string, any>();
  for (const item of knowledge || []) {
    wikiByName.set(normalizeName(item.canonical_name), item);
    for (const aliasRow of item.kitchen_knowledge_aliases || []) {
      wikiByName.set(normalizeName(aliasRow.alias), item);
    }
  }

  const showSensitive = canSeeSensitiveFields(resolved.data);
  const suggestions = (data || [])
    .map(item => {
      const wikiItem = wikiByName.get(normalizeName(item.name));
      const inventoryMin = Number(item.min_stock_level || 0);
      const wikiMin = Number(wikiItem?.par_level || 0);
      const minStockLevel = inventoryMin > 0 ? inventoryMin : wikiMin;

      return { item, wikiItem, minStockLevel };
    })
    .filter(({ item, minStockLevel }) => minStockLevel > 0 && Number(item.quantity_value || 0) < minStockLevel)
    .map(item => {
      const currentQuantity = Number(item.item.quantity_value || 0);
      const suggestion: any = {
        inventory_item_id: item.item.id,
        item_name: item.item.name,
        category: item.item.category || item.wikiItem?.category,
        current_quantity: currentQuantity,
        min_stock_level: item.minStockLevel,
        quantity_needed: Math.max(0, item.minStockLevel - currentQuantity),
        unit: item.item.quantity_unit || item.wikiItem?.default_unit || 'pcs',
        priority: currentQuantity === 0 ? 'urgent' : 'normal',
      };
      if (showSensitive) suggestion.supplier = item.item.supplier;
      return suggestion;
    });

  return { ok: true, data: { business: resolved.data.business, suggestions } };
}

export async function createShoppingItem(input: BusinessSelectionInput & {
  item_name: string;
  quantity_needed: number;
  unit?: string;
  reason?: 'low_stock' | 'expiring' | 'prep_required' | 'manual';
  priority?: 'urgent' | 'normal' | 'low';
  inventory_item_id?: string;
  category?: string;
  notes?: string;
}): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  try {
    let duplicateQuery = supabase
      .from('shopping_list')
      .select('id, item_name, inventory_item_id, quantity_needed, unit, status, created_at')
      .eq('business_id', resolved.data.business.business_id)
      .eq('status', 'pending');

    if (input.inventory_item_id) {
      duplicateQuery = duplicateQuery.eq('inventory_item_id', input.inventory_item_id);
    } else {
      duplicateQuery = duplicateQuery.ilike('item_name', input.item_name.trim());
    }

    const { data: duplicateRows, error: duplicateError } = await duplicateQuery.limit(1);
    if (duplicateError) throw new Error(duplicateError.message);
    if (duplicateRows && duplicateRows.length > 0) {
      return {
        ok: true,
        data: {
          business: resolved.data.business,
          shopping_item: duplicateRows[0],
          already_pending: true,
        },
      };
    }

    const { data, error } = await supabase.from('shopping_list').insert({
      business_id: resolved.data.business.business_id,
      inventory_item_id: input.inventory_item_id || null,
      item_name: input.item_name,
      category: input.category || null,
      quantity_needed: input.quantity_needed,
      unit: input.unit || 'pcs',
      reason: input.reason || 'manual',
      priority: input.priority || 'normal',
      status: 'pending',
      created_by: resolved.data.actor.supabase_user_id,
      notes: input.notes || null,
    }).select('*').single();

    if (error) throw new Error(error.message);

    const output = { business: resolved.data.business, shopping_item: data };
    await logAgentAction({
      business_id: resolved.data.business.business_id,
      actor_user_id: resolved.data.actor.supabase_user_id,
      actor_role: resolved.data.actor.role,
      sender_id: input.telegram_user_id,
      sender_username: input.telegram_username,
      tool_name: 'kitchen_create_shopping_item',
      intent: 'create_shopping_item',
      input,
      output,
      status: 'executed',
    });

    return { ok: true, data: output };
  } catch (error: any) {
    await logAgentAction({
      business_id: resolved.data.business.business_id,
      actor_user_id: resolved.data.actor.supabase_user_id,
      actor_role: resolved.data.actor.role,
      sender_id: input.telegram_user_id,
      sender_username: input.telegram_username,
      tool_name: 'kitchen_create_shopping_item',
      intent: 'create_shopping_item',
      input,
      status: 'failed',
      error_message: error.message,
    });
    return { ok: false, error: error.message };
  }
}

export async function getShoppingList(input: BusinessSelectionInput & {
  status?: 'pending' | 'purchased' | 'cancelled';
  limit?: number;
}): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  const status = input.status || 'pending';
  const limit = Math.min(Math.max(Number(input.limit || 25), 1), 50);
  const { data, error } = await supabase
    .from('shopping_list')
    .select('id, item_name, category, quantity_needed, unit, reason, priority, status, created_at')
    .eq('business_id', resolved.data.business.business_id)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { business: resolved.data.business, status, items: data || [] } };
}
