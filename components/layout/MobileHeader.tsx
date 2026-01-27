/**
 * MobileHeader Component
 * 
 * Mobile header with business switcher, theme toggle and logout button
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
    Sun,
    Moon,
} from 'lucide-react';
import { User, Business, Staff } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface MobileHeaderProps {
    user: User;
    activeBusiness: Business | null;
    accessibleBusinesses: Business[];
    currentBusinessId: string | null;
    isBusinessDropdownOpen: boolean;
    setIsBusinessDropdownOpen: (open: boolean) => void;
    staffMemberships: Staff[];
    onSwitchBusiness: (bizId: string | null) => void;
    // onOpenJoinStore removed
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
    onLogout,
    onUpgrade,
}: MobileHeaderProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="md:hidden bg-white dark:bg-[#191919] border-b border-[#e9e9e7] dark:border-[#2f2f2f] px-4 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#37352f] dark:bg-[#e9e9e7] rounded-lg flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-white dark:text-[#191919]" />
                </div>
                <div>
                    <h1 className="font-bold text-[#37352f] dark:text-[#e9e9e7] text-sm leading-none">SmartKitchen</h1>
                    <p className="text-xs text-[#787774] mt-0.5">AI Workspace</p>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                {/* Store Switcher */}
                <div className="relative">
                    <button
                        onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
                        className="flex items-center bg-[#f7f6f3] dark:bg-[#2f2f2f] rounded-lg px-3 py-2 active:bg-[#e9e9e7] dark:active:bg-[#3f3f3f] transition-colors"
                    >
                        <Building2 className="w-4 h-4 text-[#787774] mr-2" />
                        <span className="text-xs font-semibold text-[#37352f] dark:text-[#e9e9e7] truncate max-w-[80px]">
                            {activeBusiness?.name || (user.role === 'Manager' ? 'Master' : 'Stores')}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-[#787774] ml-1 transition-transform ${isBusinessDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isBusinessDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#2f2f2f] rounded-xl shadow-xl border border-[#e9e9e7] dark:border-[#2f2f2f] z-30 py-2 max-h-[60vh] overflow-auto">
                            <div className="px-3 py-2 text-xs text-[#787774] uppercase tracking-wider font-semibold">Select Store</div>

                            {user.role === 'Manager' && (
                                <button
                                    onClick={() => onSwitchBusiness(null)}
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center space-x-3 ${!currentBusinessId ? 'bg-[#f7f6f3] dark:bg-[#3f3f3f] text-[#37352f] dark:text-[#e9e9e7] font-semibold' : 'text-[#787774] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]'}`}
                                >
                                    <div className="w-8 h-8 bg-[#e9e9e7] dark:bg-[#3f3f3f] rounded-lg flex items-center justify-center">
                                        <LayoutDashboard className="w-4 h-4 text-[#787774]" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Master View</div>
                                        <div className="text-xs text-[#9b9a97]">All locations</div>
                                    </div>
                                    {!currentBusinessId && <Check className="w-4 h-4 text-[#27ae60] ml-auto" />}
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
                                        className={`w-full text-left px-4 py-3 text-sm flex items-center space-x-3 ${isActive ? 'bg-[#f7f6f3] dark:bg-[#3f3f3f] text-[#37352f] dark:text-[#e9e9e7]' : 'text-[#787774] hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]'}`}
                                    >
                                        <div className="w-8 h-8 bg-[#e3f2fd] rounded-lg flex items-center justify-center">
                                            <Store className="w-4 h-4 text-[#1565c0]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-medium truncate ${isActive ? 'text-[#37352f] dark:text-[#e9e9e7]' : ''}`}>{b.name}</div>
                                            {isPending && <div className="text-xs text-[#f2994a]">Pending approval</div>}
                                        </div>
                                        {isActive && <Check className="w-4 h-4 text-[#27ae60]" />}
                                    </button>
                                );
                            })}

                            {user.role === 'Staff' && (
                                <button
                                    onClick={() => {
                                        setIsBusinessDropdownOpen(false);
                                        window.location.href = '/dashboard?join=true';
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-[#1565c0] font-semibold hover:bg-[#e3f2fd] border-t border-[#e9e9e7] dark:border-[#2f2f2f] mt-2 flex items-center space-x-3"
                                >
                                    <div className="w-8 h-8 bg-[#e3f2fd] rounded-lg flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-[#1565c0]" />
                                    </div>
                                    <span>Join New Store</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] active:bg-[#e9e9e7] dark:active:bg-[#3f3f3f] transition-colors"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    {theme === 'light' ? (
                        <Moon className="w-4 h-4 text-[#787774]" />
                    ) : (
                        <Sun className="w-4 h-4 text-[#9b9a97]" />
                    )}
                </button>

                {/* Upgrade Button */}
                <button
                    onClick={onUpgrade}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#fff3e0] text-[#9a6324] active:scale-95 transition-all"
                >
                    <Sparkles className="w-4 h-4" />
                </button>

                {/* Logout Button */}
                <button
                    onClick={onLogout}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#f7f6f3] dark:bg-[#2f2f2f] active:bg-[#e9e9e7] dark:active:bg-[#3f3f3f] transition-colors"
                >
                    <LogOut className="w-4 h-4 text-[#787774]" />
                </button>
            </div>
        </div>
    );
}

export default MobileHeader;

