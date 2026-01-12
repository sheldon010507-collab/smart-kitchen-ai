import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import { InventoryItem } from '../types';
import { mapDbRowToInventoryItem } from '../utils/transforms';
import { toISODate } from '../utils/dateUtils';

// ============ Types ============
interface InventoryContextType {
    // State
    inventory: InventoryItem[];
    loading: boolean;

    // Actions
    loadInventory: (businessId: string) => Promise<void>;
    addItems: (items: InventoryItem[], businessId: string) => Promise<void>;
    updateItem: (item: InventoryItem) => Promise<boolean>;
    deleteItem: (id: string, businessId: string) => Promise<boolean>;
    getFilteredInventory: (businessId: string | null, isMasterView: boolean) => InventoryItem[];
    clearInventoryForBusiness: (businessId: string) => void;

    // Setup Wizard Functions
    deleteAllInventoryForBusiness: (businessId: string) => Promise<boolean>;
    addItemsWithDbCheck: (items: InventoryItem[], businessId: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// ✅ toISODate 已統一至 utils/dateUtils.ts
// ✅ mapDbRowToInventoryItem 已統一至 utils/transforms.ts

// ============ Provider ============
interface InventoryProviderProps {
    children: ReactNode;
}

export function InventoryProvider({ children }: InventoryProviderProps) {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadInventory = useCallback(async (businessId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .eq('business_id', businessId)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('loadInventory error:', error);
                return;
            }

            setInventory((data || []).map(mapDbRowToInventoryItem));
        } catch (e) {
            console.error('loadInventory exception:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const addItems = useCallback(async (items: InventoryItem[], businessId: string) => {
        const itemsWithBiz = items.map(i => ({ ...i, businessId }));

        try {
            for (const newItem of itemsWithBiz) {
                const matched = inventory.find(
                    i => i.businessId === businessId &&
                        i.name.trim().toLowerCase() === (newItem.name || '').trim().toLowerCase()
                );

                if (matched) {
                    // Update existing item
                    const newQtyValue = Number(matched.quantityValue || 0) + Number(newItem.quantityValue || 0);

                    const payload = {
                        name: matched.name,
                        canonical_name: matched.name,
                        category: newItem.category || matched.category || null,
                        location: newItem.location || matched.location || null,
                        quantity_value: newQtyValue,
                        quantity_unit: matched.quantityUnit || newItem.quantityUnit || 'pcs',
                        unit_cost: Number(newItem.unitCost ?? matched.unitCost ?? 0),
                        expiry_date: toISODate(newItem.expiryDate) || toISODate(matched.expiryDate),
                    };

                    await supabase
                        .from('inventory_items')
                        .update(payload)
                        .eq('id', matched.id)
                        .eq('business_id', businessId);
                } else {
                    // Insert new item
                    const payload = {
                        business_id: businessId,
                        name: newItem.name,
                        canonical_name: newItem.name,
                        category: newItem.category || null,
                        location: newItem.location || null,
                        quantity_value: Number(newItem.quantityValue || 0),
                        quantity_unit: newItem.quantityUnit || 'pcs',
                        unit_cost: Number(newItem.unitCost || 0),
                        expiry_date: toISODate(newItem.expiryDate),
                        added_date: new Date().toISOString().split('T')[0],
                        min_stock_level: newItem.minStockLevel || null,
                        supplier: newItem.supplier || null,
                        notes: newItem.notes || null,
                    };

                    await supabase.from('inventory_items').insert(payload);
                }
            }

            // Reload after changes
            await loadInventory(businessId);
        } catch (e: any) {
            console.error('addItems error:', e);
            throw e;
        }
    }, [inventory, loadInventory]);

    const updateItem = useCallback(async (item: InventoryItem): Promise<boolean> => {
        if (!item.businessId) return false;

        const payload = {
            business_id: item.businessId,
            name: item.name,
            canonical_name: item.name,
            category: item.category || null,
            location: item.location || null,
            quantity_value: Number(item.quantityValue || 0),
            quantity_unit: item.quantityUnit || 'pcs',
            unit_cost: Number(item.unitCost || 0),
            expiry_date: toISODate(item.expiryDate),
            added_date: toISODate(item.addedDate) || new Date().toISOString().split('T')[0],
            min_stock_level: item.minStockLevel || null,
            supplier: item.supplier || null,
            notes: item.notes || null,
        };

        try {
            const { error } = await supabase
                .from('inventory_items')
                .update(payload)
                .eq('id', item.id)
                .eq('business_id', item.businessId);

            if (error) throw error;

            setInventory(prev => prev.map(i => i.id === item.id ? item : i));
            return true;
        } catch (e: any) {
            console.error('updateItem error:', e);
            return false;
        }
    }, []);

    const deleteItem = useCallback(async (id: string, businessId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('inventory_items')
                .delete()
                .eq('id', id)
                .eq('business_id', businessId);

            if (error) throw error;

            setInventory(prev => prev.filter(i => i.id !== id));
            return true;
        } catch (e: any) {
            console.error('deleteItem error:', e);
            return false;
        }
    }, []);

    const getFilteredInventory = useCallback((
        businessId: string | null,
        isMasterView: boolean
    ): InventoryItem[] => {
        return isMasterView
            ? inventory
            : inventory.filter(i => i.businessId === businessId);
    }, [inventory]);

    const clearInventoryForBusiness = useCallback((businessId: string) => {
        setInventory(prev => prev.filter(i => i.businessId !== businessId));
    }, []);

    /**
     * Delete ALL inventory items for a business from DATABASE
     * Use for "Overwrite" merge strategy in Setup Wizard
     */
    const deleteAllInventoryForBusiness = useCallback(async (businessId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('inventory_items')
                .delete()
                .eq('business_id', businessId);

            if (error) throw error;

            // Also clear local state
            setInventory(prev => prev.filter(i => i.businessId !== businessId));
            return true;
        } catch (e: any) {
            console.error('deleteAllInventoryForBusiness error:', e);
            return false;
        }
    }, []);

