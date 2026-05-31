import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

describe('telegram link migrations', () => {
  it('creates one-time link codes and RPC based linking', () => {
    const migration = readFileSync(
      join(repoRoot, 'supabase/migrations/012_telegram_link_codes.sql'),
      'utf8',
    );

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS telegram_link_codes');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION create_telegram_link_code');
    expect(migration).toContain('auth.uid()');
    expect(migration).toContain('expires_at');
  });

  it('does not allow browser clients to insert arbitrary telegram_user_links rows', () => {
    const migration = readFileSync(
      join(repoRoot, 'supabase/migrations/010_telegram_user_links.sql'),
      'utf8',
    );

    expect(migration).not.toContain('OR linked_by = auth.uid()');
    expect(migration).toContain('supabase_user_id = auth.uid()');
    expect(migration).toContain('is_business_owner(default_business_id)');
  });
});
