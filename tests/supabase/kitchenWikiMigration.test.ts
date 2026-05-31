import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Kitchen Wiki migration', () => {
  it('creates knowledge, alias, and receipt import tables with RLS policies', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/013_kitchen_wiki_and_receipt_imports.sql'), 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS kitchen_knowledge_items');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS kitchen_knowledge_aliases');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS receipt_import_logs');
    expect(sql).toContain('ALTER TABLE kitchen_knowledge_items ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('has_business_access(business_id)');
    expect(sql).toContain('UNIQUE (business_id, canonical_name)');
    expect(sql).toContain('UNIQUE (business_id, alias)');
  });
});
