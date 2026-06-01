import { supabase } from '../supabase.js';
import { resolveBusiness } from '../businessResolver.js';
import { logAgentAction } from './audit.js';
import { canSeeSensitiveFields } from '../permissions.js';
import type { BusinessSelectionInput, ToolResult } from '../types.js';

export async function suggestReorder(input: BusinessSelectionInput): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, category, quantity_value, quantity_unit, min_stock_level, supplier')
    .eq('business_id', resolved.data.business.business_id)
    .gt('min_stock_level', 0);

  if (error) return { ok: false, error: error.message };

  const showSensitive = canSeeSensitiveFields(resolved.data);
  const suggestions = (data || [])
    .filter(item => Number(item.quantity_value || 0) < Number(item.min_stock_level || 0))
    .map(item => {
      const suggestion: any = {
        inventory_item_id: item.id,
        item_name: item.name,
        category: item.category,
        current_quantity: Number(item.quantity_value || 0),
        min_stock_level: Number(item.min_stock_level || 0),
        quantity_needed: Math.max(0, Number(item.min_stock_level || 0) - Number(item.quantity_value || 0)),
        unit: item.quantity_unit || 'pcs',
        priority: Number(item.quantity_value || 0) === 0 ? 'urgent' : 'normal',
      };
      if (showSensitive) suggestion.supplier = item.supplier;
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
