import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import { InventoryItem } from '../types';

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
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// ============ Helper Functions ============
const toISODate = (dateStr: string | undefined | null): string | null => {
    if (!dateStr) return null;
    const v = dateStr.trim();
    if (!v) return null;
    // Already YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // dd/mm/yyyy format
    const match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
};

const mapDbRowToInventoryItem = (r: any): InventoryItem => {
    const qtyVal = Number(r.quantity_value ?? 0);
    const qtyUnit = (r.quantity_unit ?? 'pcs') as string;

    return {
        id: r.id,
        businessId: r.business_id,
        name: r.name,
        category: r.category || '',
        location: r.location || '',
        unitCost: Number(r.unit_cost ?? 0),
        quantityValue: qtyVal,
        quantityUnit: qtyUnit,
        quantity: `${qtyVal} ${qtyUnit}`,
        expiryDate: r.expiry_date || '',
        addedDate: r.added_date || '',
    };
};

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
