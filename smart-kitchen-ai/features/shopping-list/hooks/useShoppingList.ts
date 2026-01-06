/**
 * Hook for fetching shopping list data
 * 
 * Follows same pattern as useInventory.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { ShoppingListItem, ShoppingListFilters, ShoppingListSort } from '../types';
import { ITEMS_PER_PAGE } from '../constants';

interface UseShoppingListOptions {
    businessId: string | null;
    filters?: ShoppingListFilters;
    sort?: ShoppingListSort;
    page?: number;
}

interface UseShoppingListReturn {
    items: ShoppingListItem[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    refetch: () => Promise<void>;
}

export function useShoppingList({
    businessId,
    filters = { tab: 'pending' },
    sort = { field: 'created_at', direction: 'desc' },
    page = 1,
}: UseShoppingListOptions): UseShoppingListReturn {
    const [items, setItems] = useState<ShoppingListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    const fetchShoppingList = useCallback(async () => {
        if (!businessId) {
            setItems([]);
            setLoading(false);
            setTotalCount(0);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Build query
            let query = supabase
                .from('shopping_list')
                .select('*', { count: 'exact' })
                .eq('business_id', businessId);

            // Apply status filter from tab
            if (filters.tab) {
                query = query.eq('status', filters.tab);
            }

            // Apply category filter
            if (filters.category) {
                query = query.eq('category', filters.category);
            }

            // Apply priority filter
            if (filters.priority) {
                query = query.eq('priority', filters.priority);
            }

            // Apply search query
            if (filters.searchQuery) {
                query = query.ilike('item_name', `%${filters.searchQuery}%`);
            }

            // Apply sorting
            query = query.order(sort.field, { ascending: sort.direction === 'asc' });

            // Apply pagination
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, error: queryError, count } = await query;

            if (queryError) {
                throw queryError;
            }

            setItems(data ?? []);
            setTotalCount(count ?? 0);
        } catch (err: any) {
            console.error('Error fetching shopping list:', err);
            setError(err.message || 'Failed to load shopping list');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [businessId, filters.tab, filters.category, filters.priority, filters.searchQuery, sort.field, sort.direction, page]);

    useEffect(() => {
        fetchShoppingList();
    }, [fetchShoppingList]);

    return {
        items,
        loading,
        error,
        totalCount,
        refetch: fetchShoppingList,
    };
}

/**
 * Hook for fetching all shopping list items across multiple businesses
 * Used for Manager master view
 */
export function useAllShoppingLists(businessIds: string[]): {
    itemsByBusiness: Map<string, ShoppingListItem[]>;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
} {
    const [itemsByBusiness, setItemsByBusiness] = useState<Map<string, ShoppingListItem[]>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        if (businessIds.length === 0) {
            setItemsByBusiness(new Map());
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: queryError } = await supabase
                .from('shopping_list')
                .select('*')
                .in('business_id', businessIds)
                .eq('status', 'pending')
                .order('priority', { ascending: true })
                .order('created_at', { ascending: false });

            if (queryError) {
                throw queryError;
            }

            // Group by business
            const grouped = new Map<string, ShoppingListItem[]>();
            for (const item of data ?? []) {
                const existing = grouped.get(item.business_id) ?? [];
                existing.push(item);
                grouped.set(item.business_id, existing);
            }

            setItemsByBusiness(grouped);
        } catch (err: any) {
            console.error('Error fetching all shopping lists:', err);
            setError(err.message || 'Failed to load shopping lists');
        } finally {
            setLoading(false);
        }
    }, [businessIds.join(',')]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return {
        itemsByBusiness,
        loading,
        error,
        refetch: fetchAll,
    };
}
