import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('agent permissions migration', () => {
  it('limits Kitchen Brain activity visibility to own actions or owned stores', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/014_agent_permissions_harden_rls.sql'), 'utf8');

    expect(sql).toContain('DROP POLICY IF EXISTS "agent_log_select_accessible"');
    expect(sql).toContain('CREATE POLICY "agent_log_select_own_or_owned_store"');
    expect(sql).toContain('actor_user_id = auth.uid()');
    expect(sql).toContain('is_business_owner(business_id)');
    expect(sql).not.toContain('has_business_access(business_id)');
  });
});
