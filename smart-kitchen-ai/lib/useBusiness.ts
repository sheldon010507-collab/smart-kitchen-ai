import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { Business } from './database.types';

export function useMyBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);

      const { data: members, error: memberError } = await supabase
        .from('business_members')
        .select(`
          business_id,
          role,
          status,
          businesses (*)
        `)
        .eq('status', 'active');

      if (memberError) throw memberError;

      const bizList = members
        ?.map((m: any) => m.businesses)
        .filter(Boolean) as Business[];

      setBusinesses(bizList || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching businesses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const createBusiness = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (bizError) return { error: bizError };

    const { error: memberError } = await supabase
      .from('business_members')
      .insert({
        business_id: business.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

    if (memberError) return { error: memberError };

    setBusinesses(prev => [...prev, business]);
    return { data: business, error: null };
  };

  const joinBusiness = async (joinCode: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { data: business, error: findError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    if (findError || !business) {
      return { error: new Error('Invalid join code') };
    }

    const { error: joinError } = await supabase
      .from('business_members')
      .insert({
        business_id: business.id,
        user_id: user.id,
        role: 'staff',
        status: 'pending',
      });

    if (joinError) {
      if (joinError.code === '23505') {
        return { error: new Error('You have already applied') };
      }
      return { error: joinError };
    }

    return { data: business, error: null };
  };

  return {
    businesses,
    loading,
    error,
    refetch: fetchBusinesses,
    createBusiness,
    joinBusiness,
  };
}