-- ============================================================
-- Kitchen Wiki and Telegram receipt import support
-- Gradually builds store-specific knowledge from Telegram receipts,
-- corrections, aliases, par levels, and shelf-life rules.
-- ============================================================

CREATE TABLE IF NOT EXISTS kitchen_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  canonical_name TEXT NOT NULL,
  category TEXT,
  default_location TEXT,
  default_unit TEXT,
  par_level NUMERIC DEFAULT 0,
  shelf_life_days INTEGER,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, canonical_name)
);

CREATE TABLE IF NOT EXISTS kitchen_knowledge_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  knowledge_item_id UUID NOT NULL REFERENCES kitchen_knowledge_items(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'telegram',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, alias)
);

CREATE TABLE IF NOT EXISTS receipt_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'telegram',
  supplier TEXT,
  receipt_date DATE,
  raw_text TEXT,
  parsed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  applied_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('pending_confirmation', 'applied', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kitchen_knowledge_items_business
  ON kitchen_knowledge_items(business_id, canonical_name);

CREATE INDEX IF NOT EXISTS idx_kitchen_knowledge_aliases_business_alias
  ON kitchen_knowledge_aliases(business_id, lower(alias));

CREATE INDEX IF NOT EXISTS idx_receipt_import_logs_business_created
  ON receipt_import_logs(business_id, created_at DESC);

ALTER TABLE kitchen_knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_knowledge_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kitchen_knowledge_items_select" ON kitchen_knowledge_items;
CREATE POLICY "kitchen_knowledge_items_select"
  ON kitchen_knowledge_items FOR SELECT
  USING (has_business_access(business_id));

DROP POLICY IF EXISTS "kitchen_knowledge_items_insert" ON kitchen_knowledge_items;
CREATE POLICY "kitchen_knowledge_items_insert"
  ON kitchen_knowledge_items FOR INSERT
  WITH CHECK (has_business_access(business_id));

DROP POLICY IF EXISTS "kitchen_knowledge_items_update" ON kitchen_knowledge_items;
CREATE POLICY "kitchen_knowledge_items_update"
  ON kitchen_knowledge_items FOR UPDATE
  USING (has_business_access(business_id))
  WITH CHECK (has_business_access(business_id));

DROP POLICY IF EXISTS "kitchen_knowledge_aliases_select" ON kitchen_knowledge_aliases;
CREATE POLICY "kitchen_knowledge_aliases_select"
  ON kitchen_knowledge_aliases FOR SELECT
  USING (has_business_access(business_id));

DROP POLICY IF EXISTS "kitchen_knowledge_aliases_insert" ON kitchen_knowledge_aliases;
CREATE POLICY "kitchen_knowledge_aliases_insert"
  ON kitchen_knowledge_aliases FOR INSERT
  WITH CHECK (has_business_access(business_id));

DROP POLICY IF EXISTS "kitchen_knowledge_aliases_update" ON kitchen_knowledge_aliases;
CREATE POLICY "kitchen_knowledge_aliases_update"
  ON kitchen_knowledge_aliases FOR UPDATE
  USING (has_business_access(business_id))
  WITH CHECK (has_business_access(business_id));

DROP POLICY IF EXISTS "receipt_import_logs_select" ON receipt_import_logs;
CREATE POLICY "receipt_import_logs_select"
  ON receipt_import_logs FOR SELECT
  USING (has_business_access(business_id));

DROP POLICY IF EXISTS "receipt_import_logs_insert" ON receipt_import_logs;
CREATE POLICY "receipt_import_logs_insert"
  ON receipt_import_logs FOR INSERT
  WITH CHECK (has_business_access(business_id));

COMMENT ON TABLE kitchen_knowledge_items IS 'Store-specific Agent Wiki for canonical inventory items, defaults, par levels, and shelf-life rules.';
COMMENT ON TABLE kitchen_knowledge_aliases IS 'Supplier receipt names and human aliases mapped to canonical Kitchen Wiki items.';
COMMENT ON TABLE receipt_import_logs IS 'Telegram receipt import audit trail with parsed and applied line items.';
