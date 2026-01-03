/**
 * MobileHeader Component
 * 
 * Mobile header with business switcher and logout button
 * Extracted from App.tsx for reusability
 */

import React from 'react';
import {
    ChefHat,
    Store,
    LogOut,
    Building2,
    ChevronDown,
    Check,
    Plus,
    LayoutDashboard,
    Sparkles,
} from 'lucide-react';
import { User, Business, Staff } from '../../types';

interface MobileHeaderProps {
    user: User;
    activeBusiness: Business | null;
    accessibleBusinesses: Business[];
    currentBusinessId: string | null;
    isBusinessDropdownOpen: boolean;
    setIsBusinessDropdownOpen: (open: boolean) => void;
    staffMemberships: Staff[];
    onSwitchBusiness: (bizId: string | null) => void;
    onOpenJoinStore: () => void;
    onLogout: () => void;
    onUpgrade: () => void;
}

export function MobileHeader({
    user,
    activeBusiness,
    accessibleBusinesses,
    currentBusinessId,
    isBusinessDropdownOpen,
    setIsBusinessDropdownOpen,
    staffMemberships,
    onSwitchBusiness,
    onOpenJoinStore,
    onLogout,
    onUpgrade,
}: MobileHeaderProps) {

    return (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-slate-800 text-sm leading-none">SmartKitchen</h1>
                    <p className="text-xs text-gray-400 mt-0.5">AI Workspace</p>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                {/* Store Switcher */}
                <div className="relative">
                    <button
                        onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
                        className="flex items-center bg-gray-100 rounded-lg px-3 py-2 active:bg-gray-200 transition-colors"
                    >
                        <Building2 className="w-4 h-4 text-slate-600 mr-2" />
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[80px]">
                            {activeBusiness?.name || (user.role === 'Manager' ? 'Master' : 'Stores')}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 ml-1 transition-transform ${isBusinessDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isBusinessDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-30 py-2 max-h-[60vh] overflow-auto">
                            <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider font-semibold">Select Store</div>

                            {user.role === 'Manager' && (
                                <button
                                    onClick={() => onSwitchBusiness(null)}
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center space-x-3 ${!currentBusinessId ? 'bg-slate-50 text-slate-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                                        <LayoutDashboard className="w-4 h-4 text-slate-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Master View</div>
                                        <div className="text-xs text-gray-400">All locations</div>
                                    </div>
                                    {!currentBusinessId && <Check className="w-4 h-4 text-slate-800 ml-auto" />}
                                </button>
                            )}

                            {accessibleBusinesses.map(b => {
                                const mem = user.role === 'Staff' ? staffMemberships.find(m => m.businessId === b.id) : null;
                                const isPending = mem?.status === 'Pending';
                                const isActive = b.id === currentBusinessId;
                                return (
                                    <button
                                        key={b.id}
                                        onClick={() => onSwitchBusiness(b.id)}
                                        className={`w-full text-left px-4 py-3 text-sm flex items-center space-x-3 ${isActive ? 'bg-slate-50 text-slate-800' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Store className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-medium truncate ${isActive ? 'text-slate-800' : ''}`}>{b.name}</div>
                                            {isPending && <div className="text-xs text-amber-600">Pending approval</div>}
                                        </div>
                                        {isActive && <Check className="w-4 h-4 text-slate-800" />}
                                    </button>
                                );
                            })}

                            {user.role === 'Staff' && (
                                <button
                                    onClick={() => {
                                        setIsBusinessDropdownOpen(false);
                                        onOpenJoinStore();
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-blue-600 font-semibold hover:bg-blue-50 border-t border-gray-100 mt-2 flex items-center space-x-3"
                                >
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span>Join New Store</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Upgrade Button */}
                <button
                    onClick={onUpgrade}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 active:scale-95 transition-all"
                >
                    <Sparkles className="w-4 h-4" />
                </button>

                {/* Logout Button */}
                <button
                    onClick={onLogout}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200 transition-colors"
                >
                    <LogOut className="w-4 h-4 text-gray-500" />
                </button>
            </div>
        </div>
    );
}

export default MobileHeader;
