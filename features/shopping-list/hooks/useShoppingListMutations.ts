/**
 * Hook for shopping list CRUD mutations
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type {
    ShoppingListItem,
    CreateShoppingListItem,
    UpdateShoppingListItem,
    ShoppingListStatus
} from '../types';

interface MutationResult<T = void> {
    data?: T;
    error: string | null;
}

interface UseShoppingListMutationsReturn {
    loading: boolean;
    addItem: (item: CreateShoppingListItem) => Promise<MutationResult<ShoppingListItem>>;
    updateItem: (item: UpdateShoppingListItem) => Promise<MutationResult<ShoppingListItem>>;
    deleteItem: (id: string) => Promise<MutationResult>;
    markAsPurchased: (id: string) => Promise<MutationResult>;
    markAsCancelled: (id: string) => Promise<MutationResult>;
    markAsPending: (id: string) => Promise<MutationResult>;
    bulkUpdateStatus: (ids: string[], status: ShoppingListStatus) => Promise<MutationResult<number>>;
}

export function useShoppingListMutations(userId: string | null): UseShoppingListMutationsReturn {
    const [loading, setLoading] = useState(false);

    /**
     * Add a new shopping list item
     */
    const addItem = useCallback(async (item: CreateShoppingListItem): Promise<MutationResult<ShoppingListItem>> => {
        if (!userId) {
            return { error: 'Not authenticated' };
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('shopping_list')
                .insert({
                    ...item,
                    created_by: userId,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { data, error: null };
        } catch (err: any) {
            console.error('Error adding shopping list item:', err);
            return { error: err.message || 'Failed to add item' };
        } finally {
            setLoading(false);
        }
    }, [userId]);

    /**
     * Update an existing shopping list item
     */
    const updateItem = useCallback(async (item: UpdateShoppingListItem): Promise<MutationResult<ShoppingListItem>> => {
        if (!userId) {
            return { error: 'Not authenticated' };
        }

        setLoading(true);
        try {
            const { id, ...updates } = item;

            const { data, error } = await supabase
                .from('shopping_list')
                .update({
                    ...updates,
                    updated_by: userId,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { data, error: null };
        } catch (err: any) {
            console.error('Error updating shopping list item:', err);
            return { error: err.message || 'Failed to update item' };
        } finally {
            setLoading(false);
        }
    }, [userId]);

    /**
     * Delete a shopping list item
     */
    const deleteItem = useCallback(async (id: string): Promise<MutationResult> => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('shopping_list')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            return { error: null };
        } catch (err: any) {
            console.error('Error deleting shopping list item:', err);
            return { error: err.message || 'Failed to delete item' };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Update status of an item
     */
    const updateStatus = useCallback(async (id: string, status: ShoppingListStatus): Promise<MutationResult> => {
        if (!userId) {
            return { error: 'Not authenticated' };
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('shopping_list')
                .update({
                    status,
                    updated_by: userId,
                })
                .eq('id', id);

            if (error) {
                throw error;
            }

            return { error: null };
        } catch (err: any) {
            console.error('Error updating item status:', err);
            return { error: err.message || 'Failed to update status' };
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const markAsPurchased = useCallback((id: string) => updateStatus(id, 'purchased'), [updateStatus]);
    const markAsCancelled = useCallback((id: string) => updateStatus(id, 'cancelled'), [updateStatus]);
    const markAsPending = useCallback((id: string) => updateStatus(id, 'pending'), [updateStatus]);

    /**
     * Bulk update status for multiple items
     */
    const bulkUpdateStatus = useCallback(async (ids: string[], status: ShoppingListStatus): Promise<MutationResult<number>> => {
        if (!userId) {
            return { error: 'Not authenticated' };
        }

        if (ids.length === 0) {
            return { data: 0, error: null };
        }

        setLoading(true);
        try {
            const { error, count } = await supabase
                .from('shopping_list')
                .update({
                    status,
                    updated_by: userId,
                })
                .in('id', ids);

            if (error) {
                throw error;
            }

            return { data: count ?? ids.length, error: null };
        } catch (err: any) {
            console.error('Error bulk updating status:', err);
            return { error: err.message || 'Failed to update items' };
        } finally {
            setLoading(false);
        }
    }, [userId]);

    return {
        loading,
        addItem,
        updateItem,
        deleteItem,
        markAsPurchased,
        markAsCancelled,
        markAsPending,
        bulkUpdateStatus,
    };
}
