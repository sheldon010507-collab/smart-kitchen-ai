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
import { ViewState } from '../types';
import { useAuthContext } from '../lib/AuthContext';
import { useBusiness } from '../lib/BusinessContext';

interface UseBusinessHandlersProps {
    setView: (view: ViewState) => void;
    setIsBusinessDropdownOpen: (open: boolean) => void;
}

export function useBusinessHandlers(props: UseBusinessHandlersProps) {
    const {
        setView,
        setIsBusinessDropdownOpen,
    } = props;

    const { user, setUser } = useAuthContext();
    const { setCurrentBusinessId, staffMemberships } = useBusiness();

    // --- Logout ---
    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        // Contexts will auto-update based on auth state change
        setView(ViewState.DASHBOARD);
    }, [setView]);

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

    return {
        handleLogout,
        handleSwitchBusiness,
    };
}

export default useBusinessHandlers;
