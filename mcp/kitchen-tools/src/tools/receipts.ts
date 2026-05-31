import { findBestInventoryMatch, type InventoryRow } from '../itemMatcher.js';
import type { AccessibleBusiness, ResolvedActor, ToolResult } from '../types.js';

export interface ParsedReceiptItem {
  item_name: string;
  quantity: number;
  unit?: string;
  total_price?: number;
  category?: string;
  expiry_date?: string;
}

export interface ReceiptImportInput {
  actor: Pick<ResolvedActor, 'supabase_user_id' | 'role'>;
  business: AccessibleBusiness;
  telegram_user_id?: string;
  telegram_username?: string;
  supplier?: string;
  receipt_date?: string;
  raw_text?: string;
  items: ParsedReceiptItem[];
}

async function fetchInventory(db: any, businessId: string): Promise<InventoryRow[]> {
  const { data, error } = await db
    .from('inventory_items')
    .select('id, business_id, name, category, location, quantity_value, quantity_unit, unit_cost, expiry_date, min_stock_level')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as InventoryRow[];
}

export async function importReceiptItems(db: any, input: ReceiptImportInput): Promise<ToolResult> {
  if (!input.business?.business_id) return { ok: false, error: 'business is required' };
  if (!Array.isArray(input.items) || input.items.length === 0) return { ok: false, error: 'items must contain at least one parsed receipt item' };

  const businessId = input.business.business_id;
  const inventory = await fetchInventory(db, businessId);
  const appliedItems: any[] = [];

  for (const receiptItem of input.items) {
    const quantity = Number(receiptItem.quantity);
    if (!receiptItem.item_name?.trim() || !Number.isFinite(quantity) || quantity <= 0) continue;

    const match = findBestInventoryMatch(receiptItem.item_name, inventory);
    const unitCost = receiptItem.total_price && quantity > 0 ? Number(receiptItem.total_price) / quantity : undefined;

    if (match.match) {
      const currentQty = Number(match.match.quantity_value || 0);
      const nextQty = currentQty + quantity;
      const unit = match.match.quantity_unit || receiptItem.unit || 'pcs';

      const { error } = await db
        .from('inventory_items')
        .update({
          quantity_value: nextQty,
          quantity_unit: unit,
          unit_cost: unitCost ?? match.match.unit_cost ?? 0,
          expiry_date: receiptItem.expiry_date || match.match.expiry_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.match.id)
        .eq('business_id', businessId);

      if (error) throw new Error(error.message);
      appliedItems.push({
        action: 'updated',
        item_name: match.match.name,
        receipt_name: receiptItem.item_name,
        previous_quantity: currentQty,
        new_quantity: nextQty,
        unit,
      });
    } else {
      const { data, error } = await db
        .from('inventory_items')
        .insert({
          business_id: businessId,
          name: receiptItem.item_name.trim(),
          canonical_name: receiptItem.item_name.trim(),
          category: receiptItem.category || null,
          location: null,
          quantity_value: quantity,
          quantity_unit: receiptItem.unit || 'pcs',
          unit_cost: unitCost ?? 0,
          expiry_date: receiptItem.expiry_date || null,
          added_date: new Date().toISOString().slice(0, 10),
          supplier: input.supplier || null,
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      appliedItems.push({
        action: 'created',
        item_name: data.name,
        receipt_name: receiptItem.item_name,
        previous_quantity: 0,
        new_quantity: quantity,
        unit: receiptItem.unit || 'pcs',
      });
    }
  }

  const logOutput = {
    business: input.business,
    supplier: input.supplier || null,
    applied_items: appliedItems,
  };

  await db.from('receipt_import_logs').insert({
    business_id: businessId,
    actor_user_id: input.actor.supabase_user_id || null,
    supplier: input.supplier || null,
    receipt_date: input.receipt_date || null,
    raw_text: input.raw_text || null,
    parsed_items: input.items,
    applied_items: appliedItems,
    status: 'applied',
  });

  await db.from('agent_action_log').insert({
    business_id: businessId,
    actor_user_id: input.actor.supabase_user_id || null,
    actor_role: input.actor.role || null,
    channel: 'telegram',
    sender_id: input.telegram_user_id || null,
    sender_username: input.telegram_username || null,
    tool_name: 'kitchen_import_receipt_items',
    intent: 'receipt_inventory_import',
    input,
    output: logOutput,
    status: 'executed',
  });

  return { ok: true, data: logOutput };
}

export async function importTelegramReceiptItems(input: Omit<ReceiptImportInput, 'actor' | 'business'> & {
  telegram_user_id: string;
  telegram_username?: string;
  business_id?: string;
  business_name?: string;
}): Promise<ToolResult> {
  const { resolveBusiness } = await import('../businessResolver.js');
  const { supabase } = await import('../supabase.js');
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  return importReceiptItems(supabase, {
    actor: resolved.data.actor,
    business: resolved.data.business,
    telegram_user_id: input.telegram_user_id,
    telegram_username: input.telegram_username,
    supplier: input.supplier,
    receipt_date: input.receipt_date,
    raw_text: input.raw_text,
    items: input.items,
  });
}
