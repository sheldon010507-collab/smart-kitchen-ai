/**
 * Manager Master Dashboard - Shopping List Summary View
 */

import React, { useState } from 'react';
import { useShoppingListSummary } from '../hooks/useShoppingListSummary';
import { useAuthContext } from '../../../lib/AuthContext';
import { Building2, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { downloadAggregateCsv } from '../utils/exportToCsv';
import { printAggregateShoppingList } from '../utils/exportToPdf';
import { useAllShoppingLists } from '../hooks/useShoppingList';

interface ShoppingListSummaryProps {
    onSelectBusiness: (businessId: string) => void;
}

const ShoppingListSummary: React.FC<ShoppingListSummaryProps> = ({ onSelectBusiness }) => {
    const { user } = useAuthContext();
    const { summaries, loading, error, refetch } = useShoppingListSummary(user?.id || null);

    // Also fetch full details for Export All function
    const businessIds = summaries.map(s => s.business_id);
    const { itemsByBusiness, loading: loadingDetails } = useAllShoppingLists(businessIds);

    const handleExportAllCsv = () => {
        const data = Array.from(itemsByBusiness.entries()).map(([bizId, items]) => {
            const bizName = summaries.find(s => s.business_id === bizId)?.business_name || 'Unknown Store';
            return { businessName: bizName, items };
        });
        downloadAggregateCsv(data);
    };

    const handleExportAllPdf = () => {
        const data = Array.from(itemsByBusiness.entries()).map(([bizId, items]) => {
            const bizName = summaries.find(s => s.business_id === bizId)?.business_name || 'Unknown Store';
            return { businessName: bizName, items };
        });
        printAggregateShoppingList(data);
    };

    const totalPending = summaries.reduce((sum, s) => sum + s.pending_count, 0);
    const totalUrgent = summaries.reduce((sum, s) => sum + s.urgent_count, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#E9E9E7] pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#37352F]">Shopping List Summary</h2>
                    <p className="text-[#787774] mt-1">Overview of procurement needs across all locations</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F6F3] rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExportAllCsv}
                        disabled={loading || loadingDetails}
                        className="px-3 py-2 text-sm border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] transition-colors disabled:opacity-50"
                    >
                        Export All CSV
                    </button>
                    <button
                        onClick={handleExportAllPdf}
                        disabled={loading || loadingDetails}
                        className="px-3 py-2 text-sm bg-[#37352F] text-white rounded-lg hover:bg-[#2f2e2b] transition-colors disabled:opacity-50"
                    >
                        Print All
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-[#E9E9E7] shadow-sm">
                    <div className="text-sm font-medium text-[#787774] mb-2">Total Stores</div>
                    <div className="text-3xl font-bold text-[#37352F]">{summaries.length}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#E9E9E7] shadow-sm">
                    <div className="text-sm font-medium text-[#787774] mb-2">Total Pending Items</div>
                    <div className="text-3xl font-bold text-[#37352F]">{totalPending}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-red-100 bg-red-50/50 shadow-sm">
                    <div className="flex items-center space-x-2 mb-2 text-red-800">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Urgent Items</span>
                    </div>
                    <div className="text-3xl font-bold text-red-700">{totalUrgent}</div>
                </div>
            </div>

            {/* Store List */}
            <div className="bg-white rounded-xl border border-[#E9E9E7] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E9E9E7] bg-[#F7F6F3]/50">
                    <h3 className="font-semibold text-[#37352F]">Store Breakdown</h3>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37352F]"></div>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">
                        Failed to load summaries.
                    </div>
                ) : summaries.length === 0 ? (
                    <div className="p-12 text-center text-[#787774]">
                        No stores found.
                    </div>
                ) : (
                    <div className="divide-y divide-[#E9E9E7]">
                        {summaries.map((summary) => (
                            <div
                                key={summary.business_id}
                                onClick={() => onSelectBusiness(summary.business_id)}
                                className="group flex items-center justify-between p-6 hover:bg-[#F7F6F3] cursor-pointer transition-colors"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-[#37352F] text-lg">{summary.business_name}</h4>
                                        <p className="text-sm text-[#787774]">
                                            {summary.total_items} items total
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-6">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-[#37352F]">{summary.pending_count}</div>
                                        <div className="text-xs text-[#787774] font-medium uppercase tracking-wider">Pending</div>
                                    </div>

                                    {summary.urgent_count > 0 && (
                                        <div className="text-right px-3 py-1 bg-red-100 rounded-lg">
                                            <div className="text-xl font-bold text-red-700">{summary.urgent_count}</div>
                                            <div className="text-[10px] text-red-800 font-bold uppercase tracking-wider">Urgent</div>
                                        </div>
                                    )}

                                    <ChevronRight className="w-5 h-5 text-[#D3D1CB] group-hover:text-[#37352F] transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShoppingListSummary;
