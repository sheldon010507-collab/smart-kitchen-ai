/**
 * useBatchRecipeCosting Hook
 * 
 * 批量計算所有菜品的實時成本
 * 優化版本，避免為每個菜品單獨發起請求
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { MenuItem, InventoryItem, MenuIngredient } from '../../../types';

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

export function useBatchRecipeCosting(menuItems: MenuItem[], inventory: InventoryItem[]) {
    const [allIngredients, setAllIngredients] = useState<MenuIngredient[]>([]);
    const [loading, setLoading] = useState(false);

    // Extract all menu item IDs
    const menuItemIds = useMemo(() => menuItems.map(m => m.id), [menuItems]);

    useEffect(() => {
        if (menuItemIds.length === 0) {
            setAllIngredients([]);
            return;
        }

        loadAllIngredients();
    }, [menuItemIds.join(',')]);

    const loadAllIngredients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('menu_ingredients')
                .select('*')
                .in('menu_item_id', menuItemIds);

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

            setAllIngredients(mappedIngredients);
        } catch (err) {
            console.error('Failed to load recipe ingredients:', err);
            setAllIngredients([]);
        } finally {
            setLoading(false);
        }
    };

    // 計算每個菜品的實時成本
    const menuCosts = useMemo(() => {
        const costMap: Record<string, number | null> = {};

        for (const menuItem of menuItems) {
            const ingredients = allIngredients.filter(ing => ing.menuItemId === menuItem.id);

            if (ingredients.length === 0) {
                costMap[menuItem.id] = null;
                continue;
            }

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
                    break;
                }
            }

            costMap[menuItem.id] = hasAllPrices ? totalCost : null;
        }

        return costMap;
    }, [menuItems, allIngredients, inventory]);

    return {
        menuCosts,
        loading,
        hasAnyRecipes: allIngredients.length > 0,
    };
}