    /**
     * Add items with fresh DB check to prevent multi-tab duplicates
     * Fetches latest inventory from DB before duplicate detection
     */
    const addItemsWithDbCheck = useCallback(async (items: InventoryItem[], businessId: string): Promise<void> => {
        // Fetch latest state from DB to prevent multi-tab race conditions
        const { data: dbItems, error: fetchError } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('business_id', businessId);

        if (fetchError) {
            console.error('addItemsWithDbCheck fetch error:', fetchError);
            throw fetchError;
        }

        const existingItems = (dbItems || []).map(mapDbRowToInventoryItem);
        const existingNamesLower = new Set(
            existingItems.map(i => i.name.trim().toLowerCase())
        );

        try {
            for (const newItem of items) {
                const nameLower = (newItem.name || '').trim().toLowerCase();
                const matched = existingItems.find(
                    i => i.name.trim().toLowerCase() === nameLower
                );

                if (matched) {
                    // Update existing item (accumulate quantity)
                    const newQtyValue = Number(matched.quantityValue || 0) + Number(newItem.quantityValue || 0);

                    const payload = {
                        name: matched.name,
                        canonical_name: matched.name,
                        category: newItem.category || matched.category || null,
                        location: newItem.location || matched.location || null,
                        quantity_value: newQtyValue,
                        quantity_unit: matched.quantityUnit || newItem.quantityUnit || 'pcs',
                        unit_cost: Number(newItem.unitCost ?? matched.unitCost ?? 0),
                        expiry_date: toISODate(newItem.expiryDate) || toISODate(matched.expiryDate),
                        // 🆕 Add min_stock_level to update payload
                        min_stock_level: newItem.minStockLevel ?? matched.minStockLevel ?? null,
                        supplier: newItem.supplier || matched.supplier || null,
                        notes: newItem.notes || matched.notes || null,
                    };

                    await supabase
                        .from('inventory_items')
                        .update(payload)
                        .eq('id', matched.id)
                        .eq('business_id', businessId);
                } else {
                    // Insert new item
                    const payload = {
                        business_id: businessId,
                        name: newItem.name,
                        canonical_name: newItem.name,
                        category: newItem.category || null,
                        location: newItem.location || null,
                        quantity_value: Number(newItem.quantityValue || 0),
                        quantity_unit: newItem.quantityUnit || 'pcs',
                        unit_cost: Number(newItem.unitCost || 0),
                        expiry_date: toISODate(newItem.expiryDate),
                        added_date: new Date().toISOString().split('T')[0],
                        // 🐛 Fix: Use ?? instead of || to preserve 0 values
                        min_stock_level: newItem.minStockLevel ?? null,
                        supplier: newItem.supplier || null,
                        notes: newItem.notes || null,
                    };

                    await supabase.from('inventory_items').insert(payload);

                    // Add to existingNamesLower to prevent duplicates within same batch
                    existingNamesLower.add(nameLower);
                }
            }

            // Reload after changes
            await loadInventory(businessId);
        } catch (e: any) {
            console.error('addItemsWithDbCheck error:', e);
            throw e;
        }
    }, [loadInventory]);

    // ============ Context Value ============
    const value: InventoryContextType = {
        inventory,
        loading,
        loadInventory,
        addItems,
        updateItem,
        deleteItem,
        getFilteredInventory,
        clearInventoryForBusiness,
        deleteAllInventoryForBusiness,
        addItemsWithDbCheck,
    };

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    );
}

// ============ Hook ============
export function useInventoryContext() {
    const context = useContext(InventoryContext);
    if (context === undefined) {
        throw new Error('useInventoryContext must be used within an InventoryProvider');
    }
    return context;
}
