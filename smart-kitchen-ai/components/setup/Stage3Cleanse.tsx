import React, { useState, useMemo } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    Filter,
    Trash2,
    Edit3,
    Save,
    X,
    ChevronDown
} from 'lucide-react';
import type { DraftInventoryItem, DraftLocation, DraftCategory } from '../../types';

interface Props {
    draftItems: DraftInventoryItem[];
    draftLocations: DraftLocation[];
    draftCategories: DraftCategory[];
    existingCategories: string[];
    existingLocations: string[];
    onItemsChange: (items: DraftInventoryItem[]) => void;
    onLocationsChange: (locations: DraftLocation[]) => void;
    onCategoriesChange: (categories: DraftCategory[]) => void;
}

type TabFilter = 'all' | 'error' | 'warning' | 'ready';

const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'lb', 'oz', 'case'];

const Stage3Cleanse: React.FC<Props> = ({
    draftItems,
    draftLocations,
    draftCategories,
    existingCategories,
    existingLocations,
    onItemsChange,
    onLocationsChange,
    onCategoriesChange,
}) => {
    const [activeTab, setActiveTab] = useState<TabFilter>('error');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState<string>('');
    const [bulkParLevel, setBulkParLevel] = useState<string>('');
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [newLocationInput, setNewLocationInput] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [showAddLocation, setShowAddLocation] = useState(false);

    // All available categories/locations (existing + draft)
    const allCategories = useMemo(() => {
        const cats = new Set([...existingCategories, ...draftCategories.map(c => c.name)]);
        return Array.from(cats).sort();
    }, [existingCategories, draftCategories]);

    const allLocations = useMemo(() => {
        const locs = new Set([...existingLocations, ...draftLocations.map(l => l.name)]);
        return Array.from(locs).sort();
    }, [existingLocations, draftLocations]);

    // Counts
    const counts = useMemo(() => ({
        all: draftItems.length,
        error: draftItems.filter(i => i.status === 'error').length,
        warning: draftItems.filter(i => i.status === 'warning').length,
        ready: draftItems.filter(i => i.status === 'ready').length,
    }), [draftItems]);

    // Filtered items
    const filteredItems = useMemo(() => {
        if (activeTab === 'all') return draftItems;
        return draftItems.filter(i => i.status === activeTab);
    }, [draftItems, activeTab]);

    // Health percentage
    const healthPercent = Math.round((counts.ready / Math.max(counts.all, 1)) * 100);

    // Re-validate item
    const validateItem = (item: DraftInventoryItem): DraftInventoryItem => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!item.name.trim()) errors.push('Missing name');
        if (!item.quantityUnit.trim()) errors.push('Missing unit');
        if (!item.category || item.category === 'Unassigned') warnings.push('No category assigned');
        if (!item.location || item.location === 'Default Storage') warnings.push('No location assigned');
        if (item.minStockLevel === 0) warnings.push('Min stock level is 0');

        return {
            ...item,
            status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ready',
            errors,
            warnings,
        };
    };

    // Update single item
    const updateItem = (id: string, patch: Partial<DraftInventoryItem>) => {
        const newItems = draftItems.map(item => {
            if (item.id !== id) return item;
            return validateItem({ ...item, ...patch });
        });
        onItemsChange(newItems);
    };

    // Delete items
    const deleteItems = (ids: Set<string>) => {
        onItemsChange(draftItems.filter(i => !ids.has(i.id)));
        setSelectedIds(new Set());
    };

    // Bulk update
    const handleBulkAction = (field: 'category' | 'location' | 'unit' | 'minStockLevel', value: string) => {
        if (selectedIds.size === 0) return;

        const newItems = draftItems.map(item => {
            if (!selectedIds.has(item.id)) return item;
            const patch: Partial<DraftInventoryItem> = {};
            if (field === 'category') patch.category = value;
            if (field === 'location') patch.location = value;
            if (field === 'unit') patch.quantityUnit = value;
            if (field === 'minStockLevel') patch.minStockLevel = parseFloat(value) || 0;
            return validateItem({ ...item, ...patch });
        });

        onItemsChange(newItems);
        setSelectedIds(new Set());
        setBulkAction('');
        setBulkParLevel('');
    };

    // Add new category
    const addCategory = (name: string) => {
        if (!name.trim() || draftCategories.some(c => c.name === name.trim())) return;
        onCategoriesChange([...draftCategories, { name: name.trim() }]);
    };

    // Add new location
    const addLocation = (name: string, type: 'Dry' | 'Fridge' | 'Freezer' = 'Dry') => {
        if (!name.trim() || draftLocations.some(l => l.name === name.trim())) return;
        onLocationsChange([...draftLocations, { name: name.trim(), type }]);
    };

    // Toggle selection
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // Select all visible
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredItems.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredItems.map(i => i.id)));
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header with Health Bar */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-900">Data Cleanse</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Data Health</span>
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${healthPercent >= 80 ? 'bg-green-500' :
                                    healthPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${healthPercent}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{healthPercent}%</span>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('error')}
                        className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              ${activeTab === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'text-gray-500 hover:bg-gray-100'}
            `}
                    >
                        <AlertCircle className="w-4 h-4" />
                        Needs Fix ({counts.error})
                    </button>
                    <button
                        onClick={() => setActiveTab('warning')}
                        className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              ${activeTab === 'warning'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'text-gray-500 hover:bg-gray-100'}
            `}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Review ({counts.warning})
                    </button>
                    <button
                        onClick={() => setActiveTab('ready')}
                        className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              ${activeTab === 'ready'
                                ? 'bg-green-100 text-green-700'
                                : 'text-gray-500 hover:bg-gray-100'}
            `}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Ready ({counts.ready})
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              ${activeTab === 'all'
                                ? 'bg-gray-200 text-gray-700'
                                : 'text-gray-500 hover:bg-gray-100'}
            `}
                    >
                        All ({counts.all})
                    </button>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-primary">
                        {selectedIds.size} selected
                    </span>

                    {/* Set Category with Add New */}
                    <div className="relative">
                        {showAddCategory ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    placeholder="New category"
                                    value={newCategoryInput}
                                    onChange={(e) => setNewCategoryInput(e.target.value)}
                                    className="px-2 py-1 text-sm border rounded w-28"
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        if (newCategoryInput.trim()) {
                                            addCategory(newCategoryInput.trim());
                                            handleBulkAction('category', newCategoryInput.trim());
                                            setNewCategoryInput('');
                                        }
                                        setShowAddCategory(false);
                                    }}
                                    className="px-2 py-1 text-xs bg-primary text-white rounded"
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() => setShowAddCategory(false)}
                                    className="px-1 py-1 text-gray-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <select
                                value=""
                                onChange={(e) => {
                                    if (e.target.value === '__add_new__') {
                                        setShowAddCategory(true);
                                    } else if (e.target.value) {
                                        handleBulkAction('category', e.target.value);
                                    }
                                }}
                                className="px-3 py-1 text-sm border rounded-lg"
                            >
                                <option value="">Set Category...</option>
                                {allCategories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="__add_new__">+ Add New Category</option>
                            </select>
                        )}
                    </div>

                    {/* Set Location with Add New */}
                    <div className="relative">
                        {showAddLocation ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    placeholder="New location"
                                    value={newLocationInput}
                                    onChange={(e) => setNewLocationInput(e.target.value)}
                                    className="px-2 py-1 text-sm border rounded w-28"
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        if (newLocationInput.trim()) {
                                            addLocation(newLocationInput.trim());
                                            handleBulkAction('location', newLocationInput.trim());
                                            setNewLocationInput('');
                                        }
                                        setShowAddLocation(false);
                                    }}
                                    className="px-2 py-1 text-xs bg-primary text-white rounded"
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() => setShowAddLocation(false)}
                                    className="px-1 py-1 text-gray-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <select
                                value=""
                                onChange={(e) => {
                                    if (e.target.value === '__add_new__') {
                                        setShowAddLocation(true);
                                    } else if (e.target.value) {
                                        handleBulkAction('location', e.target.value);
                                    }
                                }}
                                className="px-3 py-1 text-sm border rounded-lg"
                            >
                                <option value="">Set Location...</option>
                                {allLocations.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                                <option value="__add_new__">+ Add New Location</option>
                            </select>
                        )}
                    </div>

                    <select
                        value=""
                        onChange={(e) => {
                            if (e.target.value) handleBulkAction('unit', e.target.value);
                        }}
                        className="px-3 py-1 text-sm border rounded-lg"
                    >
                        <option value="">Set Unit...</option>
                        {UNITS.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>

                    {/* Set Par Level */}
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            placeholder="Par Level"
                            value={bulkParLevel}
                            onChange={(e) => setBulkParLevel(e.target.value)}
                            className="px-2 py-1 text-sm border rounded w-20"
                            min="0"
                        />
                        <button
                            onClick={() => {
                                if (bulkParLevel) {
                                    handleBulkAction('minStockLevel', bulkParLevel);
                                }
                            }}
                            disabled={!bulkParLevel}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded disabled:opacity-50"
                        >
                            Set Par
                        </button>
                    </div>

                    <button
                        onClick={() => deleteItems(selectedIds)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>

                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="ml-auto text-sm text-gray-500 hover:text-gray-700"
                    >
                        Clear Selection
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded"
                                />
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Item Name</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Unit</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Location</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Par Level</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Issues</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredItems.map((item) => (
                            <tr
                                key={item.id}
                                className={`
                  ${item.status === 'error' ? 'bg-red-50' :
                                        item.status === 'warning' ? 'bg-yellow-50' : ''}
                  ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}
                  hover:bg-gray-50
                `}
                            >
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(item.id)}
                                        onChange={() => toggleSelect(item.id)}
                                        className="rounded"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                                    {item.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                                    {item.status === 'ready' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                </td>
                                <td className="px-4 py-3">
                                    {editingId === item.id ? (
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                            className="w-full px-2 py-1 border rounded"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-medium text-gray-900">{item.name}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={item.quantityUnit}
                                        onChange={(e) => updateItem(item.id, { quantityUnit: e.target.value })}
                                        className="px-2 py-1 border rounded text-sm bg-white"
                                    >
                                        <option value="">Select...</option>
                                        {UNITS.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={item.category}
                                        onChange={(e) => updateItem(item.id, { category: e.target.value })}
                                        className="px-2 py-1 border rounded text-sm bg-white"
                                    >
                                        <option value="">Select...</option>
                                        {allCategories.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={item.location}
                                        onChange={(e) => updateItem(item.id, { location: e.target.value })}
                                        className="px-2 py-1 border rounded text-sm bg-white"
                                    >
                                        <option value="">Select...</option>
                                        {allLocations.map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="number"
                                        value={item.minStockLevel}
                                        onChange={(e) => updateItem(item.id, { minStockLevel: parseFloat(e.target.value) || 0 })}
                                        className="w-20 px-2 py-1 border rounded text-sm"
                                        min="0"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col gap-0.5">
                                        {item.errors.map((e, i) => (
                                            <span key={i} className="text-xs text-red-600">{e}</span>
                                        ))}
                                        {item.warnings.map((w, i) => (
                                            <span key={i} className="text-xs text-yellow-600">{w}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                                            className="p-1 hover:bg-gray-100 rounded"
                                        >
                                            {editingId === item.id ? (
                                                <Save className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <Edit3 className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteItems(new Set([item.id]))}
                                            className="p-1 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        {activeTab === 'error' && counts.error === 0 && (
                            <div>
                                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
                                <p className="font-medium">Great! No issues to fix 🎉</p>
                            </div>
                        )}
                        {activeTab !== 'error' && filteredItems.length === 0 && (
                            <p>No data</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Stage3Cleanse;
