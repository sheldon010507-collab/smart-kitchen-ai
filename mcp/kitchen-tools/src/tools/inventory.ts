import { supabase } from '../supabase.js';
import { resolveBusiness } from '../businessResolver.js';
import { findBestInventoryMatch, type InventoryRow } from '../itemMatcher.js';
import { normalizeUnit } from '../unitNormalizer.js';
import { logAgentAction } from './audit.js';
import type { BusinessSelectionInput, ToolResult } from '../types.js';

interface StockInput extends BusinessSelectionInput {
  item_name: string;
  quantity: number;
  unit?: string;
  reason?: string;
}

async function fetchInventory(businessId: string): Promise<InventoryRow[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, business_id, name, category, location, quantity_value, quantity_unit, unit_cost, expiry_date, min_stock_level')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as InventoryRow[];
}

async function matchItem(businessId: string, itemName: string) {
  const inventory = await fetchInventory(businessId);
  return findBestInventoryMatch(itemName, inventory);
}

export async function getInventory(input: BusinessSelectionInput): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  try {
    const inventory = await fetchInventory(resolved.data.business.business_id);
    const output = { business: resolved.data.business, inventory };
    await logAgentAction({
      business_id: resolved.data.business.business_id,
      actor_user_id: resolved.data.actor.supabase_user_id,
      actor_role: resolved.data.actor.role,
      sender_id: input.telegram_user_id,
      sender_username: input.telegram_username,
      tool_name: 'kitchen_get_inventory',
      intent: 'read_inventory',
      input,
      output,
      status: 'executed',
    });
    return { ok: true, data: output };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

export async function findInventoryItem(input: BusinessSelectionInput & { item_name: string }): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  try {
    const match = await matchItem(resolved.data.business.business_id, input.item_name);
    return { ok: true, data: { business: resolved.data.business, ...match } };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

async function updateStock(input: StockInput, operation: 'set' | 'add' | 'deduct'): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  const businessId = resolved.data.business.business_id;
  const normalizedUnit = normalizeUnit(input.unit);
  const quantity = Number(input.quantity);

  if (!Number.isFinite(quantity) || quantity < 0) {
    return { ok: false, error: 'quantity must be a non-negative number' };
  }

  try {
    const match = await matchItem(businessId, input.item_name);
    if (!match.match) {
      const output = { alternatives: match.alternatives.map(item => ({ id: item.id, name: item.name })) };
      await logAgentAction({
        business_id: businessId,
        actor_user_id: resolved.data.actor.supabase_user_id,
        actor_role: resolved.data.actor.role,
        sender_id: input.telegram_user_id,
        sender_username: input.telegram_username,
        tool_name: `kitchen_${operation}_stock`,
        intent: operation,
        input,
        output,
        status: 'requires_confirmation',
      });
      return {
        ok: false,
        needs_confirmation: true,
        clarification: `I could not confidently match "${input.item_name}". Please confirm the item or create it from the web console first.`,
        data: output,
      };
    }

    const currentQty = Number(match.match.quantity_value || 0);
    let nextQty = currentQty;
    if (operation === 'set') nextQty = quantity;
    if (operation === 'add') nextQty = currentQty + quantity;
    if (operation === 'deduct') nextQty = Math.max(0, currentQty - quantity);

    if (operation === 'deduct' && currentQty > 0 && quantity / currentQty > 0.5) {
      const output = { current_quantity: currentQty, requested_deduction: quantity, item: match.match };
      await logAgentAction({
        business_id: businessId,
        actor_user_id: resolved.data.actor.supabase_user_id,
        actor_role: resolved.data.actor.role,
        sender_id: input.telegram_user_id,
        sender_username: input.telegram_username,
        tool_name: 'kitchen_deduct_stock',
        intent: 'deduct_stock',
        input,
        output,
        status: 'requires_confirmation',
      });
      return {
        ok: false,
        needs_confirmation: true,
        clarification: `This would deduct more than 50% of ${match.match.name}. Please confirm before I update stock.`,
        data: output,
      };
    }

    const { error } = await supabase
      .from('inventory_items')
      .update({
        quantity_value: nextQty,
        quantity_unit: match.match.quantity_unit || normalizedUnit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.match.id)
      .eq('business_id', businessId);

    if (error) throw new Error(error.message);

    const output = {
      business: resolved.data.business,
      item: { id: match.match.id, name: match.match.name },
      operation,
      previous_quantity: currentQty,
      new_quantity: nextQty,
      unit: match.match.quantity_unit || normalizedUnit,
    };

    await logAgentAction({
      business_id: businessId,
      actor_user_id: resolved.data.actor.supabase_user_id,
      actor_role: resolved.data.actor.role,
      sender_id: input.telegram_user_id,
      sender_username: input.telegram_username,
      tool_name: `kitchen_${operation}_stock`,
      intent: `${operation}_stock`,
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
      tool_name: `kitchen_${operation}_stock`,
      intent: `${operation}_stock`,
      input,
      status: 'failed',
      error_message: error.message,
    });
    return { ok: false, error: error.message };
  }
}

export const setStock = (input: StockInput) => updateStock(input, 'set');
export const addStock = (input: StockInput) => updateStock(input, 'add');
export const deductStock = (input: StockInput) => updateStock(input, 'deduct');
