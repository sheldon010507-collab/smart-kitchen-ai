/**
 * useContainers Hook
 * CRUD operations for container management
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Container, CreateContainerInput, CapacityUnit } from '../types';

interface UseContainersOptions {
    businessId: string | null;
}

interface UseContainersReturn {
    containers: Container[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createContainer: (data: CreateContainerInput) => Promise<{ data: Container | null; error: string | null }>;
    updateContainer: (id: string, data: Partial<CreateContainerInput>) => Promise<{ error: string | null }>;
    deleteContainer: (id: string) => Promise<{ error: string | null }>;
    uploadContainerImage: (file: File, containerId: string) => Promise<{ url: string | null; error: string | null }>;
}

export function useContainers({ businessId }: UseContainersOptions): UseContainersReturn {
    const [containers, setContainers] = useState<Container[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all containers for business
    const fetchContainers = useCallback(async () => {
        if (!businessId) {
            setContainers([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: queryError } = await supabase
                .from('containers')
                .select('*')
                .eq('business_id', businessId)
                .order('name', { ascending: true });

            if (queryError) throw queryError;

            // Map snake_case to camelCase
            const mapped: Container[] = (data ?? []).map((row: any) => ({
                id: row.id,
                businessId: row.business_id,
                name: row.name,
                capacityValue: row.capacity_value,
                capacityUnit: row.capacity_unit as CapacityUnit,
                images: row.images || [],
                visualFeatures: row.visual_features,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));

            setContainers(mapped);
        } catch (err: any) {
            console.error('Error fetching containers:', err);
            setError(err.message || 'Failed to load containers');
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        fetchContainers();
    }, [fetchContainers]);

    // Create a new container
    const createContainer = useCallback(async (data: CreateContainerInput): Promise<{ data: Container | null; error: string | null }> => {
        try {
            const { data: newRow, error } = await supabase
                .from('containers')
                .insert({
                    business_id: data.businessId,
                    name: data.name,
                    capacity_value: data.capacityValue,
                    capacity_unit: data.capacityUnit,
                    images: data.images || [],
                })
                .select()
                .single();

            if (error) throw error;

            const newContainer: Container = {
                id: newRow.id,
                businessId: newRow.business_id,
                name: newRow.name,
                capacityValue: newRow.capacity_value,
                capacityUnit: newRow.capacity_unit,
                images: newRow.images || [],
                visualFeatures: newRow.visual_features,
                createdAt: newRow.created_at,
                updatedAt: newRow.updated_at,
            };

            await fetchContainers();
            return { data: newContainer, error: null };
        } catch (err: any) {
            return { data: null, error: err.message || 'Failed to create container' };
        }
    }, [fetchContainers]);

    // Update a container
    const updateContainer = useCallback(async (id: string, data: Partial<CreateContainerInput>): Promise<{ error: string | null }> => {
        try {
            const updatePayload: any = { updated_at: new Date().toISOString() };
            if (data.name !== undefined) updatePayload.name = data.name;
            if (data.capacityValue !== undefined) updatePayload.capacity_value = data.capacityValue;
            if (data.capacityUnit !== undefined) updatePayload.capacity_unit = data.capacityUnit;
            if (data.images !== undefined) updatePayload.images = data.images;

            const { error } = await supabase
                .from('containers')
                .update(updatePayload)
                .eq('id', id);

            if (error) throw error;
            await fetchContainers();
            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Failed to update container' };
        }
    }, [fetchContainers]);

    // Delete a container
    const deleteContainer = useCallback(async (id: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase
                .from('containers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchContainers();
            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Failed to delete container' };
        }
    }, [fetchContainers]);

    // Upload container image to Supabase Storage
    const uploadContainerImage = useCallback(async (file: File, containerId: string): Promise<{ url: string | null; error: string | null }> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${businessId}/${containerId}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('container-images')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('container-images')
                .getPublicUrl(fileName);

            return { url: urlData.publicUrl, error: null };
        } catch (err: any) {
            console.error('Upload error:', err);
            return { url: null, error: err.message || 'Failed to upload image' };
        }
    }, [businessId]);

    return {
        containers,
        loading,
        error,
        refetch: fetchContainers,
        createContainer,
        updateContainer,
        deleteContainer,
        uploadContainerImage,
    };
}
