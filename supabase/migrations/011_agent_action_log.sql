-- ============================================================
-- Agent action log for OpenClaw Kitchen Brain
-- Audits every MCP tool action that reads or mutates kitchen data.
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  channel TEXT NOT NULL DEFAULT 'telegram',
  sender_id TEXT,
  sender_username TEXT,
  tool_name TEXT NOT NULL,
  intent TEXT,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  status TEXT NOT NULL CHECK (status IN ('started', 'requires_confirmation', 'executed', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_action_log_business_created
  ON agent_action_log(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_action_log_actor_created
  ON agent_action_log(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_action_log_status
  ON agent_action_log(status);

ALTER TABLE agent_action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_log_select_accessible" ON agent_action_log;
CREATE POLICY "agent_log_select_accessible"
  ON agent_action_log FOR SELECT
  USING (
    actor_user_id = auth.uid()
    OR (business_id IS NOT NULL AND has_business_access(business_id))
    OR (business_id IS NULL AND actor_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "agent_log_insert_accessible" ON agent_action_log;
CREATE POLICY "agent_log_insert_accessible"
  ON agent_action_log FOR INSERT
  WITH CHECK (
    actor_user_id = auth.uid()
    OR (business_id IS NOT NULL AND has_business_access(business_id))
  );

DROP POLICY IF EXISTS "agent_log_update_owner" ON agent_action_log;
CREATE POLICY "agent_log_update_owner"
  ON agent_action_log FOR UPDATE
  USING (business_id IS NOT NULL AND is_business_owner(business_id))
  WITH CHECK (business_id IS NOT NULL AND is_business_owner(business_id));

COMMENT ON TABLE agent_action_log IS 'Auditable history of OpenClaw Kitchen Brain tool calls and outcomes.';
COMMENT ON COLUMN agent_action_log.status IS 'started/requires_confirmation/executed/failed/cancelled lifecycle status for agent actions.';
