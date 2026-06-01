import { supabase } from '../supabase.js';
import { resolveBusiness } from '../businessResolver.js';
import { findBestInventoryMatch, type InventoryRow } from '../itemMatcher.js';
import { normalizeUnit } from '../unitNormalizer.js';
import { logAgentAction } from './audit.js';
import { staffRiskCheck } from '../permissions.js';
import type { BusinessSelectionInput, ToolResult } from '../types.js';

export async function recordWastage(input: BusinessSelectionInput & {
  item_name: string;
  quantity: number;
  unit?: string;
  reason: 'expired' | 'damaged' | 'spoiled' | 'preparation' | 'other';
  notes?: string;
}): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  const businessId = resolved.data.business.business_id;
  const unit = normalizeUnit(input.unit);

  try {
    const { data: inventory, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, business_id, name, category, location, quantity_value, quantity_unit, unit_cost, expiry_date, min_stock_level')
      .eq('business_id', businessId);

    if (fetchError) throw new Error(fetchError.message);

    const match = findBestInventoryMatch(input.item_name, (inventory || []) as InventoryRow[]);
    if (!match.match) {
      return {
        ok: false,
        needs_confirmation: true,
        clarification: `I could not confidently match "${input.item_name}" for wastage. Please confirm the item.`,
        data: { alternatives: match.alternatives },
      };
    }

    const currentQty = Number(match.match.quantity_value || 0);
    const quantity = Number(input.quantity);
    const review = staffRiskCheck(
      resolved.data,
      'record_wastage',
      currentQty > 0 && quantity / currentQty > 0.5,
      `This wastage would remove more than 50% of ${match.match.name}. A manager should review it before stock is updated.`,
      { current_quantity: currentQty, requested_wastage: quantity, item_name: match.match.name },
    );
    if (review) {
      await logAgentAction({
        business_id: businessId,
        actor_user_id: resolved.data.actor.supabase_user_id,
        actor_role: resolved.data.actor.role,
        sender_id: input.telegram_user_id,
        sender_username: input.telegram_username,
        tool_name: 'kitchen_record_wastage',
        intent: 'record_wastage',
        input,
        output: review.data,
        status: 'requires_confirmation',
      });
      return review;
    }

    const { data: wastage, error: wastageError } = await supabase.from('wastage_records').insert({
      business_id: businessId,
      inventory_item_id: match.match.id,
      item_name: match.match.name,
      quantity: input.quantity,
      unit: match.match.quantity_unit || unit,
      unit_cost: match.match.unit_cost || 0,
      reason: input.reason,
      notes: input.notes || null,
      expiry_date: match.match.expiry_date || null,
      category: match.match.category || null,
      recorded_by: resolved.data.actor.supabase_user_id,
    }).select('*').single();

    if (wastageError) throw new Error(wastageError.message);

    const newQty = Math.max(0, currentQty - Number(input.quantity));

    const { error: stockError } = await supabase
      .from('inventory_items')
      .update({ quantity_value: newQty, updated_at: new Date().toISOString() })
      .eq('id', match.match.id)
      .eq('business_id', businessId);

    if (stockError) throw new Error(stockError.message);

    const output = {
      business: resolved.data.business,
      wastage,
      stock_update: {
        item: match.match.name,
        previous_quantity: currentQty,
        new_quantity: newQty,
        unit: match.match.quantity_unit || unit,
      },
    };

    await logAgentAction({
      business_id: businessId,
      actor_user_id: resolved.data.actor.supabase_user_id,
      actor_role: resolved.data.actor.role,
      sender_id: input.telegram_user_id,
      sender_username: input.telegram_username,
      tool_name: 'kitchen_record_wastage',
      intent: 'record_wastage',
      input,
      output,
      status: 'executed',
    });

    return { ok: true, data: output };
  } catch (error: any) {
    await logAgentAction({
      business_id: businessId,
      actor_user_id: resolved.data.actor.supabase_user_id,
      actor_role: resolved.data.actor.role,
      sender_id: input.telegram_user_id,
      sender_username: input.telegram_username,
      tool_name: 'kitchen_record_wastage',
      intent: 'record_wastage',
      input,
      status: 'failed',
      error_message: error.message,
    });
    return { ok: false, error: error.message };
  }
}
