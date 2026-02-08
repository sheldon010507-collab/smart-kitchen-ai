import { supabase } from '../../../lib/supabase';
import { MenuItem, MenuIngredient } from '../../../types';

// Helper to transform DB row to MenuItem object
const transformMenuItem = (row: any, ingredients: any[] = []): MenuItem => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    sellingPrice: row.selling_price,
    estimatedCost: row.estimated_cost,
    category: row.category,
    imageUrl: row.image_url,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ingredients: ingredients.map(ing => ({
        id: ing.id,
        menuItemId: ing.menu_item_id,
        inventoryItemId: ing.inventory_item_id,
        quantityUsed: ing.quantity_used,
        unitUsed: ing.unit_used,
        costSnapshot: ing.cost_per_unit || 0, // Fallback
        ingredientName: ing.ingredient_name || '' // Fallback if join needed
    }))
});

export const menuService = {
    /**
     * Fetch all menu items + ingredients for a business
     */
    async fetchMenu(businessId: string): Promise<MenuItem[]> {
        // 1. Get Menu Items
        const { data: items, error: itemsErr } = await supabase
            .from('menu_items')
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });

        if (itemsErr) throw itemsErr;
        if (!items || items.length === 0) return [];

        // 2. Get Ingredients for these items
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const itemIds = items.map(i => i.id).filter(id => uuidRegex.test(id));

        let ingredients: any[] = [];
        if (itemIds.length > 0) {
            const { data: ingData, error: ingErr } = await supabase
                .from('menu_ingredients')
                .select('*')
                .in('menu_item_id', itemIds);

            if (ingErr) {
                console.error('Error fetching menu ingredients:', ingErr);
                // Return items without ingredients if query fails
                return items.map(i => transformMenuItem(i, []));
            }

            if (ingData) {
                ingredients = ingData;
            }
        }

        // 3. Merge
        return items.map(item => {
            const itemIngredients = ingredients.filter(ing => ing.menu_item_id === item.id);
            return transformMenuItem(item, itemIngredients);
        });
    },

    /**
     * Create a new menu item with ingredients
     */
    async createMenuItem(
        businessId: string,
        item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt' | 'businessId'>,
        ingredients: { inventoryItemId: string; quantity: number; unit: string; cost: number }[]
    ): Promise<void> {
        // 1. Insert Menu Item
        const { data: newItem, error: itemError } = await supabase
            .from('menu_items')
            .insert({
                business_id: businessId,
                name: item.name,
                description: item.description,
                selling_price: item.sellingPrice,
                estimated_cost: item.estimatedCost,
                category: item.category,
                image_url: item.imageUrl,
                is_active: item.isActive,
                sort_order: item.sortOrder || 0
            })
            .select()
            .single();

        if (itemError) throw itemError;

        // 2. Insert Ingredients
        if (ingredients.length > 0) {
            const ingredientRows = ingredients.map(ing => ({
                menu_item_id: newItem.id,
                inventory_item_id: ing.inventoryItemId,
                quantity_used: ing.quantity,
                unit_used: ing.unit,
                cost_per_unit: ing.cost, // Storing snapshot cost
                business_id: businessId // Redundant but good for constraints
            }));

            const { error: ingError } = await supabase
                .from('menu_ingredients')
                .insert(ingredientRows);

            if (ingError) {
                console.error('Failed to save ingredients:', ingError);
                // Non-fatal, item created but incomplete
            }
        }
    },

    /**
     * Update a menu item and replace its ingredients
     */
    async updateMenuItem(
        id: string,
        updates: Partial<MenuItem>,
        ingredients?: { inventoryItemId: string; quantity: number; unit: string; cost: number }[]
    ): Promise<void> {
        // 1. Update MenuItem fields
        // Since id might be text in DB (legacy), this update might succeed even with non-UUID
        const { error: updateErr } = await supabase
            .from('menu_items')
            .update({
                name: updates.name,
                description: updates.description,
                selling_price: updates.sellingPrice,
                estimated_cost: updates.estimatedCost,
                category: updates.category,
                image_url: updates.imageUrl,
                is_active: updates.isActive,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateErr) throw updateErr;

        // 2. Replace Ingredients (Delete All -> Insert New)
        if (ingredients) {
            // Check if ID is a valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            if (!uuidRegex.test(id)) {
                console.warn(`Migrating legacy item ${id} to UUID...`);

                // MIGRATION STRATEGY:
                // 1. Create NEW item with valid UUID using the updated data
                // 2. Insert ingredients for the NEW item
                // 3. Delete the OLD item

                try {
                    // We need the full item data. 'updates' might be partial.
                    // Fetch current item first to merge (safest), but 'updates' usually comes from form with full state?
                    // actually updateMenuItem receives 'updates'.
                    // To be safe, we should probably fetch the existing record if updates is incomplete, 
                    // but typically the Edit Form sends everything.
                    // For now, let's assume 'updates' contains the important fields or we query.

                    const { data: currentItem } = await supabase
                        .from('menu_items')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (!currentItem && !updates.name) {
                        throw new Error("Cannot migrate item: source not found and no updates provided");
                    }

                    const mergedItem = { ...currentItem, ...updates };

                    // Create New
                    await this.createMenuItem(
                        mergedItem.business_id || currentItem.business_id, // Ensure business_id
                        {
                            name: mergedItem.name,
                            description: mergedItem.description,
                            sellingPrice: mergedItem.selling_price || mergedItem.sellingPrice,
                            estimatedCost: mergedItem.estimated_cost || mergedItem.estimatedCost,
                            category: mergedItem.category,
                            imageUrl: mergedItem.image_url || mergedItem.imageUrl,
                            isActive: mergedItem.is_active ?? mergedItem.isActive,
                            sortOrder: mergedItem.sort_order ?? mergedItem.sortOrder
                        },
                        ingredients
                    );

                    // Delete Old
                    await this.deleteMenuItem(id);

                    console.log(`Migration successful for ${id}`);
                    return;
                } catch (migrationErr) {
                    console.error("Migration failed:", migrationErr);
                    throw migrationErr;
                }
            }

            // Standard UUID flow:
            // Delete old
            const { error: delErr } = await supabase
                .from('menu_ingredients')
                .delete()
                .eq('menu_item_id', id);

            if (delErr) {
                console.error('Failed to delete old ingredients:', delErr);
                return;
            }

            // Insert new
            if (ingredients.length > 0) {
                const ingredientRows = ingredients.map(ing => ({
                    menu_item_id: id,
                    inventory_item_id: ing.inventoryItemId,
                    quantity_used: ing.quantity,
                    unit_used: ing.unit,
                    cost_per_unit: ing.cost,
                    business_id: updates.businessId // Optional, usually null in updates
                }));

                const { error: ingError } = await supabase
                    .from('menu_ingredients')
                    .insert(ingredientRows);

                if (ingError) console.error('Failed to update ingredients:', ingError);
            }
        }
    },

    /**
     * Delete a menu item
     */
    async deleteMenuItem(id: string): Promise<void> {
        // Direct delete on menu_items should work even for non-UUIDs (if column is text)
        // Cascade delete will handle ingredients if they exist (which they shouldn't for non-UUID items)
        const { error } = await supabase
            .from('menu_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
