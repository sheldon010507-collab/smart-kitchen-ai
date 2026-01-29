import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import { Business, Staff, User as AppUser } from '../types';
import { normMemberStatus } from '../utils/transforms';
import { useAuthContext } from './AuthContext';

// ============ Types ============
interface BusinessContextType {
    // State
    businesses: Business[];
    currentBusinessId: string | null;
    activeBusiness: Business | undefined;
    staffMemberships: Staff[];
    accessibleBusinesses: Business[];
    isMasterView: boolean;
    loading: boolean;

    // Actions
    setCurrentBusinessId: (id: string | null) => void;
    loadBusinessesForManager: (userId: string) => Promise<void>;
    loadBusinessesForStaff: (userId: string, userEmail: string, userName: string) => Promise<void>;
    createBusiness: (name: string, userId: string) => Promise<Business | null>;
    updateBusiness: (business: Partial<Business>) => Promise<boolean>;
    deleteBusiness: (businessId: string) => Promise<boolean>;
    joinBusinessByCode: (code: string, user: AppUser) => Promise<{ success: boolean; businessId?: string; error?: string }>;
    refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// ============ Provider ============
interface BusinessProviderProps {
    children: ReactNode;
}

export function BusinessProvider({ children }: BusinessProviderProps) {
    const { user } = useAuthContext();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Derived state
    const activeBusiness = businesses.find(b => b.id === currentBusinessId);

    const staffMemberships = user?.user_metadata?.role === 'Staff'
        ? staff.filter(s => s.email === user.email && (s.status === 'Active' || s.status === 'Pending'))
        : [];

    const accessibleBusinesses = user?.user_metadata?.role === 'Manager'
        ? businesses.filter(b => b.ownerId === user.id)
        : businesses.filter(b => staffMemberships.some(m => m.businessId === b.id));

    const isMasterView = user?.user_metadata?.role === 'Manager' && !currentBusinessId;

    // ============ Load Functions ============
    const loadBusinessesForManager = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            const { data: bizList, error } = await supabase
                .from('businesses')
                .select('id, name, owner_id, join_code')
                .eq('owner_id', userId);

            if (!error && bizList) {
                const mapped: Business[] = bizList.map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    ownerId: b.owner_id,
                    joinCode: b.join_code || '',
                    address: '',
                    hours: '',
                    customCategories: [],
                    customLocations: [],
                    pendingStaffIds: [],
                }));
                setBusinesses(mapped);
            }
        } catch (e) {
            console.error('Load businesses for manager failed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadBusinessesForStaff = useCallback(async (userId: string, userEmail: string, userName: string) => {
        setLoading(true);
        try {
            const { data: mems, error: memErr } = await supabase
                .from('business_members')
                .select('business_id, status')
                .eq('user_id', userId);

            if (!memErr && mems && mems.length > 0) {
                const bizIds = mems.map(m => m.business_id);

                const { data: bizRows, error: bizErr } = await supabase
                    .from('businesses')
                    .select('id, name, owner_id')
                    .in('id', bizIds);

                if (!bizErr && bizRows) {
                    const mappedBiz: Business[] = bizRows.map((b: any) => ({
                        id: b.id,
                        name: b.name,
                        ownerId: b.owner_id,
                        joinCode: '',
                        address: '',
                        hours: '',
                        customCategories: [],
                        customLocations: [],
                        pendingStaffIds: [],
                    }));
                    setBusinesses(mappedBiz);

                    // Update staff memberships
                    const selfRows: Staff[] = mems.map(m => ({
                        id: `${userId}_${m.business_id}`,
                        businessId: m.business_id,
                        name: userName,
                        email: userEmail,
                        role: 'Server',
                        hourlyRate: 0,
                        status: normMemberStatus(m.status),
                    }));

                    setStaff(prev => {
                        const map = new Map(prev.map(x => [x.id, x]));
                        selfRows.forEach(r => map.set(r.id, r));
                        return Array.from(map.values());
                    });
                }
            }
        } catch (e) {
            console.error('Load businesses for staff failed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Effect: Load initial data when user changes
    useEffect(() => {
        if (!user) {
            setBusinesses([]);
            setStaff([]);
            setCurrentBusinessId(null);
            return;
        }

        const role = user.user_metadata?.role;
        const userId = user.id;

        if (role === 'Manager') {
            loadBusinessesForManager(userId);
        } else if (role === 'Staff') {
            const email = user.email || '';
            const name = user.user_metadata?.full_name || '';
            loadBusinessesForStaff(userId, email, name);
        }
    }, [user, loadBusinessesForManager, loadBusinessesForStaff]);

    const refreshBusinesses = useCallback(async () => {
        if (!user) return;
        const role = user.user_metadata?.role;
        if (role === 'Manager') {
            await loadBusinessesForManager(user.id);
        } else {
            const email = user.email || '';
            const name = user.user_metadata?.full_name || '';
            await loadBusinessesForStaff(user.id, email, name);
        }
    }, [user, loadBusinessesForManager, loadBusinessesForStaff]);

    // ============ CRUD Operations ============
    const createBusiness = useCallback(async (name: string, userId: string): Promise<Business | null> => {
        try {
            const { data: biz, error } = await supabase
                .from('businesses')
                .insert({ name: name.trim(), owner_id: userId })
                .select('id, name, owner_id')
                .single();

            if (error) throw error;
            if (!biz) throw new Error('Failed to create business');

            await supabase.from('business_members').insert({
                business_id: biz.id,
                user_id: userId,
                role: 'owner',
                status: 'active'
            });

            const newBusiness: Business = {
                id: biz.id,
                name: biz.name,
                ownerId: biz.owner_id,
                joinCode: 'PENDING',
                customCategories: ['Produce', 'Dairy', 'Meat', 'Pantry'],
                customLocations: ['Fridge', 'Freezer', 'Pantry'],
                pendingStaffIds: [],
            };

            setBusinesses(prev => [...prev, newBusiness]);

            // 🆕 Mark this business as needing initial setup
            localStorage.setItem(`newBusinessSetupRequired_${biz.id}`, 'true');

            return newBusiness;
        } catch (e: any) {
            console.error('Create business failed:', e);
            return null;
        }
    }, []);

    const updateBusiness = useCallback(async (businessData: Partial<Business>): Promise<boolean> => {
        if (!businessData.id) return false;

        try {
            const { error } = await supabase
                .from('businesses')
                .update({ name: businessData.name })
                .eq('id', businessData.id);

            if (error) throw error;

            setBusinesses(prev => prev.map(b =>
                b.id === businessData.id ? { ...b, ...businessData } as Business : b
            ));
            return true;
        } catch (e: any) {
            console.error('Update business failed:', e);
            return false;
        }
    }, []);

    const deleteBusiness = useCallback(async (businessId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('businesses')
                .delete()
                .eq('id', businessId);

            if (error) {
                console.error('Delete business failed:', error);
                return false;
            }

            setBusinesses(prev => prev.filter(b => b.id !== businessId));
            if (currentBusinessId === businessId) {
                setCurrentBusinessId(null);
            }

            return true;
        } catch (e: any) {
            console.error('Delete business failed:', e);
            return false;
        }
    }, [currentBusinessId]);

    const joinBusinessByCode = useCallback(async (
        code: string,
        userParam: AppUser
    ): Promise<{ success: boolean; businessId?: string; error?: string }> => {
        try {
            const { data: business, error: findErr } = await supabase
                .from('businesses')
                .select('id, name, owner_id')
                .eq('join_code', code.toUpperCase())
                .single();

            if (findErr || !business) {
                return { success: false, error: 'Invalid or unauthorized store code.' };
            }

            const { error: joinErr } = await supabase
                .from('business_members')
                .insert({
                    business_id: business.id,
                    user_id: userParam.id,
                    role: 'staff',
                    status: 'active'
                });

            if (joinErr) {
                if (joinErr.code === '23505') {
                    return { success: false, error: 'You are already a member of this store.' };
                }
                return { success: false, error: joinErr.message };
            }

            setBusinesses(prev => {
                if (prev.some(b => b.id === business.id)) return prev;
                return [...prev, {
                    id: business.id,
                    name: business.name,
                    ownerId: business.owner_id,
                    joinCode: '',
                    customCategories: [],
                    customLocations: [],
                    pendingStaffIds: []
                }];
            });

            setStaff(prev => [...prev, {
                id: `${userParam.id}_${business.id}`,
                businessId: business.id,
                name: userParam.name,
                email: userParam.email,
                role: 'Server',
                hourlyRate: 0,
                status: 'Active',
            } as Staff]);

            return { success: true, businessId: business.id };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }, []);

    const value: BusinessContextType = {
        businesses,
        currentBusinessId,
        activeBusiness,
        staffMemberships,
        accessibleBusinesses,
        isMasterView,
        loading,
        setCurrentBusinessId,
        loadBusinessesForManager,
        loadBusinessesForStaff,
        createBusiness,
        updateBusiness,
        deleteBusiness,
        joinBusinessByCode,
        refreshBusinesses,
    };

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
}

// ============ Hook ============
export function useBusiness() {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
}
