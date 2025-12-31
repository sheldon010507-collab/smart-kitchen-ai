/**
 * Master Dashboard Component
 * 
 * Manager's multi-location overview dashboard
 * Shows all business locations with stats and shopping list summary
 * 
 * Extracted from App.tsx lines 1222-1374
 */

import React from 'react';
import { Plus, AlertTriangle, ShoppingCart, ChevronRight } from 'lucide-react';
import { Business, InventoryItem, SalesReceipt, ViewState } from '../../types';
import { EditableTitle } from '../../components/EditableTitle';
import { LocationCard } from './components/LocationCard';
import { FEATURE_SHOPPING_LIST_ENABLED, ShoppingListSummary as ShoppingListSummaryType } from '../../features/shopping-list';

interface MasterDashboardProps {
    businesses: Business[];
    inventory: InventoryItem[];
    sales: SalesReceipt[];
    shoppingListSummaries: ShoppingListSummaryType[];
    shoppingListLoading: boolean;
    onSelectBusiness: (businessId: string) => void;
    onCreateStore: () => void;
    onEditStore: (business: Business, e: React.MouseEvent) => void;
    setView: (view: ViewState) => void;
}

export function MasterDashboard({
    businesses,
    inventory,
    sales,
    shoppingListSummaries,
    shoppingListLoading,
    onSelectBusiness,
    onCreateStore,
    onEditStore,
    setView,
}: MasterDashboardProps) {
    // Calculate totals for shopping list
    const totalPendingItems = shoppingListSummaries.reduce((acc, s) => acc + s.pending_count, 0);
    const totalUrgentItems = shoppingListSummaries.reduce((acc, s) => acc + s.urgent_count, 0);

    return (
        <div className="space-y-16 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-border pb-6">
                <div>
                    <h2 className="text-2xl md:text-4xl font-bold text-primary tracking-tight">
                        <EditableTitle defaultTitle="Master Dashboard" storageKey="overview_master_dashboard" />
                    </h2>
                    <p className="text-secondary mt-2 md:mt-3 text-base md:text-lg font-light">
                        Overview of {businesses.length} locations
                    </p>
                </div>
                <button
                    onClick={onCreateStore}
                    className="flex items-center justify-center px-4 md:px-6 py-2.5 md:py-3 bg-accent text-white rounded-lg shadow-sm text-sm font-semibold hover:bg-accentHover transition-colors w-full md:w-auto"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Location
                </button>
            </header>

            {/* Locations Grid */}
            <section>
                <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6">
                    Locations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {businesses.map(biz => (
                        <LocationCard
                            key={biz.id}
                            business={biz}
                            inventory={inventory.filter(i => i.businessId === biz.id)}
                            sales={sales.filter(s => s.businessId === biz.id)}
                            onClick={() => onSelectBusiness(biz.id)}
                            onEdit={(e) => onEditStore(biz, e)}
                        />
                    ))}
                </div>
            </section>

            {/* Shopping List Summary */}
            {FEATURE_SHOPPING_LIST_ENABLED && (
                <section>
                    <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6">
                        Shopping List Overview
                    </h3>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                            <div className="text-sm font-medium text-secondary mb-2">Total Pending Items</div>
                            <div className="text-3xl font-bold text-primary">
                                {shoppingListLoading ? '...' : totalPendingItems}
                            </div>
                            <p className="text-xs text-secondary mt-1">across {shoppingListSummaries.length} stores</p>
                        </div>
                        <div className={`p-6 rounded-xl border shadow-sm ${totalUrgentItems > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-border'}`}>
                            <div className={`flex items-center space-x-2 mb-2 ${totalUrgentItems > 0 ? 'text-red-700' : 'text-secondary'}`}>
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm font-medium">Urgent Items</span>
                            </div>
                            <div className={`text-3xl font-bold ${totalUrgentItems > 0 ? 'text-red-600' : 'text-primary'}`}>
                                {shoppingListLoading ? '...' : totalUrgentItems}
                            </div>
                            <p className="text-xs text-secondary mt-1">need immediate attention</p>
                        </div>
                    </div>

                    {/* Store Breakdown */}
                    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-background/50">
                            <h4 className="font-semibold text-primary">Store Breakdown</h4>
                        </div>
                        {shoppingListLoading ? (
                            <div className="p-8 flex justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : shoppingListSummaries.length === 0 ? (
                            <div className="p-8 text-center text-secondary">No shopping list data available.</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {shoppingListSummaries.map((summary) => (
                                    <div
                                        key={summary.business_id}
                                        onClick={() => {
                                            onSelectBusiness(summary.business_id);
                                            setView(ViewState.SHOPPING);
                                        }}
                                        className="group flex items-center justify-between p-4 hover:bg-background cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <ShoppingCart className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h5 className="font-medium text-primary">{summary.business_name}</h5>
                                                <p className="text-xs text-secondary">{summary.total_items} items total</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-primary">{summary.pending_count}</div>
                                                <div className="text-xs text-secondary uppercase tracking-wider">Pending</div>
                                            </div>
                                            {summary.urgent_count > 0 && (
                                                <div className="text-right px-2 py-1 bg-red-100 rounded-lg">
                                                    <div className="text-sm font-bold text-red-700">{summary.urgent_count}</div>
                                                    <div className="text-[10px] text-red-800 font-bold uppercase">Urgent</div>
                                                </div>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}

export default MasterDashboard;
