import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { InventoryItem } from './database.types';

export function useInventory(businessId: string | null) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!businessId) {
      setInventory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('business_id', businessId)
        .order('category')
        .order('name');

      if (error) throw error;
      setInventory(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const addItem = async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('inventory')
      .insert(item)
      .select()
      .single();

    if (!error && data) {
      setInventory(prev => [...prev, data]);
    }
    return { data, error };
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const { data, error } = await supabase
      .from('inventory')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setInventory(prev => prev.map(item => item.id === id ? data : item));
    }
    return { data, error };
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (!error) {
      setInventory(prev => prev.filter(item => item.id !== id));
    }
    return { error };
  };

  return {
    inventory,
    loading,
    error,
    refetch: fetchInventory,
    addItem,
    updateItem,
    deleteItem,
  };
}