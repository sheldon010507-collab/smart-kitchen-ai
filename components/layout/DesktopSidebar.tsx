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
    Sparkles, // Added for Subscription
} from 'lucide-react';
import { ViewState, User, Business, Staff } from '../../types';
import { FEATURE_SHOPPING_LIST_ENABLED } from '../../features/shopping-list';

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
    onOpenJoinStore: () => void;
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
    onOpenJoinStore,
    onLogout,
}: DesktopSidebarProps) {

    return (
        <aside className="hidden md:flex flex-col w-72 bg-background fixed h-full z-10 print:hidden pr-6 border-r border-border">
            <div className="p-8 flex items-center space-x-3 mb-6">
                <div className="bg-white p-2 rounded-lg border border-border shadow-sm">
                    <ChefHat className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="font-bold text-primary text-lg leading-none tracking-tight">SmartKitchen</h1>
                    <p className="text-xs text-secondary font-medium mt-1">AI Workspace</p>
                </div>
            </div>

            <div className="px-6 space-y-2 flex-1 overflow-y-auto">
                {/* Business Switcher */}
                {(user.role === 'Manager' || user.role === 'Staff') && (
                    <div className="relative mb-10">
                        <button
                            onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
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

                        {isBusinessDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-border z-20 py-2">
                                {user.role === 'Manager' && (
                                    <button
                                        onClick={() => onSwitchBusiness(null)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-background font-medium"
                                    >
                                        <span className="text-primary">Master View</span>
                                        {!currentBusinessId && <Check className="w-4 h-4 text-accent" />}
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
                                            setIsBusinessDropdownOpen(false);
                                            onOpenJoinStore();
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
                )}

                <div className="space-y-1">
                    <div className="px-4 py-2 text-xs font-bold text-secondary uppercase tracking-widest opacity-70 mb-2">Modules</div>

                    <button
                        onClick={() => setView(ViewState.DASHBOARD)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.DASHBOARD
                            ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                            : 'text-secondary hover:text-primary hover:bg-white/50'
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Overview</span>
                    </button>

                    <button
                        onClick={() => setView(ViewState.INVENTORY)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.INVENTORY
                            ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                            : 'text-secondary hover:text-primary hover:bg-white/50'
                            }`}
                    >
                        <Refrigerator className="w-5 h-5" />
                        <span>Inventory</span>
                    </button>

                    <button
                        onClick={() => setView(ViewState.CHEF)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.CHEF
                            ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                            : 'text-secondary hover:text-primary hover:bg-white/50'
                            }`}
                    >
                        <ChefHat className="w-5 h-5" />
                        <span>AI Chef</span>
                    </button>

                    {FEATURE_SHOPPING_LIST_ENABLED && (
                        <button
                            onClick={() => setView(ViewState.SHOPPING)}
                            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.SHOPPING
                                ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                                : 'text-secondary hover:text-primary hover:bg-white/50'
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
                                ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                                : 'text-secondary hover:text-primary hover:bg-white/50'
                                }`}
                        >
                            <Store className="w-5 h-5" />
                            <span>Store Ops</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 mt-auto border-t border-border bg-background/50">
                {/* Upgrade Button - Highlighted */}
                <button
                    onClick={() => setView(ViewState.SUBSCRIPTION)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 mb-4 rounded-xl transition-all group relative overflow-hidden ${view === ViewState.SUBSCRIPTION
                            ? 'bg-gradient-to-r from-primary to-slate-800 text-white shadow-md'
                            : 'bg-white border border-primary/20 text-primary hover:shadow-md'
                        }`}
                >
                    <div className={`absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity ${view === ViewState.SUBSCRIPTION ? 'hidden' : ''}`} />
                    <Sparkles className="w-5 h-5" />
                    <span className="font-bold">Upgrade Plan</span>
                </button>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-secondary hover:text-primary rounded-lg transition-colors text-sm font-medium hover:bg-white mb-2"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                </button>

                <button
                    onClick={() => setView(ViewState.PRIVACY)}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-secondary hover:text-primary rounded-lg transition-colors text-xs font-medium"
                >
                    <Shield className="w-4 h-4" />
                    <span>Cookies & Privacy</span>
                </button>
            </div>
        </aside>
    );
}

export default DesktopSidebar;
