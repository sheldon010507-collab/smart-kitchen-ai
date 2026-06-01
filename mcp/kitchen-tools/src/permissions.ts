import type { ResolvedActor, ResolvedBusiness, ToolResult } from './types.js';

export type KitchenAction =
  | 'read_inventory'
  | 'find_inventory_item'
  | 'add_stock'
  | 'deduct_stock'
  | 'set_stock'
  | 'create_prep_tasks'
  | 'read_prep_tasks'
  | 'suggest_reorder'
  | 'create_shopping_item'
  | 'record_wastage'
  | 'import_receipt'
  | 'search_knowledge'
  | 'upsert_knowledge';

export interface PermissionContext {
  actor: Pick<ResolvedActor, 'supabase_user_id' | 'role'>;
  business: ResolvedBusiness;
}

export function isManagerForBusiness(context: PermissionContext): boolean {
  return context.business.access_role === 'owner';
}

export function requireManager(context: PermissionContext, action: KitchenAction): ToolResult | null {
  if (isManagerForBusiness(context)) return null;

  return {
    ok: false,
    needs_confirmation: true,
    clarification: `${action} needs a manager for this store.`,
    error: 'Manager approval required',
  };
}

export function staffRiskCheck(
  context: PermissionContext,
  action: KitchenAction,
  risk: boolean,
  message: string,
  data?: unknown,
): ToolResult | null {
  if (isManagerForBusiness(context) || !risk) return null;

  return {
    ok: false,
    needs_confirmation: true,
    clarification: message,
    data,
  };
}

export function canSeeSensitiveFields(context: PermissionContext): boolean {
  return isManagerForBusiness(context);
}
