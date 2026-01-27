/**
 * useRecipeCosting Hook
 * 
 * 動態計算菜品成本（基於實時庫存價格）
 * - 從 menu_ingredients 表獲取配方 BOM
 * - 與當前 inventory 價格聯動
 * - 返回實時成本
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { MenuIngredient, InventoryItem } from '../../../types';

interface MenuIngredientRow {
    id: string;
    menu_item_id: string;
    inventory_id: string | null;
    ingredient_name: string;
    quantity_used: number;
    unit_used: string;
    cost_per_unit: number | null;
    created_at: string;
}

export function useRecipeCosting(menuItemId: string | null, inventory: InventoryItem[]) {
    const [ingredients, setIngredients] = useState<MenuIngredient[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!menuItemId) {
            setIngredients([]);
            return;
        }

        loadIngredients();
    }, [menuItemId]);

    const loadIngredients = async () => {
        if (!menuItemId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('menu_ingredients')
                .select('*')
                .eq('menu_item_id', menuItemId);

            if (error) throw error;

            // Map snake_case to camelCase
            const mappedIngredients: MenuIngredient[] = (data || []).map((row: MenuIngredientRow) => ({
                id: row.id,
                menuItemId: row.menu_item_id,
                inventoryId: row.inventory_id,
                ingredientName: row.ingredient_name,
                quantityUsed: row.quantity_used,
                unitUsed: row.unit_used,
                costPerUnit: row.cost_per_unit,
                createdAt: row.created_at,
            }));

            setIngredients(mappedIngredients);
        } catch (err) {
            console.error('Failed to load recipe ingredients:', err);
            setIngredients([]);
        } finally {
            setLoading(false);
        }
    };

    // 計算實時成本
    const realTimeCost = useMemo(() => {
        if (ingredients.length === 0) return null;

        let totalCost = 0;
        let hasAllPrices = true;

        for (const ingredient of ingredients) {
            // 嘗試從庫存中找到對應的 item
            const inventoryItem = ingredient.inventoryId
                ? inventory.find(i => i.id === ingredient.inventoryId)
                : inventory.find(i => i.name.toLowerCase() === ingredient.ingredientName.toLowerCase());

            if (inventoryItem && inventoryItem.unitCost) {
                totalCost += ingredient.quantityUsed * inventoryItem.unitCost;
            } else if (ingredient.costPerUnit) {
                // Fallback: 使用配方中記錄的快照成本
                totalCost += ingredient.quantityUsed * ingredient.costPerUnit;
            } else {
                hasAllPrices = false;
            }
        }

        return hasAllPrices ? totalCost : null;
    }, [ingredients, inventory]);

    return {
        ingredients,
        realTimeCost,
        loading,
        hasIngredients: ingredients.length > 0,
    };
}
