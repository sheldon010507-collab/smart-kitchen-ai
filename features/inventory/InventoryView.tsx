/**
 * InventoryView Component
 * 
 * Main inventory management view
 * Supports master view, search, scan, and CRUD operations
 * 
 * Extracted from App.tsx
 */

import React, { useState, useMemo } from 'react';
import { Store, ScanLine, Edit, Plus, Search, X, Package, Filter, MapPin } from 'lucide-react';
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
    onWastage?: (item: InventoryItem) => void;
    onOpenSetupWizard?: () => void;
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
    onWastage,
    onOpenSetupWizard,
}: InventoryViewProps) {
    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedLocation, setSelectedLocation] = useState<string>('all');

    // Extract unique categories and locations from inventory
    const categories = useMemo(() => {
        const cats = new Set<string>();
        filteredInventory.forEach(item => {
            if (item.category) cats.add(item.category);
        });
        return ['all', ...Array.from(cats).sort()];
    }, [filteredInventory]);

    const locations = useMemo(() => {
        const locs = new Set<string>();
        filteredInventory.forEach(item => {
            if (item.location) locs.add(item.location);
        });
        return ['all', ...Array.from(locs).sort()];
    }, [filteredInventory]);

    // Apply all filters
    const displayedItems = useMemo(() => {
        return filteredInventory.filter(item => {
            // Text search filter
            if (inventorySearchQuery.trim()) {
                const query = inventorySearchQuery.toLowerCase().trim();
                const matchesSearch =
                    item.name.toLowerCase().includes(query) ||
                    (item.category || '').toLowerCase().includes(query) ||
                    (item.location || '').toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }
            // Category filter
            if (selectedCategory !== 'all' && item.category !== selectedCategory) {
                return false;
            }
            // Location filter
            if (selectedLocation !== 'all' && item.location !== selectedLocation) {
                return false;
            }
            return true;
        });
    }, [filteredInventory, inventorySearchQuery, selectedCategory, selectedLocation]);

    if (isMasterView) {
        return (
            <div className="flex flex-col items-center justify-center h-96 animate-in fade-in duration-500">
                <Store className="w-16 h-16 text-[#e9e9e7] mb-6" />
                <p className="text-[#787774] text-lg">Select a store to view its inventory.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-[#e9e9e7] pb-4 md:pb-6">
                <div>
                    <h2 className="text-2xl md:text-4xl font-bold text-[#37352f] tracking-tight">
                        <EditableTitle defaultTitle="Inventory" storageKey="module_inventory_title" />
                    </h2>
                    <p className="text-[#787774] mt-2 md:mt-3 text-sm md:text-lg">Manage stock for {activeBusiness?.name}</p>
                </div>
                <div className="grid grid-cols-4 md:flex md:space-x-3 gap-2 md:gap-0">
                    {onOpenSetupWizard && (
                        <button
                            onClick={onOpenSetupWizard}
                            className="flex items-center justify-center px-3 md:px-6 py-2 md:py-3 bg-[#37352f] text-white rounded-lg shadow-sm text-xs md:text-sm font-semibold hover:bg-[#1f1e1b] transition-colors"
                        >
                            <Package className="w-4 md:w-5 h-4 md:h-5 md:mr-2" />
                            <span className="hidden md:inline">Setup</span>
                        </button>
                    )}
                    <button
                        onClick={() => onOpenScanner('receipt')}
                        className="flex items-center justify-center px-3 md:px-6 py-2 md:py-3 bg-white text-[#37352f] border border-[#e9e9e7] rounded-lg shadow-sm text-xs md:text-sm font-semibold hover:bg-[#f7f6f3] transition-colors"
                    >
                        <ScanLine className="w-4 md:w-5 h-4 md:h-5 md:mr-2" />
                        <span className="hidden md:inline">Scan</span>
                    </button>
                    <button
                        onClick={onOpenMetaManager}
                        className="flex items-center justify-center px-3 md:px-6 py-2 md:py-3 bg-white text-[#37352f] border border-[#e9e9e7] rounded-lg shadow-sm text-xs md:text-sm font-semibold hover:bg-[#f7f6f3] transition-colors"
                    >
                        <Edit className="w-4 md:w-5 h-4 md:h-5 md:mr-2" />
                        <span className="hidden md:inline">Manage</span>
                    </button>
                    <button
                        onClick={onAddItem}
                        className="flex items-center justify-center px-3 md:px-6 py-2 md:py-3 bg-[#27ae60] text-white rounded-lg shadow-sm text-xs md:text-sm font-semibold hover:bg-[#229954] transition-colors"
                    >
                        <Plus className="w-4 md:w-5 h-4 md:h-5 md:mr-2" />
                        <span className="hidden md:inline">Add</span>
                    </button>
                </div>
            </header>

            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9b9a97]" />
                <input
                    type="text"
                    placeholder="Search inventory (name, category, location)..."
                    value={inventorySearchQuery}
                    onChange={e => setInventorySearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-[#e9e9e7] rounded-lg bg-white text-[#37352f] placeholder:text-[#9b9a97] focus:outline-none focus:border-[#37352f] focus:ring-1 focus:ring-[#37352f] transition-colors"
                />
                {inventorySearchQuery && (
                    <button
                        onClick={() => setInventorySearchQuery('')}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#787774] hover:text-[#37352f]"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Category and Location Filters */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {/* Category Filter */}
                <div className="flex items-center gap-2 bg-white border border-[#e9e9e7] rounded-lg px-4 py-2 flex-shrink-0">
                    <Filter className="w-4 h-4 text-[#787774]" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="text-sm font-medium text-[#37352f] bg-transparent border-none outline-none cursor-pointer"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat === 'all' ? 'All Categories' : cat}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Location Filter */}
                <div className="flex items-center gap-2 bg-white border border-[#e9e9e7] rounded-lg px-4 py-2 flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[#787774]" />
                    <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="text-sm font-medium text-[#37352f] bg-transparent border-none outline-none cursor-pointer"
                    >
                        {locations.map(loc => (
                            <option key={loc} value={loc}>
                                {loc === 'all' ? 'All Locations' : loc}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Active Filter Count */}
                {(selectedCategory !== 'all' || selectedLocation !== 'all') && (
                    <button
                        onClick={() => {
                            setSelectedCategory('all');
                            setSelectedLocation('all');
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-[#ffe5e5] text-[#8b3a3a] rounded-lg text-sm font-medium hover:bg-[#ffc9c9] transition-colors flex-shrink-0"
                    >
                        <X className="w-3 h-3" />
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Results Count */}
            <div className="text-sm text-[#787774]">
                {displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''}
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedItems.map(item => (
                    <InventoryCard
                        key={item.id}
                        item={item}
                        onRemove={onDeleteInventoryItem}
                        onEdit={onEditInventoryItem}
                        onWastage={onWastage}
                    />
                ))}
            </div>

            {/* Empty State */}
            {displayedItems.length === 0 && (
                <div className="text-center py-12">
                    <Package className="w-12 h-12 text-[#e9e9e7] mx-auto mb-3" />
                    <p className="text-[#787774]">No items found</p>
                </div>
            )}
        </div>
    );
}

export default InventoryView;

