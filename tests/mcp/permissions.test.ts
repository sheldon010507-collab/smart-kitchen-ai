import { describe, expect, it } from 'vitest';
import { requireManager, staffRiskCheck } from '../../mcp/kitchen-tools/src/permissions';

const staffContext = {
  actor: { supabase_user_id: 'staff-1', role: 'Staff' as const },
  business: { business_id: 'biz-1', name: 'Cloud cafe', access_role: 'staff' as const },
};

const managerContext = {
  actor: { supabase_user_id: 'manager-1', role: 'Manager' as const },
  business: { business_id: 'biz-1', name: 'Cloud cafe', access_role: 'owner' as const },
};

describe('Kitchen Brain MCP permissions', () => {
  it('requires a store manager for manager-only actions', () => {
    expect(requireManager(managerContext, 'upsert_knowledge')).toBeNull();

    const denied = requireManager(staffContext, 'upsert_knowledge');
    expect(denied).toMatchObject({
      ok: false,
      needs_confirmation: true,
      error: 'Manager approval required',
    });
  });

  it('turns risky staff actions into manager-review responses', () => {
    expect(staffRiskCheck(managerContext, 'deduct_stock', true, 'review')).toBeNull();
    expect(staffRiskCheck(staffContext, 'deduct_stock', false, 'review')).toBeNull();

    const review = staffRiskCheck(staffContext, 'deduct_stock', true, 'review required');
    expect(review).toMatchObject({
      ok: false,
      needs_confirmation: true,
      clarification: 'review required',
    });
  });
});
