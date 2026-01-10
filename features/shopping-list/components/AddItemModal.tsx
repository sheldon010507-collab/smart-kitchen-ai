/**
 * Add/Edit shopping list item modal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import type { ShoppingListItem, CreateShoppingListItem, ShoppingListPriority, ShoppingListReason } from '../types';
import { PRIORITY_LABELS, COMMON_UNITS, DEFAULT_PRIORITY, DEFAULT_REASON } from '../constants';
import { useInventorySearch } from '../hooks/useInventorySearch';

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: CreateShoppingListItem) => Promise<{ error: string | null }>;
    editingItem?: ShoppingListItem | null;
    businessId: string;
    categories?: string[];
}

const AddItemModal: React.FC<AddItemModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingItem,
    businessId,
    categories = [],
}) => {
    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [unit, setUnit] = useState('pcs');
    const [priority, setPriority] = useState<ShoppingListPriority>(DEFAULT_PRIORITY);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
    const [supplier, setSupplier] = useState<string | null>(null);
    const [showSearch, setShowSearch] = useState(true);

    // Inventory search hook
    const { results: searchResults, search: searchInventory, clear: clearSearch, loading: searching } = useInventorySearch({ businessId });

    // Reset form when modal opens or editingItem changes
    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setItemName(editingItem.item_name);
                setCategory(editingItem.category || '');
                setQuantity(String(editingItem.quantity_needed));
                setUnit(editingItem.unit);
                setPriority(editingItem.priority);
                setNotes(editingItem.notes || '');
                setSupplier(editingItem.supplier || null);
                setShowSearch(false);
            } else {
                setItemName('');
                setCategory('');
                setQuantity('1');
                setUnit('pcs');
                setPriority(DEFAULT_PRIORITY);
                setNotes('');
                setSelectedInventoryId(null);
                setSupplier(null);
                setShowSearch(true);
                clearSearch();
            }
            setError(null);
        }
    }, [isOpen, editingItem, clearSearch]);

    // Handle search input change with debounce
    const handleSearchChange = useCallback((value: string) => {
        setItemName(value);
        if (value.length >= 2) {
            searchInventory(value);
        } else {
            clearSearch();
        }
    }, [searchInventory, clearSearch]);

    // Handle selecting an inventory item
    const handleSelectInventoryItem = useCallback((item: typeof searchResults[0]) => {
        setItemName(item.name);
        setCategory(item.category);
        setUnit(item.quantityUnit);
        setSupplier(item.supplier);
        setSelectedInventoryId(item.id);
        setShowSearch(false);
        clearSearch();
    }, [clearSearch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!itemName.trim()) {
            setError('Item name is required');
            return;
        }

        const quantityNum = parseFloat(quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            setError('Quantity must be a positive number');
            return;
        }

        if (!unit.trim()) {
            setError('Unit is required');
            return;
        }

        setSaving(true);
        try {
            const itemData: CreateShoppingListItem = {
                business_id: businessId,
                item_name: itemName.trim(),
                category: category.trim() || undefined,
                quantity_needed: quantityNum,
                unit: unit.trim(),
                priority,
                reason: editingItem?.reason || DEFAULT_REASON,
                notes: notes.trim() || undefined,
            };

            const result = await onSave(itemData);

            if (result.error) {
                setError(result.error);
            } else {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save item');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9E9E7]">
                    <h2 className="text-lg font-semibold text-[#37352F]">
                        {editingItem ? 'Edit Item' : 'Add Item'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[#787774] hover:text-[#37352F] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Item Name / Search */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-[#37352F] mb-1">
                            Item Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={itemName}
                                onChange={(e) => showSearch ? handleSearchChange(e.target.value) : setItemName(e.target.value)}
                                maxLength={100}
                                className="w-full pl-10 pr-3 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Search inventory or enter name..."
                                autoFocus
                            />
                            {searching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {showSearch && searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelectInventoryItem(item)}
                                        className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center justify-between gap-2 border-b border-gray-100 last:border-0"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span>{item.category}</span>
                                                {item.supplier && <span>• 🏭 {item.supplier}</span>}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400">{item.quantityUnit}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Supplier display (if selected from inventory) */}
                        {supplier && (
                            <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                                🏭 Supplier: <span className="font-medium">{supplier}</span>
                                <button
                                    type="button"
                                    onClick={() => { setShowSearch(true); setSupplier(null); setSelectedInventoryId(null); }}
                                    className="ml-2 text-gray-400 hover:text-gray-600"
                                >
                                    (change)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quantity and Unit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[#37352F] mb-1">
                                Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                min="0.01"
                                step="0.01"
                                className="w-full px-3 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#37352F] mb-1">
                                Unit <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="w-full px-3 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            >
                                {COMMON_UNITS.map((u) => (
                                    <option key={u} value={u}>
                                        {u}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-[#37352F] mb-1">
                            Category
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            list="category-options"
                            className="w-full px-3 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Produce"
                        />
                        <datalist id="category-options">
                            {categories.map((cat) => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>

                    {/* Supplier */}
                    <div>
                        <label className="block text-sm font-medium text-[#37352F] mb-1">
                            Supplier
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🏭</span>
                            <input
                                type="text"
                                value={supplier || ''}
                                onChange={(e) => setSupplier(e.target.value || null)}
                                className="w-full pl-9 pr-3 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Sysco, US Foods"
                            />
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-[#37352F] mb-1">
                            Priority
                        </label>
                        <div className="flex space-x-2">
                            {(['urgent', 'normal', 'low'] as const).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${priority === p
                                        ? p === 'urgent'
                                            ? 'bg-red-100 border-red-300 text-red-700'
                                            : p === 'normal'
                                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                                : 'bg-gray-100 border-gray-300 text-gray-700'
                                        : 'border-[#E9E9E7] text-[#787774] hover:bg-[#F7F6F3]'
                                        }`}
                                >
                                    {PRIORITY_LABELS[p]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-[#37352F] mb-1">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Optional notes..."
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-[#E9E9E7] rounded-lg text-[#37352F] font-medium hover:bg-[#F7F6F3] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-2.5 bg-[#37352F] text-white rounded-lg font-medium hover:bg-[#2f2e2b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : editingItem ? 'Update' : 'Add Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddItemModal;
