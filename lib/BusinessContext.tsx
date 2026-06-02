import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import { Business, Staff, User as AppUser } from '../types';
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

    const staffMemberships = staff.filter(s => s.email === user?.email && (s.status === 'Active' || s.status === 'Pending'));

    const accessibleBusinesses = businesses;

    const hasManagerStore = businesses.some(b => b.accessRole === 'Manager' || b.ownerId === user?.id);
    const isMasterView = hasManagerStore && !currentBusinessId;

    const mapBusiness = useCallback((business: any, accessRole: 'Manager' | 'Staff'): Business => ({
        id: business.id,
        name: business.name,
        ownerId: business.owner_id,
        accessRole,
        joinCode: business.join_code || '',
        address: '',
        hours: '',
        customCategories: [],
        customLocations: [],
        pendingStaffIds: [],
    }), []);

    const loadBusinessesForUser = useCallback(async (userId: string, userEmail: string, userName: string) => {
        setLoading(true);
        try {
            const [ownedResult, memberResult] = await Promise.all([
                supabase
                    .from('businesses')
                    .select('id, name, owner_id, join_code')
                    .eq('owner_id', userId),
                supabase
                    .from('business_members')
                    .select('business_id, role, status, businesses(id, name, owner_id, join_code)')
                    .eq('user_id', userId)
                    .eq('status', 'active'),
            ]);

            if (ownedResult.error) throw ownedResult.error;
            if (memberResult.error) throw memberResult.error;

            const byId = new Map<string, Business>();

            (ownedResult.data || []).forEach((business: any) => {
                byId.set(business.id, mapBusiness(business, 'Manager'));
            });

            (memberResult.data || []).forEach((membership: any) => {
                const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
                if (!business?.id) return;

                const accessRole = membership.role === 'owner' ? 'Manager' : 'Staff';
                const existing = byId.get(business.id);
                if (!existing || accessRole === 'Manager') {
                    byId.set(business.id, mapBusiness(business, accessRole));
                }
            });

            const mappedBusinesses = Array.from(byId.values());
            setBusinesses(mappedBusinesses);

            const selfRows: Staff[] = mappedBusinesses
                .filter(business => business.accessRole === 'Staff')
                .map(business => ({
                    id: `${userId}_${business.id}`,
                    businessId: business.id,
                    name: userName,
                    email: userEmail,
                    role: 'Server',
                    hourlyRate: 0,
                    status: 'Active',
                }));

            setStaff(prev => {
                const map = new Map(prev.map(x => [x.id, x]));
                selfRows.forEach(r => map.set(r.id, r));
                return Array.from(map.values());
            });
        } catch (e) {
            console.error('Load businesses failed:', e);
        } finally {
            setLoading(false);
        }
    }, [mapBusiness]);

    // ============ Load Functions ============
    const loadBusinessesForManager = useCallback(async (userId: string) => {
        await loadBusinessesForUser(userId, user?.email || '', user?.user_metadata?.full_name || '');
    }, [loadBusinessesForUser, user?.email, user?.user_metadata?.full_name]);

    const loadBusinessesForStaff = useCallback(async (userId: string, userEmail: string, userName: string) => {
        await loadBusinessesForUser(userId, userEmail, userName);
    }, [loadBusinessesForUser]);

    // Effect: Load initial data when user changes
    useEffect(() => {
        if (!user) {
            setBusinesses([]);
            setStaff([]);
            setCurrentBusinessId(null);
            return;
        }

        const userId = user.id;
        const email = user.email || '';
        const name = user.user_metadata?.full_name || '';
        loadBusinessesForUser(userId, email, name);
    }, [user, loadBusinessesForUser]);

    const refreshBusinesses = useCallback(async () => {
        if (!user) return;
        const email = user.email || '';
        const name = user.user_metadata?.full_name || '';
        await loadBusinessesForUser(user.id, email, name);
    }, [user, loadBusinessesForUser]);

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
                accessRole: 'Manager',
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
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session?.access_token) {
                return { success: false, error: 'Please sign in again.' };
            }

            const response = await fetch('/api/join-store', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionData.session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });

            const payload = await response.json().catch(() => null) as {
                business?: { id: string; name: string; ownerId: string };
                error?: string;
            } | null;

            if (!response.ok || !payload?.business) {
                return { success: false, error: payload?.error || 'Could not join store.' };
            }

            const business = payload.business;

            setBusinesses(prev => {
                if (prev.some(b => b.id === business.id)) return prev;
                return [...prev, {
                    id: business.id,
                    name: business.name,
                    ownerId: business.ownerId,
                    accessRole: 'Staff',
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
            return { success: false, error: e.message || 'Could not join store.' };
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
