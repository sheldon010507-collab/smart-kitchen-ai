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
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div>
                    <h2 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                        <EditableTitle defaultTitle="Master Dashboard" storageKey="overview_master_dashboard" />
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 md:mt-3 text-base md:text-lg">
                        Overview of {businesses.length} locations
                    </p>
                </div>
                <button
                    onClick={onCreateStore}
                    className="flex items-center justify-center px-4 md:px-6 py-2.5 md:py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg shadow-sm text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors w-full md:w-auto"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Location
                </button>
            </header>

            {/* Locations Grid */}
            <section>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">
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
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">
                        Shopping List Overview
                    </h3>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Pending Items</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                {shoppingListLoading ? '...' : totalPendingItems}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">across {shoppingListSummaries.length} stores</p>
                        </div>
                        <div className={`p-6 rounded-xl border shadow-sm ${totalUrgentItems > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                            <div className={`flex items-center space-x-2 mb-2 ${totalUrgentItems > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm font-medium">Urgent Items</span>
                            </div>
                            <div className={`text-3xl font-bold ${totalUrgentItems > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                {shoppingListLoading ? '...' : totalUrgentItems}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">need immediate attention</p>
                        </div>
                    </div>

                    {/* Store Breakdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <h4 className="font-semibold text-gray-900 dark:text-white">Store Breakdown</h4>
                        </div>
                        {shoppingListLoading ? (
                            <div className="p-8 flex justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                            </div>
                        ) : shoppingListSummaries.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No shopping list data available.</div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {shoppingListSummaries.map((summary) => (
                                    <div
                                        key={summary.business_id}
                                        onClick={() => {
                                            onSelectBusiness(summary.business_id);
                                            setView(ViewState.SHOPPING);
                                        }}
                                        className="group flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                                <ShoppingCart className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h5 className="font-medium text-gray-900 dark:text-white">{summary.business_name}</h5>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{summary.total_items} items total</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-gray-900 dark:text-white">{summary.pending_count}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending</div>
                                            </div>
                                            {summary.urgent_count > 0 && (
                                                <div className="text-right px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                                    <div className="text-sm font-bold text-red-700 dark:text-red-400">{summary.urgent_count}</div>
                                                    <div className="text-[10px] text-red-800 dark:text-red-300 font-bold uppercase">Urgent</div>
                                                </div>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
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
