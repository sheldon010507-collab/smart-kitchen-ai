-- Tighten Kitchen Brain activity visibility:
-- - Staff can see their own agent actions.
-- - Managers can see all actions for stores they own.

DROP POLICY IF EXISTS "agent_log_select_accessible" ON agent_action_log;
CREATE POLICY "agent_log_select_own_or_owned_store"
  ON agent_action_log FOR SELECT
  USING (
    actor_user_id = auth.uid()
    OR (business_id IS NOT NULL AND is_business_owner(business_id))
  );

COMMENT ON POLICY "agent_log_select_own_or_owned_store" ON agent_action_log
  IS 'Staff see their own Kitchen Brain actions; store owners see all actions for owned stores.';
