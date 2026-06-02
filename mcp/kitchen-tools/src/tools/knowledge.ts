import type { ToolResult } from '../types.js';
import { requireManager } from '../permissions.js';

export interface KnowledgeItemInput {
  business_id: string;
  actor_user_id?: string;
  canonical_name: string;
  aliases?: string[];
  category?: string;
  default_location?: string;
  default_unit?: string;
  par_level?: number;
  shelf_life_days?: number;
  notes?: string;
}

export async function upsertKnowledgeItem(db: any, input: KnowledgeItemInput): Promise<ToolResult> {
  const canonicalName = String(input.canonical_name || '').trim();
  if (!input.business_id) return { ok: false, error: 'business_id is required' };
  if (!canonicalName) return { ok: false, error: 'canonical_name is required' };

  const { data: item, error } = await db
    .from('kitchen_knowledge_items')
    .upsert({
      business_id: input.business_id,
      canonical_name: canonicalName,
      category: input.category || null,
      default_location: input.default_location || null,
      default_unit: input.default_unit || null,
      par_level: input.par_level ?? 0,
      shelf_life_days: input.shelf_life_days ?? null,
      notes: input.notes || null,
      updated_by: input.actor_user_id || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,canonical_name' })
    .select('*')
    .single();

  if (error) return { ok: false, error: error.message };

  const aliases = [...new Set((input.aliases || []).map(alias => alias.trim()).filter(Boolean))];
  if (aliases.length > 0) {
    const { error: aliasError } = await db
      .from('kitchen_knowledge_aliases')
      .upsert(aliases.map(alias => ({
        business_id: input.business_id,
        knowledge_item_id: item.id,
        alias,
      })), { onConflict: 'business_id,alias' });

    if (aliasError) return { ok: false, error: aliasError.message };
  }

  let syncedInventory: any[] = [];
  const parLevel = Number(input.par_level ?? 0);
  if (parLevel > 0) {
    const names = [...new Set([canonicalName, ...aliases])];
    const { data: syncedRows, error: syncError } = await db
      .from('inventory_items')
      .update({
        min_stock_level: parLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', input.business_id)
      .in('name', names)
      .select('id, name, min_stock_level');

    if (syncError) return { ok: false, error: syncError.message };
    syncedInventory = syncedRows || [];
  }

  return { ok: true, data: { item, aliases, synced_inventory: syncedInventory } };
}

export async function searchKnowledgeItems(db: any, input: { business_id: string; query?: string; limit?: number }): Promise<ToolResult> {
  if (!input.business_id) return { ok: false, error: 'business_id is required' };

  const { data, error } = await db
    .from('kitchen_knowledge_items')
    .select('*, kitchen_knowledge_aliases(alias)')
    .eq('business_id', input.business_id)
    .limit(input.limit || 25);

  if (error) return { ok: false, error: error.message };

  const query = String(input.query || '').trim().toLowerCase();
  const items = query
    ? (data || []).filter((item: any) => {
        const aliases = (item.kitchen_knowledge_aliases || []).map((row: any) => row.alias).join(' ');
        return `${item.canonical_name} ${aliases}`.toLowerCase().includes(query);
      })
    : (data || []);

  return { ok: true, data: { items } };
}

export async function upsertTelegramKnowledgeItem(input: Omit<KnowledgeItemInput, 'business_id' | 'actor_user_id'> & {
  telegram_user_id: string;
  telegram_username?: string;
  business_id?: string;
  business_name?: string;
}): Promise<ToolResult> {
  const { resolveBusiness } = await import('../businessResolver.js');
  const { supabase } = await import('../supabase.js');
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;
  const permission = requireManager(resolved.data, 'upsert_knowledge');
  if (permission) return permission;

  return upsertKnowledgeItem(supabase, {
    ...input,
    business_id: resolved.data.business.business_id,
    actor_user_id: resolved.data.actor.supabase_user_id,
  });
}

export async function searchTelegramKnowledgeItems(input: {
  telegram_user_id: string;
  telegram_username?: string;
  business_id?: string;
  business_name?: string;
  query?: string;
  limit?: number;
}): Promise<ToolResult> {
  const { resolveBusiness } = await import('../businessResolver.js');
  const { supabase } = await import('../supabase.js');
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  return searchKnowledgeItems(supabase, {
    business_id: resolved.data.business.business_id,
    query: input.query,
    limit: input.limit,
  });
}
