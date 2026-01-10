/**
 * Hook for managing Routine Lists
 * CRUD operations for shopping list templates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { RoutineList, RoutineListItem, CreateRoutineList, CreateRoutineListItem } from '../types';

interface UseRoutineListsOptions {
    businessId: string | null;
}

interface UseRoutineListsReturn {
    lists: RoutineList[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    // List CRUD
    createList: (data: CreateRoutineList) => Promise<{ data: RoutineList | null; error: string | null }>;
    updateList: (id: string, data: Partial<CreateRoutineList>) => Promise<{ error: string | null }>;
    deleteList: (id: string) => Promise<{ error: string | null }>;
    // Item operations
    getListItems: (listId: string) => Promise<{ data: RoutineListItem[]; error: string | null }>;
    addListItem: (item: CreateRoutineListItem) => Promise<{ error: string | null }>;
    updateListItem: (id: string, data: Partial<CreateRoutineListItem>) => Promise<{ error: string | null }>;
    deleteListItem: (id: string) => Promise<{ error: string | null }>;
    // Apply to shopping list
    applyToShoppingList: (listId: string, userId: string) => Promise<{ added: number; error: string | null }>;
}

export function useRoutineLists({ businessId }: UseRoutineListsOptions): UseRoutineListsReturn {
    const [lists, setLists] = useState<RoutineList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all routine lists for business
    const fetchLists = useCallback(async () => {
        if (!businessId) {
            setLists([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: queryError } = await supabase
                .from('routine_lists')
                .select(`
                    *,
                    routine_list_items(count)
                `)
                .eq('business_id', businessId)
                .order('name', { ascending: true });

            if (queryError) throw queryError;

            // Map to include item count
            const mapped = (data ?? []).map((list: any) => ({
                ...list,
                item_count: list.routine_list_items?.[0]?.count || 0,
                routine_list_items: undefined,
            }));

            setLists(mapped);
        } catch (err: any) {
            console.error('Error fetching routine lists:', err);
            setError(err.message || 'Failed to load routine lists');
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        fetchLists();
    }, [fetchLists]);

    // Create a new routine list
    const createList = useCallback(async (data: CreateRoutineList): Promise<{ data: RoutineList | null; error: string | null }> => {
        try {
            const { data: newList, error } = await supabase
                .from('routine_lists')
                .insert({
                    business_id: data.business_id,
                    name: data.name,
                    description: data.description || null,
                    created_by: (await supabase.auth.getUser()).data.user?.id,
                })
                .select()
                .single();

            if (error) throw error;
            await fetchLists();
            return { data: newList, error: null };
        } catch (err: any) {
            return { data: null, error: err.message || 'Failed to create list' };
        }
    }, [fetchLists]);

    // Update a routine list
    const updateList = useCallback(async (id: string, data: Partial<CreateRoutineList>): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase
                .from('routine_lists')
                .update({
                    name: data.name,
                    description: data.description,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) throw error;
            await fetchLists();
            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Failed to update list' };
        }
    }, [fetchLists]);

    // Delete a routine list
    const deleteList = useCallback(async (id: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase
                .from('routine_lists')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchLists();
            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Failed to delete list' };
        }
    }, [fetchLists]);

    // Get items for a specific list
    const getListItems = useCallback(async (listId: string): Promise<{ data: RoutineListItem[]; error: string | null }> => {
        try {
            const { data, error } = await supabase
                .from('routine_list_items')
                .select('*')
                .eq('routine_list_id', listId)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (err: any) {
            return { data: [], error: err.message || 'Failed to fetch items' };
        }
    }, []);

    // Add item to a list
    const addListItem = useCallback(async (item: CreateRoutineListItem): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase
                .from('routine_list_items')
                .insert({
                    routine_list_id: item.routine_list_id,
                    item_name: item.item_name,
                    quantity_needed: item.quantity_needed,
                    unit: item.unit,
                    category: item.category || null,
                    supplier: item.supplier || null,
                    notes: item.notes || null,
                    sort_order: item.sort_order || 0,
                });

            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Failed to add item' };
        }
    }, []);

    // Update a list item
    const updateListItem = useCallback(async (id: string, data: Partial<CreateRoutineListItem>): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase
                .from('routine_list_items')
                .update(data)
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Failed to update item' };
        }
    }, []);

    // Delete a list item
    const deleteListItem = useCallback(async (id: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase
                .from('routine_list_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Failed to delete item' };
        }
    }, []);

    // Apply routine list items to shopping list
    const applyToShoppingList = useCallback(async (listId: string, userId: string): Promise<{ added: number; error: string | null }> => {
        try {
            // Get routine list items
            const { data: items, error: itemsError } = await getListItems(listId);
            if (itemsError) throw new Error(itemsError);

            // Get the routine list to get business_id
            const list = lists.find(l => l.id === listId);
            if (!list) throw new Error('List not found');

            // Insert each item into shopping_list
            let added = 0;
            for (const item of items) {
                const { error } = await supabase.from('shopping_list').insert({
                    business_id: list.business_id,
                    item_name: item.item_name,
                    quantity_needed: item.quantity_needed,
                    unit: item.unit,
                    category: item.category,
                    reason: 'manual' as const,
                    priority: 'normal' as const,
                    status: 'pending' as const,
                    created_by: userId,
                    notes: item.notes,
                });

                if (!error) added++;
            }

            return { added, error: null };
        } catch (err: any) {
            return { added: 0, error: err.message || 'Failed to apply list' };
        }
    }, [lists, getListItems]);

    return {
        lists,
        loading,
        error,
        refetch: fetchLists,
        createList,
        updateList,
        deleteList,
        getListItems,
        addListItem,
        updateListItem,
        deleteListItem,
        applyToShoppingList,
    };
}
