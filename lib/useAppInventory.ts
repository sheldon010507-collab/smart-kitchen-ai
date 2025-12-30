/**
 * useAppInventory - Bridge hook for inventory management
 * 
 * This hook connects the InventoryContext with App.tsx's local state,
 * allowing gradual migration without breaking existing functionality.
 * 
 * Usage in App.tsx:
 * const { inventory, loadInventory, ... } = useAppInventory(currentBusinessId);
 */

import { useEffect, useCallback } from 'react';
import { useInventoryContext } from './InventoryContext';
import { InventoryItem } from '../types';

interface UseAppInventoryOptions {
    currentBusinessId: string | null;
    isMasterView: boolean;
    onInventoryChange?: (inventory: InventoryItem[]) => void;
}

export function useAppInventory(options: UseAppInventoryOptions) {
    const { currentBusinessId, isMasterView, onInventoryChange } = options;

    const ctx = useInventoryContext();

    // Load inventory when business changes
    useEffect(() => {
        if (currentBusinessId) {
            ctx.loadInventory(currentBusinessId);
        }
    }, [currentBusinessId, ctx.loadInventory]);

    // Notify parent when inventory changes
    useEffect(() => {
        if (onInventoryChange) {
            onInventoryChange(ctx.inventory);
        }
    }, [ctx.inventory, onInventoryChange]);

    // Get filtered inventory
    const filteredInventory = ctx.getFilteredInventory(currentBusinessId, isMasterView);

    // Wrapped handlers that include businessId
    const handleScanResult = useCallback(async (items: InventoryItem[]) => {
        if (!currentBusinessId) return;
        await ctx.addItems(items, currentBusinessId);
    }, [currentBusinessId, ctx.addItems]);

    const handleSaveItem = useCallback(async (item: InventoryItem): Promise<boolean> => {
        return ctx.updateItem(item);
    }, [ctx.updateItem]);

    const handleDeleteItem = useCallback(async (id: string): Promise<boolean> => {
        if (!currentBusinessId) return false;
        return ctx.deleteItem(id, currentBusinessId);
    }, [currentBusinessId, ctx.deleteItem]);

    return {
        // State
        inventory: ctx.inventory,
        filteredInventory,
        loading: ctx.loading,

        // Actions
        loadInventory: ctx.loadInventory,
        handleScanResult,
        handleSaveItem,
        handleDeleteItem,
        clearInventoryForBusiness: ctx.clearInventoryForBusiness,
    };
}
