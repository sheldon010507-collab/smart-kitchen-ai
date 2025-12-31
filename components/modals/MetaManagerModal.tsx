/**
 * MetaManagerModal Component
 * 
 * Modal for managing categories and locations (rename, delete, add)
 * Extracted from App.tsx for reusability
 */

import React from 'react';
import { X } from 'lucide-react';

type MetaTab = 'categories' | 'locations';

interface MetaManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    metaTab: MetaTab;
    setMetaTab: (tab: MetaTab) => void;
    metaNewValue: string;
    setMetaNewValue: (value: string) => void;
    categories: string[];
    locations: string[];
    onRename: (tab: MetaTab, oldValue: string, newValue: string) => Promise<void>;
    onDelete: (tab: MetaTab, value: string) => Promise<void>;
    onAdd: (tab: MetaTab, value: string) => void;
}

export function MetaManagerModal({
    isOpen,
    onClose,
    metaTab,
    setMetaTab,
    metaNewValue,
    setMetaNewValue,
    categories,
    locations,
    onRename,
    onDelete,
    onAdd,
}: MetaManagerModalProps) {
    if (!isOpen) return null;

    const items = metaTab === 'categories' ? categories : locations;

    return (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-border p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-secondary hover:text-primary"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-primary">Manage Categories & Locations</h3>
                <p className="text-sm text-secondary mt-1">Rename / delete will update your inventory records too.</p>

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => setMetaTab('categories')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border ${metaTab === 'categories'
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-primary border-border'
                            }`}
                    >
                        Categories
                    </button>
                    <button
                        onClick={() => setMetaTab('locations')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border ${metaTab === 'locations'
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-primary border-border'
                            }`}
                    >
                        Locations
                    </button>
                </div>

                <div className="mt-5 space-y-3 max-h-[360px] overflow-auto pr-1">
                    {items.map(v => (
                        <div key={v} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                            <div className="font-semibold text-primary truncate">{v}</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        const nv = window.prompt('Rename to:', v);
                                        if (!nv) return;
                                        await onRename(metaTab, v, nv);
                                    }}
                                    className="px-3 py-2 rounded-lg bg-white border border-border text-primary font-bold text-xs hover:bg-background"
                                >
                                    Rename
                                </button>
                                <button
                                    onClick={async () => {
                                        await onDelete(metaTab, v);
                                    }}
                                    className="px-3 py-2 rounded-lg bg-white border border-border text-red-600 font-bold text-xs hover:bg-background"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="p-6 text-center text-secondary text-sm border border-dashed border-border rounded-lg">
                            No items yet.
                        </div>
                    )}
                </div>

                <div className="mt-5 flex gap-2">
                    <input
                        value={metaNewValue}
                        onChange={e => setMetaNewValue(e.target.value)}
                        placeholder={metaTab === 'categories' ? 'Add new category...' : 'Add new location...'}
                        className="flex-1 px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                    />
                    <button
                        onClick={() => {
                            onAdd(metaTab, metaNewValue);
                            setMetaNewValue('');
                        }}
                        className="px-5 py-3 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accentHover"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MetaManagerModal;
