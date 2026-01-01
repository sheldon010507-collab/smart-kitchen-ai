/**
 * useBusinessHandlers Hook
 * 
 * Centralized business logic handlers extracted from App.tsx
 * - Store CRUD operations
 * - Staff join store flow
 * - Business switching
 * - Logout
 */

import React, { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, Business, Staff, ViewState } from '../types';

interface UseBusinessHandlersProps {
    user: User | null;
    currentBusinessId: string | null;
    staffMemberships: Staff[];

    // Setters
    setUser: (user: User | null) => void;
    setBusinesses: React.Dispatch<React.SetStateAction<Business[]>>;
    setCurrentBusinessId: (id: string | null) => void;
    setView: (view: ViewState) => void;
    setIsBusinessDropdownOpen: (open: boolean) => void;
    setIsStoreModalOpen: (open: boolean) => void;
    setEditingBusiness: (business: Business | null) => void;
    setIsJoinStoreModalOpen: (open: boolean) => void;

    // Data clearing for logout
    setSales: React.Dispatch<React.SetStateAction<any[]>>;
    setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
    setShifts: React.Dispatch<React.SetStateAction<any[]>>;
    setMenu: React.Dispatch<React.SetStateAction<any[]>>;
    setPrepTasks: React.Dispatch<React.SetStateAction<any[]>>;

    // Inventory context
    clearInventoryForBusiness: (businessId: string) => void;

    // Join store form state
    joinStoreCode: string;
    setJoinStoreCode: (code: string) => void;
    setJoinStoreNameAlias: (alias: string) => void;
}

