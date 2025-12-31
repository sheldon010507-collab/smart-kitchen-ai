/**
 * Business Handlers Hook
 * 
 * Handles business/store CRUD operations and member management
 * Extracted from App.tsx business-related handlers
 */

import React from 'react';
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Business, Staff, User, ViewState, SalesReceipt, Shift, MenuItem, PrepTask } from '../types';
import { useBusiness } from '../lib/BusinessContext';
import { normMemberStatus } from '../utils/transforms';

export interface UseBusinessHandlersProps {
    user: User;
    businesses: Business[];
    setBusinesses: React.Dispatch<React.SetStateAction<Business[]>>;
    currentBusinessId: string | null;
    setCurrentBusinessId: (id: string | null) => void;
    setView: (view: ViewState) => void;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    staff: Staff[];
    setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
    setIsBusinessDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsStoreModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setEditingBusiness: React.Dispatch<React.SetStateAction<Business | null>>;
    setIsJoinStoreModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    joinStoreCode: string;
    setJoinStoreCode: React.Dispatch<React.SetStateAction<string>>;
    joinStoreNameAlias: string;
    setJoinStoreNameAlias: React.Dispatch<React.SetStateAction<string>>;
    setSales: React.Dispatch<React.SetStateAction<SalesReceipt[]>>;
    setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
    setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
    setPrepTasks: React.Dispatch<React.SetStateAction<PrepTask[]>>;
}

export interface UseBusinessHandlersReturn {
    isLoading: boolean;
    error: string | null;
    staffMemberships: Staff[];
    handleSwitchBusiness: (businessId: string | null) => void;
    handleOpenCreateStore: () => void;
    handleOpenEditStore: (biz: Business, e: React.MouseEvent) => void;
    handleSaveStore: (businessData: Partial<Business>) => Promise<void>;
    handleDeleteStore: (businessId: string) => Promise<void>;
    handleJoinStoreSubmit: (e: React.FormEvent) => Promise<void>;
    loadMembersForBusiness: (businessId: string) => Promise<void>;
}

