/**
 * Template Manager View
 * Manage user's custom templates
 */
import React, { useState, useEffect, useCallback } from 'react';
import { InventoryTemplate } from '../../components/setup/types';
import { WIZARD_STRINGS } from '../../components/setup/constants';
import {
    getUserTemplates,
    deleteTemplate,
    createTemplateFromInventory
} from '../../services/templateService';
import { TemplateCard } from '../../components/setup/TemplateCard';
import { TemplatePreviewModal } from '../../components/setup/TemplatePreviewModal';

interface TemplateManagerViewProps {
    userId: string;
    businessId: string;
    existingItemCount: number;
    onUseTemplate: (template: InventoryTemplate) => void;
    onBack: () => void;
}

export const TemplateManagerView: React.FC<TemplateManagerViewProps> = ({
    userId,
    businessId,
    existingItemCount,
    onUseTemplate,
    onBack,
}) => {
    const [templates, setTemplates] = useState<InventoryTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewTemplate, setPreviewTemplate] = useState<InventoryTemplate | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<InventoryTemplate | null>(null);

    // Generate from inventory state
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateName, setGenerateName] = useState('');
    const [generating, setGenerating] = useState(false);

    // Load templates
    const loadTemplates = useCallback(async () => {
        setLoading(true);
        const result = await getUserTemplates(userId);
        if (result.data) {
            setTemplates(result.data);
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // Handle delete
    const handleDelete = useCallback(async () => {
        if (!deleteConfirm) return;

        const result = await deleteTemplate(deleteConfirm.id, userId);
        if (result.data) {
            setTemplates(prev => prev.filter(t => t.id !== deleteConfirm.id));
        }
        setDeleteConfirm(null);
    }, [deleteConfirm, userId]);

    // Handle generate from inventory
    const handleGenerateFromInventory = useCallback(async () => {
        if (!generateName.trim()) return;

        setGenerating(true);
        const result = await createTemplateFromInventory(
            businessId,
            generateName.trim(),
            userId
        );

        if (result.data) {
            setTemplates(prev => [result.data!, ...prev]);
            setShowGenerateModal(false);
            setGenerateName('');
        }
        setGenerating(false);
    }, [businessId, generateName, userId]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                📋 Template Manager
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* My Templates Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {WIZARD_STRINGS.myTemplates} ({templates.length})
                    </h2>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                    ) : templates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map(template => (
                                <div key={template.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{template.icon}</span>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                                    {template.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {template.items.length} items · Updated {new Date(template.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {template.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                            {template.description}
                                        </p>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPreviewTemplate(template)}
                                            className="flex-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            {WIZARD_STRINGS.preview}
                                        </button>
                                        <button
                                            onClick={() => onUseTemplate(template)}
                                            className="flex-1 px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                        >
                                            Use
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(template)}
                                            className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                            <div className="text-gray-400 dark:text-gray-500 text-4xl mb-3">📋</div>
                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                                No custom templates yet
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                                Create one using the Inventory Setup Wizard or generate from existing inventory
                            </p>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Quick Actions
                    </h3>

                    <div className="flex flex-wrap gap-4">
                        {/* Generate from Inventory */}
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            disabled={existingItemCount === 0}
                            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors
                ${existingItemCount > 0
                                    ? 'border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                                }
              `}
                        >
                            <div className="text-2xl">📤</div>
                            <div className="text-left">
                                <div className="font-medium text-gray-900 dark:text-white">
                                    Generate from Current Inventory
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Save your {existingItemCount} items as a template
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <TemplatePreviewModal
                    template={previewTemplate}
                    onClose={() => setPreviewTemplate(null)}
                    onSelect={(t) => {
                        onUseTemplate(t);
                        setPreviewTemplate(null);
                    }}
                />
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">🗑️</div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Delete Template?
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            Are you sure you want to delete "<strong>{deleteConfirm.name}</strong>"? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate from Inventory Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            📤 Generate Template from Inventory
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            This will create a template from your current {existingItemCount} inventory items.
                        </p>
                        <input
                            type="text"
                            value={generateName}
                            onChange={e => setGenerateName(e.target.value)}
                            placeholder="Template name..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowGenerateModal(false);
                                    setGenerateName('');
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerateFromInventory}
                                disabled={generating || !generateName.trim()}
                                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {generating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        Generating...
                                    </>
                                ) : (
                                    'Generate'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateManagerView;
