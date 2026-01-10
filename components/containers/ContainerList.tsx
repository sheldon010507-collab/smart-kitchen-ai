/**
 * ContainerList Component
 * Displays list of registered containers with edit/delete actions
 */

import React, { useState } from 'react';
import { Trash2, Edit2, Plus, Camera } from 'lucide-react';
import type { Container } from '../../types';

interface ContainerListProps {
    containers: Container[];
    loading: boolean;
    onAdd: () => void;
    onEdit: (container: Container) => void;
    onDelete: (id: string) => void;
}

const ContainerList: React.FC<ContainerListProps> = ({
    containers,
    loading,
    onAdd,
    onEdit,
    onDelete,
}) => {
    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {containers.length === 0 ? (
                <div className="p-8 text-center text-secondary border border-dashed border-border rounded-lg">
                    <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No containers registered yet</p>
                    <p className="text-sm mt-1">Register your containers to improve scan accuracy</p>
                </div>
            ) : (
                containers.map((container) => (
                    <div
                        key={container.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            {/* Container Preview Image or Icon */}
                            {container.images.length > 0 ? (
                                <img
                                    src={container.images[0]}
                                    alt={container.name}
                                    className="w-12 h-12 rounded-lg object-cover border"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center border">
                                    <Camera className="w-6 h-6 text-gray-400" />
                                </div>
                            )}

                            {/* Container Info */}
                            <div>
                                <div className="font-semibold text-primary">{container.name}</div>
                                <div className="text-sm text-secondary">
                                    {container.capacityValue} {container.capacityUnit}
                                    {container.images.length > 0 && (
                                        <span className="ml-2 text-xs">
                                            • {container.images.length} photo{container.images.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => onEdit(container)}
                                className="p-2 rounded-lg border border-border text-primary hover:bg-background"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm(`Delete "${container.name}"?`)) {
                                        onDelete(container.id);
                                    }
                                }}
                                className="p-2 rounded-lg border border-border text-red-600 hover:bg-red-50"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))
            )}

            {/* Add Button */}
            <button
                onClick={onAdd}
                className="w-full p-3 rounded-lg border-2 border-dashed border-border text-secondary hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add New Container</span>
            </button>
        </div>
    );
};

export default ContainerList;
