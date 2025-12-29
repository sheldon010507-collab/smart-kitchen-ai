/**
 * useInventoryScan Hook - Manages the inventory scanning workflow
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { recognizeInventoryImage, mergeRecognizedItems } from '../services/visionService';
import { calculateRequirements } from '../utils/calculateRequirements';
import {
    ScanAreaType,
    RecognizedItem,
    RequirementCalculation,
    ScanState,
    SKUWithState
} from '../types';

interface UseInventoryScanResult {
    // State
    scanState: ScanState;
    calculation: RequirementCalculation | null;
    isCalculating: boolean;

    // Actions
    startScan: (area: ScanAreaType, imageBase64: string, mimeType?: string) => Promise<void>;
    confirmScan: () => Promise<void>;
    adjustQuantity: (itemIndex: number, newQuantity: number) => void;
    removeItem: (itemIndex: number) => void;
    resetScan: () => void;
    runCalculation: () => Promise<void>;
}

export function useInventoryScan(businessId: string): UseInventoryScanResult {
    const [scanState, setScanState] = useState<ScanState>({
        isScanning: false,
        currentArea: null,
        recognizedItems: [],
        error: null
    });

    const [calculation, setCalculation] = useState<RequirementCalculation | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [pendingUpdates, setPendingUpdates] = useState<Map<string, number>>(new Map());

    // Start scanning an area
    const startScan = useCallback(async (
        area: ScanAreaType,
        imageBase64: string,
        mimeType: string = 'image/jpeg'
    ) => {
        setScanState(prev => ({
            ...prev,
            isScanning: true,
            currentArea: area,
            error: null,
            recognizedItems: []
        }));

        try {
            // Fetch known SKUs for this business
            const { data: skus, error: skuError } = await supabase
                .from('sku_master')
                .select('id, name, unit, sku_code')
                .eq('business_id', businessId);

            if (skuError) {
                throw new Error(skuError.message);
            }

            // Call AI recognition
            const recognized = await recognizeInventoryImage(
                imageBase64,
                mimeType,
                area,
                skus || []
            );

            setScanState(prev => ({
                ...prev,
                isScanning: false,
                recognizedItems: recognized
            }));

        } catch (error) {
            console.error('Scan error:', error);
            setScanState(prev => ({
                ...prev,
                isScanning: false,
                error: error instanceof Error ? error.message : 'Scan failed'
            }));
        }
    }, [businessId]);

    // Adjust recognized quantity manually
    const adjustQuantity = useCallback((itemIndex: number, newQuantity: number) => {
        setScanState(prev => ({
            ...prev,
            recognizedItems: prev.recognizedItems.map((item, i) =>
                i === itemIndex ? { ...item, quantity: Math.max(0, newQuantity) } : item
            )
        }));
    }, []);

    // Remove an item from recognition results
    const removeItem = useCallback((itemIndex: number) => {
        setScanState(prev => ({
            ...prev,
            recognizedItems: prev.recognizedItems.filter((_, i) => i !== itemIndex)
        }));
    }, []);

    // Confirm scan results and save to database
    const confirmScan = useCallback(async () => {
        const { recognizedItems, currentArea } = scanState;

        try {
            // Update inventory state for matched items
            for (const item of recognizedItems) {
                if (item.matched_sku_id) {
                    // Upsert inventory state
                    const { error } = await supabase
                        .from('inventory_state')
                        .upsert({
                            business_id: businessId,
                            sku_id: item.matched_sku_id,
                            current_qty: item.quantity,
                            last_scanned_at: new Date().toISOString(),
                            confidence_score: item.confidence
                        }, {
                            onConflict: 'business_id,sku_id'
                        });

                    if (error) {
                        console.error('Failed to update inventory state:', error);
                    }

                    // Track pending updates for calculation
                    setPendingUpdates(prev => new Map(prev).set(item.matched_sku_id!, item.quantity));
                }
            }

            // Record scan history
            if (currentArea) {
                await supabase
                    .from('scan_history')
                    .insert({
                        business_id: businessId,
                        scan_type: currentArea,
                        recognized_items: recognizedItems
                    });
            }

        } catch (error) {
            console.error('Confirm scan error:', error);
            throw error;
        }
    }, [scanState, businessId]);

    // Run requirement calculation
    const runCalculation = useCallback(async () => {
        setIsCalculating(true);

        try {
            // Fetch all SKUs with inventory state
            const { data: skus, error: skuError } = await supabase
                .from('sku_master')
                .select(`
          *,
          inventory_state (current_qty)
        `)
                .eq('business_id', businessId);

            if (skuError) {
                throw new Error(skuError.message);
            }

            if (!skus || skus.length === 0) {
                setCalculation({
                    prep_list: [],
                    shopping_list: [],
                    summary: { total_prep_items: 0, total_shopping_items: 0, estimated_prep_time: 0 }
                });
                return;
            }

            // Separate raw and prep items, apply pending updates
            const rawItems: SKUWithState[] = skus
                .filter(s => s.type === 'raw')
                .map(s => ({
                    ...s,
                    current_qty: pendingUpdates.get(s.id) ?? s.inventory_state?.[0]?.current_qty ?? 0
                }));

            const prepItems: SKUWithState[] = skus
                .filter(s => s.type === 'prep')
                .map(s => ({
                    ...s,
                    current_qty: pendingUpdates.get(s.id) ?? s.inventory_state?.[0]?.current_qty ?? 0
                }));

            // Execute calculation
            const result = calculateRequirements(rawItems, prepItems);
            setCalculation(result);

        } catch (error) {
            console.error('Calculation error:', error);
        } finally {
            setIsCalculating(false);
        }
    }, [businessId, pendingUpdates]);

    // Reset scan state
    const resetScan = useCallback(() => {
        setScanState({
            isScanning: false,
            currentArea: null,
            recognizedItems: [],
            error: null
        });
        setPendingUpdates(new Map());
        setCalculation(null);
    }, []);

    return {
        scanState,
        calculation,
        isCalculating,
        startScan,
        confirmScan,
        adjustQuantity,
        removeItem,
        resetScan,
        runCalculation
    };
}
