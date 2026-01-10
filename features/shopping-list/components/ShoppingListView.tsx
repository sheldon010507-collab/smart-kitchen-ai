/**
 * Main Shopping List View for a single store (Staff & Manager)
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import type {
    ShoppingListItem,
    ShoppingListTab,
    ShoppingListFilters,
    CreateShoppingListItem,
    ShoppingListStatus
} from '../types';
import { useShoppingList } from '../hooks/useShoppingList';
import { useShoppingListMutations } from '../hooks/useShoppingListMutations';
import { useAuthContext } from '../../../lib/AuthContext';
import ShoppingListItemRow from './ShoppingListItem';
import AddItemModal from './AddItemModal';
import ExportButton from './ExportButton';
import AutoGenerateButton from './AutoGenerateButton';
import EmptyState from './EmptyState';
import RoutineListView from './RoutineListView';

interface ShoppingListViewProps {
    businessId: string;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({ businessId }) => {
    const { user } = useAuthContext();
    const [activeTab, setActiveTab] = useState<ShoppingListTab>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);

    // Data Fetching
    const { items, loading, error, refetch } = useShoppingList({
        businessId,
        filters: {
            tab: activeTab,
            searchQuery: searchQuery || undefined
        }
    });

    // Group by Supplier toggle
    const [groupBySupplier, setGroupBySupplier] = useState(false);

    // Group items by supplier if toggle is on
    const groupedItems = useMemo(() => {
        if (!groupBySupplier) return null;
        const groups: Map<string, ShoppingListItem[]> = new Map();

        for (const item of items) {
            const key = item.supplier || 'No Supplier';
            const existing = groups.get(key) || [];
            existing.push(item);
            groups.set(key, existing);
        }

        // Sort groups: named suppliers first, then 'No Supplier'
        return Array.from(groups.entries()).sort((a, b) => {
            if (a[0] === 'No Supplier') return 1;
            if (b[0] === 'No Supplier') return -1;
            return a[0].localeCompare(b[0]);
        });
    }, [items, groupBySupplier]);


    // Mutations
    const {
        addItem,
        updateItem,
        deleteItem,
        markAsPurchased,
        markAsCancelled,
        markAsPending
    } = useShoppingListMutations(user?.id || null);

    // Handlers
    const handleSaveItem = async (itemData: CreateShoppingListItem) => {
        let result;
        if (editingItem) {
            result = await updateItem({ id: editingItem.id, ...itemData });
        } else {
            result = await addItem(itemData);
        }

        if (!result.error) {
            refetch();
        }
        return result;
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            await deleteItem(id);
            refetch();
        }
    };

    const handleStatusChange = async (id: string, newStatus: ShoppingListStatus) => {
        let result;
        if (newStatus === 'purchased') result = await markAsPurchased(id);
        else if (newStatus === 'cancelled') result = await markAsCancelled(id);
        else result = await markAsPending(id);

        if (!result.error) {
            refetch();
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (item: ShoppingListItem) => {
        setEditingItem(item);
        setIsAddModalOpen(true);
    };

    // Get unique categories for autocomplete
    const categories = useMemo(() => {
        return Array.from(new Set(items.map(i => i.category).filter(Boolean) as string[])).sort();
    }, [items]);

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header Controls */}
            <div className="p-4 md:p-6 border-b border-[#E9E9E7] space-y-3 md:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">

                    {/* Tabs */}
                    <div className="flex bg-[#F7F6F3] p-1 rounded-lg self-start overflow-x-auto">
                        {(['pending', 'purchased', 'cancelled', 'routines'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as ShoppingListTab)}
                                className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all capitalize whitespace-nowrap ${activeTab === tab
                                    ? 'bg-white text-[#37352F] shadow-sm'
                                    : 'text-[#787774] hover:text-[#37352F]'
                                    }`}
                            >
                                {tab === 'routines' ? '📋 Routines' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 overflow-x-auto">
                        {/* Group by Supplier Toggle */}
                        <button
                            onClick={() => setGroupBySupplier(!groupBySupplier)}
                            className={`flex items-center space-x-1 px-3 py-2 text-xs md:text-sm rounded-lg border transition-colors ${groupBySupplier
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'border-[#E9E9E7] text-[#787774] hover:bg-[#F7F6F3]'
                                }`}
                            title="Group by Supplier"
                        >
                            <Users className="w-4 h-4" />
                            <span className="hidden md:inline">By Supplier</span>
                        </button>

                        <ExportButton items={items} />

                        {activeTab === 'pending' && (
                            <>
                                <AutoGenerateButton
                                    businessId={businessId}
                                    userId={user?.id || ''}
                                    onComplete={refetch}
                                />
                                <button
                                    onClick={openAddModal}
                                    className="flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-[#37352F] text-white rounded-lg hover:bg-[#2f2e2b] transition-colors text-xs md:text-sm font-medium whitespace-nowrap"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add Item</span>
                                    <span className="sm:hidden">Add</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[#F7F6F3] border-none rounded-lg text-sm focus:ring-2 focus:ring-[#D3D1CB] transition-shadow placeholder-[#9B9A97] text-[#37352F]"
                    />
                </div>
            </div>

            {/* Main Content List */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'routines' ? (
                    /* Routine Lists Tab */
                    <div className="max-w-4xl mx-auto">
                        <RoutineListView businessId={businessId} onApplyComplete={refetch} />
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37352F]"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500">
                        <p>Error loading items: {error}</p>
                        <button onClick={() => refetch()} className="mt-2 text-sm underline">Try again</button>
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState
                        tab={activeTab}
                        onAddItem={activeTab === 'pending' ? openAddModal : undefined}
                    />
                ) : groupBySupplier && groupedItems ? (
                    /* Grouped by Supplier View */
                    <div className="space-y-4 max-w-4xl mx-auto">
                        {groupedItems.map(([supplierName, supplierItems]) => (
                            <div key={supplierName} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Supplier Header */}
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">🏭</span>
                                        <span className="font-semibold text-gray-700">{supplierName}</span>
                                    </div>
                                    <span className="text-sm text-gray-500">{supplierItems.length} items</span>
                                </div>
                                {/* Supplier Items */}
                                <div className="divide-y divide-gray-100">
                                    {supplierItems.map((item) => (
                                        <ShoppingListItemRow
                                            key={item.id}
                                            item={item}
                                            onMarkPurchased={activeTab === 'pending' ? () => handleStatusChange(item.id, 'purchased') : undefined}
                                            onMarkCancelled={activeTab === 'pending' ? () => handleStatusChange(item.id, 'cancelled') : undefined}
                                            onMarkPending={activeTab !== 'pending' ? () => handleStatusChange(item.id, 'pending') : undefined}
                                            onEdit={activeTab === 'pending' ? openEditModal : undefined}
                                            onDelete={() => handleDelete(item.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Flat List View */
                    <div className="space-y-2 max-w-4xl mx-auto">
                        {items.map((item) => (
                            <ShoppingListItemRow
                                key={item.id}
                                item={item}
                                onMarkPurchased={activeTab === 'pending' ? () => handleStatusChange(item.id, 'purchased') : undefined}
                                onMarkCancelled={activeTab === 'pending' ? () => handleStatusChange(item.id, 'cancelled') : undefined}
                                onMarkPending={activeTab !== 'pending' ? () => handleStatusChange(item.id, 'pending') : undefined}
                                onEdit={activeTab === 'pending' ? openEditModal : undefined}
                                onDelete={() => handleDelete(item.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddItemModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveItem}
                editingItem={editingItem}
                businessId={businessId}
                categories={categories}
            />
        </div>
    );
};

export default ShoppingListView;
