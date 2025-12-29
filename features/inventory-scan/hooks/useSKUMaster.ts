/**
 * useSKUMaster Hook - Manages SKU master data
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { SKUMaster, CreateSKU, SKUType } from '../types';

interface UseSKUMasterResult {
    skus: SKUMaster[];
    rawItems: SKUMaster[];
    prepItems: SKUMaster[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadSKUs: () => Promise<void>;
    createSKU: (sku: CreateSKU) => Promise<SKUMaster | null>;
    updateSKU: (id: string, updates: Partial<SKUMaster>) => Promise<boolean>;
    deleteSKU: (id: string) => Promise<boolean>;
}

export function useSKUMaster(businessId: string): UseSKUMasterResult {
    const [skus, setSKUs] = useState<SKUMaster[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Derived lists
    const rawItems = skus.filter(s => s.type === 'raw');
    const prepItems = skus.filter(s => s.type === 'prep');

    // Load all SKUs for the business
    const loadSKUs = useCallback(async () => {
        if (!businessId) return;

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('sku_master')
                .select('*')
                .eq('business_id', businessId)
                .order('type', { ascending: true })
                .order('name', { ascending: true });

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            setSKUs(data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load SKUs';
            setError(message);
            console.error('Load SKUs error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [businessId]);

    // Create a new SKU
    const createSKU = useCallback(async (sku: CreateSKU): Promise<SKUMaster | null> => {
        try {
            const { data, error: insertError } = await supabase
                .from('sku_master')
                .insert({
                    ...sku,
                    business_id: businessId
                })
                .select()
                .single();

            if (insertError) {
                throw new Error(insertError.message);
            }

            if (data) {
                setSKUs(prev => [...prev, data]);
                return data;
            }

            return null;
        } catch (err) {
            console.error('Create SKU error:', err);
            throw err;
        }
    }, [businessId]);

    // Update an existing SKU
    const updateSKU = useCallback(async (id: string, updates: Partial<SKUMaster>): Promise<boolean> => {
        try {
            const { error: updateError } = await supabase
                .from('sku_master')
                .update(updates)
                .eq('id', id)
                .eq('business_id', businessId);

            if (updateError) {
                throw new Error(updateError.message);
            }

            setSKUs(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
            return true;
        } catch (err) {
            console.error('Update SKU error:', err);
            return false;
        }
    }, [businessId]);

    // Delete a SKU
    const deleteSKU = useCallback(async (id: string): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase
                .from('sku_master')
                .delete()
                .eq('id', id)
                .eq('business_id', businessId);

            if (deleteError) {
                throw new Error(deleteError.message);
            }

            setSKUs(prev => prev.filter(s => s.id !== id));
            return true;
        } catch (err) {
            console.error('Delete SKU error:', err);
            return false;
        }
    }, [businessId]);

    // Load SKUs on mount
    useEffect(() => {
        if (businessId) {
            loadSKUs();
        }
    }, [businessId, loadSKUs]);

    return {
        skus,
        rawItems,
        prepItems,
        isLoading,
        error,
        loadSKUs,
        createSKU,
        updateSKU,
        deleteSKU
    };
}