export function useBusinessHandlers(props: UseBusinessHandlersProps) {
    const {
        user,
        currentBusinessId,
        staffMemberships,
        setUser,
        setBusinesses,
        setCurrentBusinessId,
        setView,
        setIsBusinessDropdownOpen,
        setIsStoreModalOpen,
        setEditingBusiness,
        setIsJoinStoreModalOpen,
        setSales,
        setStaff,
        setShifts,
        setMenu,
        setPrepTasks,
        clearInventoryForBusiness,
        joinStoreCode,
        setJoinStoreCode,
        setJoinStoreNameAlias,
    } = props;

    // --- Logout ---
    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setBusinesses([]);
        setCurrentBusinessId(null);
        setView(ViewState.DASHBOARD);
        setSales([]);
        setStaff([]);
        setShifts([]);
        setMenu([]);
        setPrepTasks([]);
    }, [setUser, setBusinesses, setCurrentBusinessId, setView, setSales, setStaff, setShifts, setMenu, setPrepTasks]);

    // --- Switch Business ---
    const handleSwitchBusiness = useCallback((bizId: string | null) => {
        // Staff: Pending 不允许切进去
        if (user?.role === 'Staff' && bizId) {
            const mem = staffMemberships.find(m => m.businessId === bizId);
            if (mem?.status === 'Pending') {
                alert('This store is pending approval. Please wait for manager approval.');
                setIsBusinessDropdownOpen(false);
                return;
            }
        }

        setCurrentBusinessId(bizId);
        setIsBusinessDropdownOpen(false);
        setView(ViewState.DASHBOARD);
    }, [user, staffMemberships, setCurrentBusinessId, setIsBusinessDropdownOpen, setView]);

    // --- Open Create Store Modal ---
    const handleOpenCreateStore = useCallback(() => {
        setEditingBusiness(null);
        setIsStoreModalOpen(true);
    }, [setEditingBusiness, setIsStoreModalOpen]);

    // --- Open Edit Store Modal ---
    const handleOpenEditStore = useCallback((biz: Business, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingBusiness(biz);
        setIsStoreModalOpen(true);
    }, [setEditingBusiness, setIsStoreModalOpen]);

    // --- Save Store (Create/Update) ---
    const handleSaveStore = useCallback(async (businessData: Partial<Business>) => {
        if (!user) return;

        try {
            if (businessData.id) {
                // Edit Mode
                const { error } = await supabase
                    .from('businesses')
                    .update({ name: businessData.name })
                    .eq('id', businessData.id);

                if (error) throw error;

                setBusinesses(prev => prev.map(b =>
                    b.id === businessData.id ? { ...b, ...businessData } as Business : b
                ));
            } else {
                // Create Mode
                const { data: biz, error } = await supabase
                    .from('businesses')
                    .insert({
                        name: businessData.name?.trim(),
                        owner_id: user.id
                    })
                    .select('id, name, owner_id')
                    .single();

                if (error) throw error;
                if (!biz) throw new Error('Failed to create business');

                const realUUID = biz.id;

                // Insert business_members
                const { error: memErr } = await supabase.from('business_members').insert({
                    business_id: realUUID,
                    user_id: user.id,
                    role: 'owner',
                    status: 'active'
                });

                if (memErr) throw memErr;

                const newBusinessFull: Business = {
                    ...businessData,
                    id: realUUID,
                    ownerId: user.id,
                    joinCode: 'PENDING',
                    customCategories: ['Produce', 'Dairy', 'Meat', 'Pantry'],
                    customLocations: ['Fridge', 'Freezer', 'Pantry'],
                    pendingStaffIds: [],
                } as Business;

                setBusinesses(prev => [...prev, newBusinessFull]);

                if (user) {
                    setUser({ ...user, ownedBusinessIds: [...(user.ownedBusinessIds || []), realUUID] });
                }

                sessionStorage.setItem('active_business_id', realUUID);
                setCurrentBusinessId(realUUID);
            }
        } catch (err: any) {
            console.error('Save store failed:', err);
            alert('Failed to save store: ' + (err.message || 'Unknown error'));
        }
    }, [user, setBusinesses, setUser, setCurrentBusinessId]);

    // --- Delete Store ---
    const handleDeleteStore = useCallback((businessId: string) => {
        setBusinesses(prev => prev.filter(b => b.id !== businessId));
        if (user) {
            setUser({ ...user, ownedBusinessIds: user.ownedBusinessIds?.filter(id => id !== businessId) });
        }
        clearInventoryForBusiness(businessId);
        setSales(prev => prev.filter(s => s.businessId !== businessId));
        setStaff(prev => prev.filter(s => s.businessId !== businessId));
        setShifts(prev => prev.filter(s => s.businessId !== businessId));
        setMenu(prev => prev.filter(m => m.businessId !== businessId));
        setPrepTasks(prev => prev.filter(t => t.businessId !== businessId));

        if (currentBusinessId === businessId) setCurrentBusinessId(null);
    }, [user, currentBusinessId, setBusinesses, setUser, clearInventoryForBusiness, setSales, setStaff, setShifts, setMenu, setPrepTasks, setCurrentBusinessId]);

    // --- Staff Join Store ---
    const handleJoinStoreSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || user.role !== 'Staff') return;

        const code = joinStoreCode.trim().toUpperCase();
        if (!code) return;

        try {
            // 1. 查店铺
            const { data: business, error: findErr } = await supabase
                .from('businesses')
                .select('id, name, owner_id')
                .eq('join_code', code)
                .single();

            if (findErr || !business) {
                console.error('Find business failed:', findErr);
                alert('Invalid or unauthorized store code.');
                return;
            }

            // 2. 插入 pending member
            const { error: joinErr } = await supabase
                .from('business_members')
                .insert({
                    business_id: business.id,
                    user_id: user.id,
                    role: 'staff',
                    status: 'pending'
                });

            if (joinErr) {
                if (joinErr.code === '23505') {
                    alert('You are already a member of this store.');
                } else {
                    alert(joinErr.message || 'Join failed');
                }
                return;
            }

            // 3. 更新本地状态
            const newMembership = {
                id: `${user.id}_${business.id}`,
                businessId: business.id,
                name: user.name,
                email: user.email,
                role: 'Server',
                hourlyRate: 0,
                status: 'Pending',
            };

            setStaff(prev => [...prev, newMembership as Staff]);

            setBusinesses(prev => {
                if (prev.some(b => b.id === business.id)) return prev;
                return [...prev, {
                    id: business.id,
                    name: business.name,
                    ownerId: business.owner_id,
                    joinCode: '',
                    address: '', hours: '', contactInfo: '', notes: '',
                    customCategories: [], customLocations: [], pendingStaffIds: []
                }];
            });

            setJoinStoreCode('');
            setJoinStoreNameAlias('');
            setIsJoinStoreModalOpen(false);

            alert(`Your request to join ${business.name} has been submitted! Please wait for manager approval.`);

        } catch (err: any) {
            console.error('Join store error:', err);
            alert(err.message);
        }
    }, [user, joinStoreCode, setBusinesses, setStaff, setJoinStoreCode, setJoinStoreNameAlias, setIsJoinStoreModalOpen]);

    return {
        handleLogout,
        handleSwitchBusiness,
        handleOpenCreateStore,
        handleOpenEditStore,
        handleSaveStore,
        handleDeleteStore,
        handleJoinStoreSubmit,
    };
}

export default useBusinessHandlers;
