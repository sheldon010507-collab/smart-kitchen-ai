/**
 * MetaManagerModal Component
 * 
 * Modal for managing categories, locations, AND containers (rename, delete, add)
 * Extended to include Containers tab with registration flow
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import ContainerList from '../containers/ContainerList';
import ContainerForm from '../containers/ContainerForm';
import { useContainers } from '../../hooks/useContainers';
import type { Container, CreateContainerInput } from '../../types';

export type MetaTab = 'categories' | 'locations' | 'containers';

interface MetaManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    metaTab: MetaTab;
    setMetaTab: (tab: MetaTab) => void;
    metaNewValue: string;
    setMetaNewValue: (value: string) => void;
    categories: string[];
    locations: string[];
    businessId: string;
    onRename: (tab: 'categories' | 'locations', oldValue: string, newValue: string) => Promise<void>;
    onDelete: (tab: 'categories' | 'locations', value: string) => Promise<void>;
    onAdd: (tab: 'categories' | 'locations', value: string) => void;
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
    businessId,
    onRename,
    onDelete,
    onAdd,
}: MetaManagerModalProps) {
    // Container management state
    const { containers, loading: containersLoading, createContainer, updateContainer, deleteContainer, uploadContainerImage } = useContainers({ businessId });
    const [showContainerForm, setShowContainerForm] = useState(false);
    const [editingContainer, setEditingContainer] = useState<Container | null>(null);

    if (!isOpen) return null;

    const items = metaTab === 'categories' ? categories : metaTab === 'locations' ? locations : [];

    const handleAddContainer = () => {
        setEditingContainer(null);
        setShowContainerForm(true);
    };

    const handleEditContainer = (container: Container) => {
        setEditingContainer(container);
        setShowContainerForm(true);
    };

    const handleSaveContainer = async (data: CreateContainerInput) => {
        if (editingContainer) {
            return updateContainer(editingContainer.id, data);
        } else {
            const result = await createContainer(data);
            return { error: result.error };
        }
    };

    return (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-border p-6 relative max-h-[90vh] overflow-hidden flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-secondary hover:text-primary"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-primary">Manage Categories, Locations & Containers</h3>
                <p className="text-sm text-secondary mt-1">Rename / delete will update your inventory records too.</p>

                {/* Tabs */}
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
                    <button
                        onClick={() => setMetaTab('containers')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border ${metaTab === 'containers'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-primary border-border'
                            }`}
                    >
                        📦 Containers
                    </button>
                </div>

                {/* Content Area */}
                <div className="mt-5 flex-1 overflow-auto pr-1">
                    {metaTab === 'containers' ? (
                        /* Containers Tab */
                        <ContainerList
                            containers={containers}
                            loading={containersLoading}
                            onAdd={handleAddContainer}
                            onEdit={handleEditContainer}
                            onDelete={(id) => deleteContainer(id)}
                        />
                    ) : (
                        /* Categories / Locations Tab */
                        <div className="space-y-3 max-h-[360px]">
                            {items.map(v => (
                                <div key={v} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                                    <div className="font-semibold text-primary truncate">{v}</div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                const nv = window.prompt('Rename to:', v);
                                                if (!nv) return;
                                                await onRename(metaTab as 'categories' | 'locations', v, nv);
                                            }}
                                            className="px-3 py-2 rounded-lg bg-white border border-border text-primary font-bold text-xs hover:bg-background"
                                        >
                                            Rename
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await onDelete(metaTab as 'categories' | 'locations', v);
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
                    )}
                </div>

                {/* Add Input (for categories/locations only) */}
                {metaTab !== 'containers' && (
                    <div className="mt-5 flex gap-2">
                        <input
                            value={metaNewValue}
                            onChange={e => setMetaNewValue(e.target.value)}
                            placeholder={metaTab === 'categories' ? 'Add new category...' : 'Add new location...'}
                            className="flex-1 px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                        />
                        <button
                            onClick={() => {
                                onAdd(metaTab as 'categories' | 'locations', metaNewValue);
                                setMetaNewValue('');
                            }}
                            className="px-5 py-3 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accentHover"
                        >
                            Add
                        </button>
                    </div>
                )}
            </div>

            {/* Container Form Modal */}
            <ContainerForm
                isOpen={showContainerForm}
                onClose={() => setShowContainerForm(false)}
                onSave={handleSaveContainer}
                editingContainer={editingContainer}
                businessId={businessId}
            />
        </div>
    );
}

export default MetaManagerModal;
