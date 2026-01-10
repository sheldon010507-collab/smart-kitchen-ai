/**
 * Template Service - CRUD operations for inventory templates
 */
import { supabase } from '../lib/supabase';
import {
    InventoryTemplate,
    InventoryTemplateRow,
    TemplateCategory,
    TemplateLocation,
    TemplateItem
} from '../components/setup/types';

// ============================================================
// Type Transforms
// ============================================================

/**
 * Database row → Frontend type
 */
export const mapRowToTemplate = (row: InventoryTemplateRow): InventoryTemplate => ({
    id: row.id,
    ownerId: row.owner_id ?? undefined,
    businessId: row.business_id ?? undefined,
    name: row.name,
    nameZh: row.name_zh ?? undefined,
    description: row.description ?? undefined,
    icon: row.icon,
    industry: row.industry ?? undefined,
    categories: row.categories,
    locations: row.locations,
    items: row.items,
    isSystem: row.is_system,
    usageCount: row.usage_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

/**
 * Frontend type → Database payload
 */
export const mapTemplateToPayload = (
    template: Partial<InventoryTemplate>,
    userId: string
): Partial<InventoryTemplateRow> => ({
    owner_id: userId,
    business_id: template.businessId ?? null,
    name: template.name!,
    name_zh: template.nameZh ?? null,
    description: template.description ?? null,
    icon: template.icon ?? '📦',
    industry: template.industry ?? null,
    categories: template.categories ?? [],
    locations: template.locations ?? [],
    items: template.items ?? [],
    is_system: false,  // Users cannot create system templates
});

// ============================================================
// Service Result Type
// ============================================================

export interface ServiceResult<T> {
    data: T | null;
    error: Error | null;
}

// ============================================================
// CRUD Operations
// ============================================================

/**
 * Get all available templates (system + user's own)
 */
export const getAvailableTemplates = async (
    userId: string
): Promise<ServiceResult<InventoryTemplate[]>> => {
    try {
        const { data, error } = await supabase
            .from('inventory_templates')
            .select('*')
            .or(`owner_id.eq.${userId},is_system.eq.true`)
            .order('is_system', { ascending: false })
            .order('usage_count', { ascending: false });

        if (error) throw error;

        return {
            data: (data as InventoryTemplateRow[]).map(mapRowToTemplate),
            error: null,
        };
    } catch (err) {
        console.error('getAvailableTemplates error:', err);
        return { data: null, error: err as Error };
    }
};

/**
 * Get a single template by ID
 */
export const getTemplateById = async (
    templateId: string
): Promise<ServiceResult<InventoryTemplate>> => {
    try {
        const { data, error } = await supabase
            .from('inventory_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (error) throw error;

        return {
            data: mapRowToTemplate(data as InventoryTemplateRow),
            error: null,
        };
    } catch (err) {
        console.error('getTemplateById error:', err);
        return { data: null, error: err as Error };
    }
};

/**
 * Get user's own templates (excluding system templates)
 */
export const getUserTemplates = async (
    userId: string
): Promise<ServiceResult<InventoryTemplate[]>> => {
    try {
        const { data, error } = await supabase
            .from('inventory_templates')
            .select('*')
            .eq('owner_id', userId)
            .eq('is_system', false)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return {
            data: (data as InventoryTemplateRow[]).map(mapRowToTemplate),
            error: null,
        };
    } catch (err) {
        console.error('getUserTemplates error:', err);
        return { data: null, error: err as Error };
    }
};

/**
 * Create a new user template
 */
export const createTemplate = async (
    template: Partial<InventoryTemplate>,
    userId: string
): Promise<ServiceResult<InventoryTemplate>> => {
    try {
        const payload = mapTemplateToPayload(template, userId);

        const { data, error } = await supabase
            .from('inventory_templates')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return {
            data: mapRowToTemplate(data as InventoryTemplateRow),
            error: null,
        };
    } catch (err) {
        console.error('createTemplate error:', err);
        return { data: null, error: err as Error };
    }
};

/**
 * Create a template from existing inventory
 */
export const createTemplateFromInventory = async (
    businessId: string,
    templateName: string,
    userId: string,
    options?: {
        description?: string;
        icon?: string;
    }
): Promise<ServiceResult<InventoryTemplate>> => {
    try {
        // 1. Fetch current inventory
        const { data: inventory, error: fetchError } = await supabase
            .from('inventory_items')
            .select('name, category, location, quantity_unit, unit_cost')
            .eq('business_id', businessId);

        if (fetchError) throw fetchError;
        if (!inventory || inventory.length === 0) {
            throw new Error('No inventory items found');
        }

        // 2. Extract unique categories and locations
        const categories: TemplateCategory[] = [
            ...new Set(inventory.map(i => i.category).filter(Boolean))
        ].map(name => ({ name }));

        const locations: TemplateLocation[] = [
            ...new Set(inventory.map(i => i.location).filter(Boolean))
        ].map(name => ({ name, type: 'Dry' as const }));

        // 3. Convert to template item format
        const items: TemplateItem[] = inventory.map(i => ({
            name: i.name,
            category: i.category || 'Other',
            unit: i.quantity_unit || 'pcs',
            cost: i.unit_cost ?? undefined,
        }));

        // 4. Create template
        return createTemplate({
            name: templateName,
            description: options?.description,
            icon: options?.icon ?? '📦',
            businessId,
            categories,
            locations,
            items,
        }, userId);

    } catch (err) {
        console.error('createTemplateFromInventory error:', err);
        return { data: null, error: err as Error };
    }
};

/**
 * Update an existing template
 */
export const updateTemplate = async (
    templateId: string,
    updates: Partial<InventoryTemplate>,
    userId: string
): Promise<ServiceResult<InventoryTemplate>> => {
    try {
        const payload: Record<string, any> = {};

        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.nameZh !== undefined) payload.name_zh = updates.nameZh;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.icon !== undefined) payload.icon = updates.icon;
        if (updates.industry !== undefined) payload.industry = updates.industry;
        if (updates.categories !== undefined) payload.categories = updates.categories;
        if (updates.locations !== undefined) payload.locations = updates.locations;
        if (updates.items !== undefined) payload.items = updates.items;

        const { data, error } = await supabase
            .from('inventory_templates')
            .update(payload)
            .eq('id', templateId)
            .eq('owner_id', userId)  // Ensure user can only update their own
            .select()
            .single();

        if (error) throw error;

        return {
            data: mapRowToTemplate(data as InventoryTemplateRow),
            error: null,
        };
    } catch (err) {
        console.error('updateTemplate error:', err);
        return { data: null, error: err as Error };
    }
};

/**
 * Delete a template
 */
export const deleteTemplate = async (
    templateId: string,
    userId: string
): Promise<ServiceResult<boolean>> => {
    try {
        const { error } = await supabase
            .from('inventory_templates')
            .delete()
            .eq('id', templateId)
            .eq('owner_id', userId);  // Ensure user can only delete their own

        if (error) throw error;

        return { data: true, error: null };
    } catch (err) {
        console.error('deleteTemplate error:', err);
        return { data: false, error: err as Error };
    }
};

/**
 * Increment template usage count
 */
export const incrementUsageCount = async (
    templateId: string
): Promise<void> => {
    try {
        await supabase.rpc('increment_template_usage', { template_id: templateId });
    } catch (err) {
        console.error('incrementUsageCount error:', err);
    }
};
