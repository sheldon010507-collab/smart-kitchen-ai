/**
 * DesktopSidebar Component
 * 
 * Desktop navigation sidebar with business switcher and navigation modules
 * Extracted from App.tsx for reusability
 */

import React from 'react';
import {
    LayoutDashboard,
    Refrigerator,
    Plus,
    ChefHat,
    Store,
    LogOut,
    Building2,
    ChevronDown,
    Check,
    Shield,
    ShoppingCart,
    Sparkles,
    Sun,
    Moon,
} from 'lucide-react';
import { ViewState, User, Business, Staff } from '../../types';
import { FEATURE_SHOPPING_LIST_ENABLED } from '../../features/shopping-list';
import { useTheme } from '../../hooks/useTheme';

interface DesktopSidebarProps {
    user: User;
    view: ViewState;
    setView: (view: ViewState) => void;
    activeBusiness: Business | null;
    accessibleBusinesses: Business[];
    currentBusinessId: string | null;
    isBusinessDropdownOpen: boolean;
    setIsBusinessDropdownOpen: (open: boolean) => void;
    staffMemberships: Staff[];
    onSwitchBusiness: (bizId: string | null) => void;
    // onOpenJoinStore removed - handled via route
    onLogout: () => void;
}

export function DesktopSidebar({
    user,
    view,
    setView,
    activeBusiness,
    accessibleBusinesses,
    currentBusinessId,
    isBusinessDropdownOpen,
    setIsBusinessDropdownOpen,
    staffMemberships,
    onSwitchBusiness,
    onLogout,
}: DesktopSidebarProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-[#191919] fixed h-full z-10 print:hidden pr-6 border-r border-[#e9e9e7] dark:border-[#2f2f2f]">
            {/* Header with Logo and Theme Toggle */}
            <div className="p-8 flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="bg-[#f7f6f3] dark:bg-[#2f2f2f] p-2 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f]">
                        <ChefHat className="w-6 h-6 text-[#37352f] dark:text-[#e9e9e7]" />
                    </div>
                    <div>
                        <h1 className="font-bold text-[#37352f] dark:text-[#e9e9e7] text-lg leading-none tracking-tight">SmartKitchen</h1>
                        <p className="text-xs text-[#787774] font-medium mt-1">AI Workspace</p>
                    </div>
                </div>

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] transition-colors"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    {theme === 'light' ? (
                        <Moon className="w-5 h-5 text-[#787774]" />
                    ) : (
                        <Sun className="w-5 h-5 text-[#9b9a97]" />
                    )}
                </button>
            </div>

            <div className="px-6 space-y-2 flex-1 overflow-y-auto">
                {/* Business Switcher */}
                {(user.role === 'Manager' || user.role === 'Staff') && (
                    <div className="relative mb-10">
                        <button
                            onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-lg text-sm text-[#37352f] dark:text-[#e9e9e7] hover:border-[#37352f] dark:hover:border-[#555] transition-colors shadow-sm"
                        >
                            <div className="flex items-center space-x-3 truncate">
                                <Building2 className="w-4 h-4 text-[#787774]" />
                                <span className="font-semibold truncate">
                                    {activeBusiness ? activeBusiness.name : user.role === 'Manager' ? 'Master Dashboard' : 'Select Store'}
                                </span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-[#787774]" />
                        </button>

                        {isBusinessDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#2f2f2f] rounded-lg shadow-xl border border-[#e9e9e7] dark:border-[#2f2f2f] z-20 py-2">
                                {user.role === 'Manager' && (
                                    <button
                                        onClick={() => onSwitchBusiness(null)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] font-medium"
                                    >
                                        <span className="text-[#37352f] dark:text-[#e9e9e7]">Master View</span>
                                        {!currentBusinessId && <Check className="w-4 h-4 text-[#27ae60]" />}
                                    </button>
                                )}

                                {accessibleBusinesses.length > 0 ? (
                                    accessibleBusinesses.map(b => {
                                        const mem = user.role === 'Staff' ? staffMemberships.find(m => m.businessId === b.id) : null;
                                        const isPending = mem?.status === 'Pending';
                                        return (
                                            <button
                                                key={b.id}
                                                onClick={() => onSwitchBusiness(b.id)}
                                                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f]"
                                            >
                                                <span className="truncate text-[#37352f] dark:text-[#e9e9e7]">
                                                    {b.name}
                                                    {user.role === 'Staff' && isPending ? ' (Pending)' : ''}
                                                    {b.accessRole && (
                                                        <span className="ml-2 text-[10px] uppercase tracking-wider text-[#787774]">
                                                            {b.accessRole}
                                                        </span>
                                                    )}
                                                </span>
                                                {b.id === currentBusinessId && <Check className="w-4 h-4 text-[#27ae60]" />}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="px-4 py-2 text-xs text-[#787774] italic">No stores found.</div>
                                )}

                                {user.role === 'Staff' && (
                                    <button
                                        onClick={() => {
                                            setIsBusinessDropdownOpen(false);
                                            // Handle join navigation
                                            window.location.href = '/dashboard?join=true';
                                        }}
                                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-[#f7f6f3] dark:hover:bg-[#3f3f3f] border-t border-[#e9e9e7] dark:border-[#2f2f2f] mt-1 text-[#37352f] dark:text-[#e9e9e7] font-bold"
                                    >
                                        <span className="flex items-center">
                                            <Plus className="w-3 h-3 mr-2" /> Add Store
                                        </span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-1">
                    <div className="px-4 py-2 text-xs font-bold text-[#787774] uppercase tracking-widest mb-2">Modules</div>

                    <button
                        onClick={() => setView(ViewState.DASHBOARD)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.DASHBOARD
                            ? 'bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e9e9e7] font-semibold border border-[#e9e9e7] dark:border-[#2f2f2f]'
                            : 'text-[#37352f] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e9e9e7] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]'
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Overview</span>
                    </button>

                    <button
                        onClick={() => setView(ViewState.INVENTORY)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.INVENTORY
                            ? 'bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e9e9e7] font-semibold border border-[#e9e9e7] dark:border-[#2f2f2f]'
                            : 'text-[#37352f] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e9e9e7] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]'
                            }`}
                    >
                        <Refrigerator className="w-5 h-5" />
                        <span>Inventory</span>
                    </button>

                    <button
                        onClick={() => setView(ViewState.CHEF)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.CHEF
                            ? 'bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e9e9e7] font-semibold border border-[#e9e9e7] dark:border-[#2f2f2f]'
                            : 'text-[#37352f] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e9e9e7] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]'
                            }`}
                    >
                        <ChefHat className="w-5 h-5" />
                        <span>AI Chef</span>
                    </button>

                    {FEATURE_SHOPPING_LIST_ENABLED && (
                        <button
                            onClick={() => setView(ViewState.SHOPPING)}
                            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.SHOPPING
                                ? 'bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e9e9e7] font-semibold border border-[#e9e9e7] dark:border-[#2f2f2f]'
                                : 'text-[#37352f] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e9e9e7] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]'
                                }`}
                        >
                            <ShoppingCart className="w-5 h-5" />
                            <span>Shopping List</span>
                        </button>
                    )}

                    {user.role === 'Manager' && (
                        <button
                            onClick={() => setView(ViewState.RESTAURANT)}
                            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.RESTAURANT
                                ? 'bg-[#f7f6f3] dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e9e9e7] font-semibold border border-[#e9e9e7] dark:border-[#2f2f2f]'
                                : 'text-[#37352f] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e9e9e7] hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f]'
                                }`}
                        >
                            <Store className="w-5 h-5" />
                            <span>Store Ops</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 mt-auto border-t border-[#e9e9e7] dark:border-[#2f2f2f]">
                {/* Upgrade Button - Highlighted */}
                <button
                    onClick={() => setView(ViewState.SUBSCRIPTION)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 mb-4 rounded-xl transition-all group relative overflow-hidden ${view === ViewState.SUBSCRIPTION
                        ? 'bg-[#37352f] dark:bg-[#e9e9e7] text-white dark:text-[#191919] shadow-md'
                        : 'bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#2f2f2f] text-[#37352f] dark:text-[#e9e9e7] hover:shadow-md'
                        }`}
                >
                    <Sparkles className="w-5 h-5" />
                    <span className="font-bold">Upgrade Plan</span>
                </button>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-[#787774] hover:text-[#37352f] dark:hover:text-[#e9e9e7] rounded-lg transition-colors text-sm font-medium hover:bg-[#f7f6f3] dark:hover:bg-[#2f2f2f] mb-2"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                </button>

                <button
                    onClick={() => setView(ViewState.PRIVACY)}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-[#787774] hover:text-[#37352f] dark:hover:text-[#e9e9e7] rounded-lg transition-colors text-xs font-medium"
                >
                    <Shield className="w-4 h-4" />
                    <span>Cookies & Privacy</span>
                </button>
            </div>
        </aside>
    );
}

export default DesktopSidebar;

