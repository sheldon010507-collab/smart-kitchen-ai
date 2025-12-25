/**
 * Hook for auto-generating shopping list items
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { AutoGenerateOptions, AutoGenerateResult, GeneratedShoppingItem } from '../types';
import { DEFAULT_AUTO_GENERATE_OPTIONS } from '../constants';
import { generateShoppingList, insertGeneratedItems } from '../utils/generateShoppingList';

interface UseAutoGenerateReturn {
    loading: boolean;
    result: AutoGenerateResult | null;
    generate: (options?: Partial<AutoGenerateOptions>) => Promise<AutoGenerateResult>;
    insertItems: (items: GeneratedShoppingItem[]) => Promise<{ inserted: number; errors: string[] }>;
    clear: () => void;
}

export function useAutoGenerate(
    businessId: string | null,
    userId: string | null
): UseAutoGenerateReturn {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AutoGenerateResult | null>(null);

    /**
     * Generate shopping list items based on inventory analysis
     */
    const generate = useCallback(async (
        options?: Partial<AutoGenerateOptions>
    ): Promise<AutoGenerateResult> => {
        if (!businessId) {
            const emptyResult: AutoGenerateResult = { items: [], skipped: 0, errors: ['No business selected'] };
            setResult(emptyResult);
            return emptyResult;
        }

        setLoading(true);
        try {
            const mergedOptions: AutoGenerateOptions = {
                ...DEFAULT_AUTO_GENERATE_OPTIONS,
                ...options,
            };

            const genResult = await generateShoppingList(businessId, mergedOptions, supabase);
            setResult(genResult);
            return genResult;
        } catch (err: any) {
            const errorResult: AutoGenerateResult = {
                items: [],
                skipped: 0,
                errors: [err.message || 'Generation failed'],
            };
            setResult(errorResult);
            return errorResult;
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    /**
     * Insert generated items into database
     */
    const insertItems = useCallback(async (
        items: GeneratedShoppingItem[]
    ): Promise<{ inserted: number; errors: string[] }> => {
        if (!businessId || !userId) {
            return { inserted: 0, errors: ['Not authenticated or no business selected'] };
        }

        setLoading(true);
        try {
            return await insertGeneratedItems(businessId, items, userId, supabase);
        } finally {
            setLoading(false);
        }
    }, [businessId, userId]);

    /**
     * Clear generation result
     */
    const clear = useCallback(() => {
        setResult(null);
    }, []);

    return {
        loading,
        result,
        generate,
        insertItems,
        clear,
    };
}
