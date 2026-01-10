/**
 * Hook for searching inventory items
 * Used in AddItemModal for quick item selection
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { InventoryItem } from '../../../types';

interface UseInventorySearchOptions {
    businessId: string | null;
    limit?: number;
}

interface InventorySearchResult {
    id: string;
    name: string;
    category: string;
    quantityUnit: string;
    supplier: string | null;
    minStockLevel: number | null;
}

export function useInventorySearch({ businessId, limit = 10 }: UseInventorySearchOptions) {
    const [results, setResults] = useState<InventorySearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (query: string) => {
        if (!businessId || !query.trim()) {
            setResults([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: queryError } = await supabase
                .from('inventory_items')
                .select('id, name, category, quantity_unit, supplier, min_stock_level')
                .eq('business_id', businessId)
                .ilike('name', `%${query}%`)
                .limit(limit);

            if (queryError) {
                throw queryError;
            }

            const mapped: InventorySearchResult[] = (data ?? []).map(item => ({
                id: item.id,
                name: item.name,
                category: item.category || '',
                quantityUnit: item.quantity_unit || 'pcs',
                supplier: item.supplier || null,
                minStockLevel: item.min_stock_level || null,
            }));

            setResults(mapped);
        } catch (err: any) {
            console.error('Inventory search error:', err);
            setError(err.message || 'Search failed');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [businessId, limit]);

    const clear = useCallback(() => {
        setResults([]);
        setError(null);
    }, []);

    return {
        results,
        loading,
        error,
        search,
        clear,
    };
}
