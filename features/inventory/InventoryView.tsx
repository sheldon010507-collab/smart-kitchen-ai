/**
 * InventoryView Component
 * 
 * Main inventory management view
 * Supports master view, search, scan, and CRUD operations
 * 
 * Extracted from App.tsx
 */

import React from 'react';
import { Store, ScanLine, Edit, Plus, Search, X } from 'lucide-react';
import InventoryCard from '../../components/InventoryCard';
import { EditableTitle } from '../../components/EditableTitle';
import { InventoryItem, Business } from '../../types';

interface InventoryViewProps {
    isMasterView: boolean;
    activeBusiness: Business | null;
    inventorySearchQuery: string;
    setInventorySearchQuery: (query: string) => void;
    filteredInventory: InventoryItem[];
    onDeleteInventoryItem: (id: string) => void;
    onEditInventoryItem: (item: InventoryItem) => void;
    onOpenScanner: (mode: 'receipt' | 'fridge' | 'sales') => void;
    onOpenMetaManager: () => void;
    onAddItem: () => void;
}

export function InventoryView({
    isMasterView,
    activeBusiness,
    inventorySearchQuery,
    setInventorySearchQuery,
    filteredInventory,
    onDeleteInventoryItem,
    onEditInventoryItem,
    onOpenScanner,
    onOpenMetaManager,
    onAddItem,
}: InventoryViewProps) {

    if (isMasterView) {
        return (
            <div className="flex flex-col items-center justify-center h-96 animate-in fade-in duration-500">
                <Store className="w-16 h-16 text-border mb-6" />
                <p className="text-secondary text-lg">Select a store to view its inventory.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-12 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-border pb-4 md:pb-6">
                <div>
                    <h2 className="text-2xl md:text-4xl font-bold text-primary tracking-tight">
                        <EditableTitle defaultTitle="Inventory" storageKey="module_inventory_title" />
                    </h2>
                    <p className="text-secondary mt-2 md:mt-3 text-sm md:text-lg font-light">Manage stock for {activeBusiness?.name}</p>
                </div>
                <div className="grid grid-cols-3 md:flex md:space-x-3 gap-2 md:gap-0">
                    <button
                        onClick={() => onOpenScanner('receipt')}
                        className="flex items-center justify-center px-3 md:px-6 py-2 md:py-3 bg-white text-primary border border-border rounded-lg shadow-sm text-xs md:text-sm font-semibold hover:bg-background transition-colors"
                    >
                        <ScanLine className="w-4 md:w-5 h-4 md:h-5 md:mr-2" />
                        <span className="hidden md:inline">Scan</span>
                    </button>
                    <button
                        onClick={onOpenMetaManager}
                        className="flex items-center justify-center px-3 md:px-6 py-2 md:py-3 bg-white text-primary border border-border rounded-lg shadow-sm text-xs md:text-sm font-semibold hover:bg-background transition-colors"
                    >
                        <Edit className="w-4 md:w-5 h-4 md:h-5 md:mr-2" />
                        <span className="hidden md:inline">Manage</span>
                    </button>
                    <button
                        onClick={onAddItem}
                        className="flex items-center justify-center px-3 md:px-6 py-2 md:py-3 bg-accent text-white rounded-lg shadow-sm text-xs md:text-sm font-semibold hover:bg-accentHover"
                    >
                        <Plus className="w-4 md:w-5 h-4 md:h-5 md:mr-2" />
                        <span className="hidden md:inline">Add</span>
                    </button>
                </div>
            </header>

            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                    type="text"
                    placeholder="Search inventory (name, category, location)..."
                    value={inventorySearchQuery}
                    onChange={e => setInventorySearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-border rounded-lg bg-white text-primary placeholder:text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
                {inventorySearchQuery && (
                    <button
                        onClick={() => setInventorySearchQuery('')}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border bg-white shadow-sm rounded-lg overflow-hidden">
                {filteredInventory
                    .filter(item => {
                        if (!inventorySearchQuery.trim()) return true;
                        const query = inventorySearchQuery.toLowerCase().trim();
                        return (
                            item.name.toLowerCase().includes(query) ||
                            item.category.toLowerCase().includes(query) ||
                            item.location.toLowerCase().includes(query)
                        );
                    })
                    .map(item => (
                        <div key={item.id} className="border-r border-b border-border p-6 hover:bg-background transition-colors">
                            <InventoryCard
                                item={item}
                                onRemove={onDeleteInventoryItem}
                                onEdit={onEditInventoryItem}
                            />
                        </div>
                    ))}
            </div>
        </div>
    );
}

export default InventoryView;
