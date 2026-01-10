/**
 * Routine List View - Main component for managing routine lists
 */

import React, { useState } from 'react';
import { Plus, FileSpreadsheet, Play, Edit2, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useRoutineLists } from '../hooks/useRoutineLists';
import { useAuthContext } from '../../../lib/AuthContext';
import type { RoutineList, RoutineListItem, CreateRoutineListItem } from '../types';

interface RoutineListViewProps {
    businessId: string;
    onApplyComplete?: () => void;
}

const RoutineListView: React.FC<RoutineListViewProps> = ({ businessId, onApplyComplete }) => {
    const { user } = useAuthContext();
    const {
        lists,
        loading,
        error,
        refetch,
        createList,
        deleteList,
        getListItems,
        addListItem,
        deleteListItem,
        applyToShoppingList,
    } = useRoutineLists({ businessId });

    const [expandedListId, setExpandedListId] = useState<string | null>(null);
    const [expandedItems, setExpandedItems] = useState<RoutineListItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [applying, setApplying] = useState<string | null>(null);

    // Toggle expand list to show items
    const handleToggleExpand = async (listId: string) => {
        if (expandedListId === listId) {
            setExpandedListId(null);
            setExpandedItems([]);
        } else {
            setLoadingItems(true);
            const { data } = await getListItems(listId);
            setExpandedItems(data);
            setExpandedListId(listId);
            setLoadingItems(false);
        }
    };

    // Apply routine list to shopping list
    const handleApply = async (listId: string) => {
        if (!user?.id) return;
        setApplying(listId);
        const { added, error } = await applyToShoppingList(listId, user.id);
        setApplying(null);
        if (error) {
            alert(`Error: ${error}`);
        } else {
            alert(`Added ${added} items to shopping list!`);
            onApplyComplete?.();
        }
    };

    // Delete a list
    const handleDeleteList = async (id: string) => {
        if (confirm('Are you sure you want to delete this routine list?')) {
            await deleteList(id);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37352F]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-500">
                <p>Error: {error}</p>
                <button onClick={refetch} className="mt-2 text-sm underline">Try again</button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Routine Lists</h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center space-x-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Import Excel</span>
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center space-x-1 px-3 py-2 text-sm bg-[#37352F] text-white rounded-lg hover:bg-[#2f2e2b]"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New List</span>
                    </button>
                </div>
            </div>

            {/* Lists */}
            {lists.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>No routine lists yet.</p>
                    <p className="text-sm mt-1">Create a template for frequently ordered items.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {lists.map((list) => (
                        <div key={list.id} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* List Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                                <button
                                    onClick={() => handleToggleExpand(list.id)}
                                    className="flex items-center space-x-3 flex-1 text-left"
                                >
                                    {expandedListId === list.id ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                    <div>
                                        <div className="font-medium text-gray-900">📋 {list.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {list.item_count || 0} items
                                            {list.description && ` • ${list.description}`}
                                        </div>
                                    </div>
                                </button>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => handleApply(list.id)}
                                        disabled={applying === list.id}
                                        className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                                    >
                                        {applying === list.id ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Play className="w-4 h-4" />
                                        )}
                                        <span>Apply</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteList(list.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Items */}
                            {expandedListId === list.id && (
                                <div className="border-t border-gray-100 bg-gray-50">
                                    {loadingItems ? (
                                        <div className="p-4 text-center text-gray-500">Loading items...</div>
                                    ) : expandedItems.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">No items in this list</div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {expandedItems.map((item) => (
                                                <div key={item.id} className="px-4 py-2 flex items-center justify-between text-sm">
                                                    <div>
                                                        <span className="font-medium">{item.item_name}</span>
                                                        <span className="text-gray-500 ml-2">
                                                            {item.quantity_needed} {item.unit}
                                                        </span>
                                                        {item.supplier && (
                                                            <span className="text-blue-600 ml-2">🏭 {item.supplier}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => deleteListItem(item.id).then(() => handleToggleExpand(list.id))}
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateRoutineListModal
                    businessId={businessId}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={async (name, description) => {
                        await createList({ business_id: businessId, name, description });
                        setShowCreateModal(false);
                    }}
                />
            )}

            {/* Import Modal */}
            {showImportModal && (
                <ImportRoutineListModal
                    businessId={businessId}
                    onClose={() => setShowImportModal(false)}
                    onImport={async (listName, items) => {
                        const { data: newList } = await createList({ business_id: businessId, name: listName });
                        if (newList) {
                            for (const item of items) {
                                await addListItem({ ...item, routine_list_id: newList.id });
                            }
                            await refetch();
                        }
                        setShowImportModal(false);
                    }}
                />
            )}
        </div>
    );
};

// Create Routine List Modal
const CreateRoutineListModal: React.FC<{
    businessId: string;
    onClose: () => void;
    onCreate: (name: string, description: string) => Promise<void>;
}> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        await onCreate(name.trim(), description.trim());
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-semibold mb-4">Create Routine List</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Weekly Staples"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="Optional description"
                        />
                    </div>
                    <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || saving}
                            className="flex-1 py-2 bg-[#37352F] text-white rounded-lg disabled:opacity-50"
                        >
                            {saving ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Import Excel Modal
const ImportRoutineListModal: React.FC<{
    businessId: string;
    onClose: () => void;
    onImport: (listName: string, items: Omit<CreateRoutineListItem, 'routine_list_id'>[]) => Promise<void>;
}> = ({ onClose, onImport }) => {
    const [listName, setListName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<Array<{ name: string; qty: number; unit: string }>>([]);
    const [importing, setImporting] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);

        // Parse Excel file
        try {
            const XLSX = await import('xlsx');
            const data = await f.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet);

            // Map to preview format
            const items = rows.slice(0, 10).map((row: any) => ({
                name: row.name || row.Name || row.item_name || row['Item Name'] || '',
                qty: parseFloat(row.quantity || row.Quantity || row.qty || row.Qty || 1),
                unit: row.unit || row.Unit || 'pcs',
            })).filter(i => i.name);

            setPreview(items);
            if (!listName && f.name) {
                setListName(f.name.replace(/\.[^/.]+$/, ''));
            }
        } catch (err) {
            console.error('Error parsing file:', err);
            alert('Failed to parse Excel file');
        }
    };

    const handleImport = async () => {
        if (!listName.trim() || preview.length === 0) return;
        setImporting(true);

        // Convert preview to CreateRoutineListItem format
        const items: Omit<CreateRoutineListItem, 'routine_list_id'>[] = preview.map((p, i) => ({
            item_name: p.name,
            quantity_needed: p.qty,
            unit: p.unit,
            sort_order: i,
        }));

        await onImport(listName.trim(), items);
        setImporting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
                <h3 className="text-lg font-semibold mb-4">Import from Excel</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">List Name *</label>
                        <input
                            type="text"
                            value={listName}
                            onChange={(e) => setListName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="e.g., Weekly Order"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Excel File</label>
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:font-medium hover:file:bg-gray-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">Columns: name, quantity, unit</p>
                    </div>

                    {preview.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Preview ({preview.length} items)</label>
                            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                {preview.map((item, i) => (
                                    <div key={i} className="px-3 py-2 text-sm flex justify-between">
                                        <span>{item.name}</span>
                                        <span className="text-gray-500">{item.qty} {item.unit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!listName.trim() || preview.length === 0 || importing}
                            className="flex-1 py-2 bg-[#37352F] text-white rounded-lg disabled:opacity-50"
                        >
                            {importing ? 'Importing...' : `Import ${preview.length} Items`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoutineListView;
