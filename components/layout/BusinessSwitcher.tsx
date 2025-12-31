/**
 * Business Switcher Component
 * 
 * Dropdown menu for switching between businesses/stores
 * Used in both Desktop Sidebar and Mobile Header
 */

import React from 'react';
import { Building2, ChevronDown, Check, Plus, Clock } from 'lucide-react';
import { Business, User, Staff } from '../../types';

interface BusinessSwitcherProps {
    user: User;
    businesses: Business[];
    currentBusinessId: string | null;
    staffMemberships: Staff[];
    isOpen: boolean;
    onToggle: () => void;
    onSwitch: (businessId: string | null) => void;
    onJoinStore: () => void;
    variant?: 'desktop' | 'mobile';
}

export function BusinessSwitcher({
    user,
    businesses,
    currentBusinessId,
    staffMemberships,
    isOpen,
    onToggle,
    onSwitch,
    onJoinStore,
    variant = 'desktop',
}: BusinessSwitcherProps) {
    const activeBusiness = businesses.find(b => b.id === currentBusinessId);

    // Filter accessible businesses based on role
    const accessibleBusinesses = user.role === 'Manager'
        ? businesses.filter(b => user.ownedBusinessIds?.includes(b.id))
        : businesses.filter(b => staffMemberships.some(m => m.businessId === b.id));

    const handleSwitch = (bizId: string | null) => {
        onSwitch(bizId);
        onToggle(); // Close dropdown
    };

    if (variant === 'mobile') {
        return (
            <div className="relative">
                <button
                    onClick={onToggle}
                    className="flex items-center bg-gray-100 rounded-lg px-3 py-2 active:bg-gray-200 transition-colors"
                >
                    <Building2 className="w-4 h-4 text-slate-600 mr-2" />
                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[80px]">
                        {activeBusiness?.name || (user.role === 'Manager' ? 'Master' : 'Stores')}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2 min-w-[200px]">
                        {user.role === 'Manager' && (
                            <button
                                onClick={() => handleSwitch(null)}
                                className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-gray-50"
                            >
                                <span className="text-gray-900 font-medium">Master View</span>
                                {!currentBusinessId && <Check className="w-4 h-4 text-blue-500" />}
                            </button>
                        )}

                        {accessibleBusinesses.map(b => {
                            const mem = staffMemberships.find(m => m.businessId === b.id);
                            const isPending = mem?.status === 'Pending';
                            return (
                                <button
                                    key={b.id}
                                    onClick={() => handleSwitch(b.id)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-gray-50"
                                >
                                    <span className="truncate text-gray-700 flex items-center">
                                        {b.name}
                                        {isPending && (
                                            <span className="ml-2 bg-amber-100 text-amber-600 text-xs px-1.5 py-0.5 rounded">
                                                Pending
                                            </span>
                                        )}
                                    </span>
                                    {b.id === currentBusinessId && <Check className="w-4 h-4 text-blue-500" />}
                                </button>
                            );
                        })}

                        {user.role === 'Staff' && (
                            <button
                                onClick={() => {
                                    onToggle();
                                    onJoinStore();
                                }}
                                className="w-full flex items-center px-4 py-3 text-sm text-left hover:bg-gray-50 border-t border-gray-100 mt-1 text-blue-600 font-medium"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Join Store
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Desktop variant
    return (
        <div className="relative mb-10">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-border rounded-lg text-sm text-primary hover:border-accent transition-colors shadow-sm"
            >
                <div className="flex items-center space-x-3 truncate">
                    <Building2 className="w-4 h-4 text-secondary" />
                    <span className="font-semibold truncate">
                        {activeBusiness ? activeBusiness.name : user.role === 'Manager' ? 'Master Dashboard' : 'Select Store'}
                    </span>
                </div>
                <ChevronDown className="w-4 h-4 text-secondary" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-border z-20 py-2">
                    {user.role === 'Manager' && (
                        <button
                            onClick={() => handleSwitch(null)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-background font-medium"
                        >
                            <span className="text-primary">Master View</span>
                            {!currentBusinessId && <Check className="w-4 h-4 text-accent" />}
                        </button>
                    )}

                    {accessibleBusinesses.length > 0 ? (
                        accessibleBusinesses.map(b => {
                            const mem = staffMemberships.find(m => m.businessId === b.id);
                            const isPending = mem?.status === 'Pending';
                            return (
                                <button
                                    key={b.id}
                                    onClick={() => handleSwitch(b.id)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-background"
                                >
                                    <span className="truncate text-secondary">
                                        {b.name}
                                        {user.role === 'Staff' && isPending ? ' (Pending)' : ''}
                                    </span>
                                    {b.id === currentBusinessId && <Check className="w-4 h-4 text-accent" />}
                                </button>
                            );
                        })
                    ) : (
                        <div className="px-4 py-2 text-xs text-secondary italic">No stores found.</div>
                    )}

                    {user.role === 'Staff' && (
                        <button
                            onClick={() => {
                                onToggle();
                                onJoinStore();
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-background border-t border-border mt-1 text-accent font-bold"
                        >
                            <span className="flex items-center">
                                <Plus className="w-3 h-3 mr-2" /> Add Store
                            </span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default BusinessSwitcher;
