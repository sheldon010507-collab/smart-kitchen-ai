import { useCallback, useEffect, useState } from 'react';
import { AgentActionLog, fetchAgentActionLogs, formatAgentLogError } from '../services/agentLogService';

export function useAgentActionLog(options: {
    businessIds?: string[];
    actorUserId?: string;
    limit?: number;
}) {
    const [logs, setLogs] = useState<AgentActionLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchAgentActionLogs(options);
            setLogs(result);
        } catch (err: any) {
            setError(formatAgentLogError(err));
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(options.businessIds || []), options.actorUserId, options.limit]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { logs, loading, error, refresh };
}
