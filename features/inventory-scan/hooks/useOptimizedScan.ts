/**
 * useOptimizedScan Hook - Manages the optimized scan workflow
 */

import { useState, useCallback } from 'react';
import { scanInventoryOptimized, RecognizedItem, ScanResult, ScanOptions } from '../services/optimizedVisionService';
import { ScanAreaType } from '../services/promptTemplates';
import { supabase } from '../../../lib/supabase';

interface ScanProgress {
    percent: number;
    message: string;
}

interface UseOptimizedScanResult {
    // State
    isScanning: boolean;
    progress: ScanProgress;
    result: ScanResult | null;
    partialItems: RecognizedItem[];
    error: string | null;

    // Actions
    startScan: (images: File[], scanArea?: ScanAreaType) => Promise<void>;
    adjustQuantity: (index: number, quantity: number) => void;
    removeItem: (index: number) => void;
    confirmAndSave: () => Promise<boolean>;
    reset: () => void;
}

export function useOptimizedScan(businessId: string): UseOptimizedScanResult {
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState<ScanProgress>({ percent: 0, message: '' });
    const [result, setResult] = useState<ScanResult | null>(null);
    const [partialItems, setPartialItems] = useState<RecognizedItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Start scanning
    const startScan = useCallback(async (
        images: File[],
        scanArea: ScanAreaType = 'fridge'
    ) => {
        if (images.length === 0) {
            setError('Please select at least one image');
            return;
        }

        setIsScanning(true);
        setError(null);
        setResult(null);
        setPartialItems([]);
        setProgress({ percent: 0, message: 'Starting...' });

        try {
            const scanResult = await scanInventoryOptimized({
                images,
                scanArea,
                businessId,
                onProgress: (percent, message) => {
                    setProgress({ percent, message });
                },
                onPartialResult: (items) => {
                    setPartialItems(items);
                }
            });

            setResult(scanResult);
            setPartialItems([]);

        } catch (err) {
            console.error('Scan error:', err);
            setError(err instanceof Error ? err.message : 'Scan failed');
        } finally {
            setIsScanning(false);
        }
    }, [businessId]);

    // Adjust quantity manually
    const adjustQuantity = useCallback((index: number, quantity: number) => {
        if (!result) return;

        setResult(prev => {
            if (!prev) return prev;
            const newItems = [...prev.items];
            newItems[index] = {
                ...newItems[index],
                quantity: Math.max(0, quantity)
            };
            return { ...prev, items: newItems };
        });
    }, [result]);

    // Remove an item
    const removeItem = useCallback((index: number) => {
        if (!result) return;

        setResult(prev => {
            if (!prev) return prev;
            const newItems = prev.items.filter((_, i) => i !== index);
            return { ...prev, items: newItems };
        });
    }, [result]);

    // Confirm and save to inventory
    const confirmAndSave = useCallback(async (): Promise<boolean> => {
        if (!result || result.items.length === 0) return false;

        try {
            for (const item of result.items) {
                if (item.matched_inventory_id) {
                    // Update existing inventory item
                    const { error: updateError } = await supabase
                        .from('inventory_items')
                        .update({
                            quantity_value: item.quantity,
                            quantity_unit: item.unit,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', item.matched_inventory_id);

                    if (updateError) {
                        console.error('Update error:', updateError);
                    }
                } else {
                    // Insert new inventory item
                    const { error: insertError } = await supabase
                        .from('inventory_items')
                        .insert({
                            business_id: businessId,
                            name: item.name,
                            canonical_name: item.name,
                            quantity_value: item.quantity,
                            quantity_unit: item.unit,
                            category: null,
                            location: null
                        });

                    if (insertError) {
                        console.error('Insert error:', insertError);
                    }
                }
            }

            // Record scan history (if table exists)
            try {
                await supabase
                    .from('scan_history')
                    .insert({
                        business_id: businessId,
                        scan_type: 'fridge',
                        recognized_items: result.items
                    });
            } catch (e) {
                // Ignore if table doesn't exist
            }

            return true;
        } catch (err) {
            console.error('Save error:', err);
            setError('Failed to save changes');
            return false;
        }
    }, [result, businessId]);

    // Reset state
    const reset = useCallback(() => {
        setIsScanning(false);
        setProgress({ percent: 0, message: '' });
        setResult(null);
        setPartialItems([]);
        setError(null);
    }, []);

    return {
        isScanning,
        progress,
        result,
        partialItems,
        error,
        startScan,
        adjustQuantity,
        removeItem,
        confirmAndSave,
        reset
    };
}
