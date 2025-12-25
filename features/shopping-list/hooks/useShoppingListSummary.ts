/**
 * Hook for fetching shopping list summary (Manager Master View)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { BusinessShoppingListSummary } from '../types';

interface UseShoppingListSummaryReturn {
    summaries: BusinessShoppingListSummary[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Fetch aggregated shopping list summary for all businesses owned by user
 */
export function useShoppingListSummary(ownerId: string | null): UseShoppingListSummaryReturn {
    const [summaries, setSummaries] = useState<BusinessShoppingListSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        if (!ownerId) {
            setSummaries([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Use the RPC function for efficient aggregation
            const { data, error: rpcError } = await supabase
                .rpc('get_shopping_list_summary', { p_owner_id: ownerId });

            if (rpcError) {
                // Fallback: If RPC doesn't exist, do manual aggregation
                console.warn('RPC not available, falling back to manual aggregation:', rpcError);

                // Get businesses owned by user
                const { data: businesses, error: bizError } = await supabase
                    .from('businesses')
                    .select('id, name')
                    .eq('owner_id', ownerId);

                if (bizError) throw bizError;

                if (!businesses || businesses.length === 0) {
                    setSummaries([]);
                    return;
                }

                // Get shopping list counts for each business
                const businessIds = businesses.map(b => b.id);
                const { data: items, error: itemsError } = await supabase
                    .from('shopping_list')
                    .select('business_id, status, priority')
                    .in('business_id', businessIds);

                if (itemsError) throw itemsError;

                // Aggregate manually
                const aggregated: BusinessShoppingListSummary[] = businesses.map(biz => {
                    const bizItems = items?.filter(i => i.business_id === biz.id) ?? [];
                    return {
                        business_id: biz.id,
                        business_name: biz.name,
                        pending_count: bizItems.filter(i => i.status === 'pending').length,
                        urgent_count: bizItems.filter(i => i.status === 'pending' && i.priority === 'urgent').length,
                        total_items: bizItems.length,
                    };
                });

                setSummaries(aggregated.sort((a, b) => b.urgent_count - a.urgent_count || b.pending_count - a.pending_count));
                return;
            }

            // Map RPC result
            const mapped: BusinessShoppingListSummary[] = (data ?? []).map((row: any) => ({
                business_id: row.business_id,
                business_name: row.business_name,
                pending_count: Number(row.pending_count) || 0,
                urgent_count: Number(row.urgent_count) || 0,
                total_items: Number(row.total_items) || 0,
            }));

            setSummaries(mapped);
        } catch (err: any) {
            console.error('Error fetching shopping list summary:', err);
            setError(err.message || 'Failed to load summary');
            setSummaries([]);
        } finally {
            setLoading(false);
        }
    }, [ownerId]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    return {
        summaries,
        loading,
        error,
        refetch: fetchSummary,
    };
}
