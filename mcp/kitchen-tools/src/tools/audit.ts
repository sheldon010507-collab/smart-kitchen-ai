import { supabase } from '../supabase.js';

export async function logAgentAction(input: {
  business_id?: string | null;
  actor_user_id?: string | null;
  actor_role?: string | null;
  channel?: string;
  sender_id?: string;
  sender_username?: string;
  tool_name: string;
  intent?: string;
  input?: unknown;
  output?: unknown;
  status: 'started' | 'requires_confirmation' | 'executed' | 'failed' | 'cancelled';
  error_message?: string;
}) {
  const { error } = await supabase.from('agent_action_log').insert({
    business_id: input.business_id ?? null,
    actor_user_id: input.actor_user_id ?? null,
    actor_role: input.actor_role ?? null,
    channel: input.channel ?? 'telegram',
    sender_id: input.sender_id ?? null,
    sender_username: input.sender_username ?? null,
    tool_name: input.tool_name,
    intent: input.intent ?? null,
    input: (input.input ?? {}) as any,
    output: input.output ?? null,
    status: input.status,
    error_message: input.error_message ?? null,
  });

  if (error) {
    console.error('[kitchen-tools] failed to write agent_action_log:', error.message);
  }
}