export function useBusinessHandlers({
    user,
    businesses,
    setBusinesses,
    currentBusinessId,
    setCurrentBusinessId,
    setView,
    setUser,
    staff,
    setStaff,
    setIsBusinessDropdownOpen,
    setIsStoreModalOpen,
    setEditingBusiness,
    setIsJoinStoreModalOpen,
    joinStoreCode,
    setJoinStoreCode,
    joinStoreNameAlias,
    setJoinStoreNameAlias,
    setSales,
    setShifts,
    setMenu,
    setPrepTasks,
}: UseBusinessHandlersProps): UseBusinessHandlersReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { deleteBusiness } = useBusiness();

    const staffMemberships = staff.filter(s =>
        s.email === user?.email && user?.role === 'Staff'
    );

    const handleSwitchBusiness = useCallback((businessId: string | null) => {
        if (businessId && user?.role === 'Staff') {
            const mem = staff.find(s => s.businessId === businessId && s.email === user.email);
            if (mem?.status === 'Pending') {
                alert('You cannot access this store until approved.');
                return;
            }
        }
        setCurrentBusinessId(businessId);
        setIsBusinessDropdownOpen(false);
        setView(ViewState.DASHBOARD);
    }, [user, staff, setCurrentBusinessId, setIsBusinessDropdownOpen, setView]);

    const handleOpenCreateStore = useCallback(() => {
        setEditingBusiness(null);
        setIsStoreModalOpen(true);
    }, [setEditingBusiness, setIsStoreModalOpen]);

    const handleOpenEditStore = useCallback((biz: Business, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingBusiness(biz);
        setIsStoreModalOpen(true);
    }, [setEditingBusiness, setIsStoreModalOpen]);

    const handleSaveStore = useCallback(async (businessData: Partial<Business>) => {
        setIsLoading(true);
        setError(null);

        try {
            if (businessData.id) {
                const { error: updateError } = await supabase
                    .from('businesses')
                    .update({
                        name: businessData.name,
                        address: businessData.address,
                        hours: businessData.hours,
                        contact_info: businessData.contactInfo,
                        notes: businessData.notes,
                    })
                    .eq('id', businessData.id);

                if (updateError) throw updateError;

                setBusinesses(prev =>
                    prev.map(b => (b.id === businessData.id ? { ...b, ...businessData } : b))
                );
            } else {
                const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

                const { data: newBiz, error: insertError } = await supabase
                    .from('businesses')
                    .insert({
                        name: businessData.name,
                        owner_id: user?.id,
                        join_code: joinCode,
                        address: businessData.address,
                        hours: businessData.hours,
                        contact_info: businessData.contactInfo,
                        notes: businessData.notes,
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                const newBusiness: Business = {
                    id: newBiz.id,
                    name: newBiz.name,
                    ownerId: newBiz.owner_id,
                    joinCode: newBiz.join_code,
                    address: newBiz.address,
                    hours: newBiz.hours,
                    contactInfo: newBiz.contact_info,
                    notes: newBiz.notes,
                    customCategories: [],
                    customLocations: [],
                    pendingStaffIds: [],
                };

                setBusinesses(prev => [...prev, newBusiness]);

                setUser(prev => prev ? {
                    ...prev,
                    ownedBusinessIds: [...(prev.ownedBusinessIds || []), newBiz.id],
                } : prev);
            }

            setIsStoreModalOpen(false);
            setEditingBusiness(null);
        } catch (e: any) {
            console.error('Save store error:', e);
            setError(e.message);
            alert('Failed to save store: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [user, setBusinesses, setUser, setIsStoreModalOpen, setEditingBusiness]);

    const handleDeleteStore = useCallback(async (businessId: string) => {
        if (!confirm('Are you sure you want to delete this store? This cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        try {
            await deleteBusiness(businessId);

            setSales(prev => prev.filter(s => s.businessId !== businessId));
            setShifts(prev => prev.filter(s => s.businessId !== businessId));
            setMenu(prev => prev.filter(m => m.businessId !== businessId));
            setPrepTasks(prev => prev.filter(t => t.businessId !== businessId));

            if (currentBusinessId === businessId) {
                setCurrentBusinessId(null);
            }

            setIsStoreModalOpen(false);
        } catch (e: any) {
            console.error('Delete store error:', e);
            alert('Failed to delete store: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [deleteBusiness, currentBusinessId, setCurrentBusinessId, setSales, setShifts, setMenu, setPrepTasks, setIsStoreModalOpen]);

    const handleJoinStoreSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinStoreCode.trim()) {
            alert('Please enter a store code.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data: biz, error: bizError } = await supabase
                .from('businesses')
                .select('id, name, owner_id')
                .eq('join_code', joinStoreCode.toUpperCase())
                .maybeSingle();

            if (bizError) throw bizError;
            if (!biz) {
                alert('Invalid join code. Please check and try again.');
                return;
            }

            if (biz.owner_id === user?.id) {
                alert('You are the owner of this store. Use the store selector instead.');
                return;
            }

            const { data: existing } = await supabase
                .from('business_members')
                .select('id, status')
                .eq('business_id', biz.id)
                .eq('user_id', user?.id)
                .maybeSingle();

            if (existing) {
                const msg = existing.status === 'pending'
                    ? 'Your request is pending approval.'
                    : 'You are already a member of this store.';
                alert(msg);
                return;
            }

            const { error: insertError } = await supabase
                .from('business_members')
                .insert({
                    business_id: biz.id,
                    user_id: user?.id,
                    role: 'staff',
                    status: 'pending',
                });

            if (insertError) throw insertError;

            setBusinesses(prev => {
                if (prev.some(b => b.id === biz.id)) return prev;
                return [...prev, {
                    id: biz.id,
                    name: joinStoreNameAlias || biz.name,
                    ownerId: biz.owner_id,
                    joinCode: joinStoreCode.toUpperCase(),
                    customCategories: [],
                    customLocations: [],
                    pendingStaffIds: [],
                }];
            });

            setStaff(prev => [
                ...prev,
                {
                    id: `${user?.id}_${biz.id}`,
                    businessId: biz.id,
                    name: user?.name || 'Unknown',
                    email: user?.email || '',
                    role: 'Server',
                    hourlyRate: 0,
                    status: 'Pending',
                },
            ]);

            alert(`Successfully requested to join "${biz.name}". Waiting for approval.`);
            setIsJoinStoreModalOpen(false);
            setJoinStoreCode('');
            setJoinStoreNameAlias('');
        } catch (e: any) {
            console.error('Join store error:', e);
            alert('Failed to join store: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [user, joinStoreCode, joinStoreNameAlias, setBusinesses, setStaff, setIsJoinStoreModalOpen, setJoinStoreCode, setJoinStoreNameAlias]);

    const loadMembersForBusiness = useCallback(async (businessId: string) => {
        try {
            const { data, error: queryError } = await supabase
                .from('business_members')
                .select(`
          user_id,
          role,
          status,
          created_at,
          profiles:user_id(full_name, email)
        `)
                .eq('business_id', businessId);

            if (queryError) {
                console.error('Failed to load members:', queryError);
                return;
            }

            const members: Staff[] = (data || []).map((m: any) => ({
                id: `${m.user_id}_${businessId}`,
                businessId,
                name: m.profiles?.full_name || 'Unknown',
                email: m.profiles?.email || '',
                role: m.role === 'owner' ? 'Manager' : 'Server',
                hourlyRate: 0,
                status: normMemberStatus(m.status),
            }));

            setStaff(prev => {
                const map = new Map(prev.map(x => [x.id, x]));
                members.forEach(m => map.set(m.id, m));
                return Array.from(map.values());
            });
        } catch (e: any) {
            console.error('Error loading members:', e);
        }
    }, [setStaff]);

    return {
        isLoading,
        error,
        staffMemberships,
        handleSwitchBusiness,
        handleOpenCreateStore,
        handleOpenEditStore,
        handleSaveStore,
        handleDeleteStore,
        handleJoinStoreSubmit,
        loadMembersForBusiness,
    };
}

export default useBusinessHandlers;
