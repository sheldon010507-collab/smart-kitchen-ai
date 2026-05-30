import { supabase } from '../../../lib/supabase';

export interface AgentActionLog {
    id: string;
    businessId?: string | null;
    actorUserId?: string | null;
    actorRole?: string | null;
    channel: string;
    senderId?: string | null;
    senderUsername?: string | null;
    toolName: string;
    intent?: string | null;
    input: Record<string, any>;
    output?: Record<string, any> | null;
    status: 'started' | 'requires_confirmation' | 'executed' | 'failed' | 'cancelled';
    errorMessage?: string | null;
    createdAt: string;
}

export function mapAgentActionLog(row: any): AgentActionLog {
    return {
        id: row.id,
        businessId: row.business_id,
        actorUserId: row.actor_user_id,
        actorRole: row.actor_role,
        channel: row.channel,
        senderId: row.sender_id,
        senderUsername: row.sender_username,
        toolName: row.tool_name,
        intent: row.intent,
        input: row.input || {},
        output: row.output || null,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: row.created_at,
    };
}

export async function fetchAgentActionLogs(options: {
    businessIds?: string[];
    actorUserId?: string;
    limit?: number;
}) {
    let query = supabase
        .from('agent_action_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options.limit || 25);

    if (options.businessIds && options.businessIds.length > 0) {
        query = query.in('business_id', options.businessIds);
    }

    if (options.actorUserId) {
        query = query.eq('actor_user_id', options.actorUserId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapAgentActionLog);
}
