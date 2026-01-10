/**
 * Save As Template Modal
 * Allows user to save current configuration as a reusable template
 */
import React, { useState, useCallback } from 'react';
import { DraftInventoryItem, TemplateCategory, TemplateLocation, TemplateItem } from './types';
import { WIZARD_STRINGS, TEMPLATE_ICONS } from './constants';
import { createTemplate } from '../../services/templateService';

interface SaveAsTemplateModalProps {
    items: DraftInventoryItem[];
    businessId: string;
    userId: string;
    onClose: () => void;
    onSaved: () => void;
}

export const SaveAsTemplateModal: React.FC<SaveAsTemplateModalProps> = ({
    items,
    businessId,
    userId,
    onClose,
    onSaved,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('📦');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Extract unique categories and locations from items
    const activeItems = items.filter(i => !i.isDeleted);
    const categories: TemplateCategory[] = Array.from(
        new Set(activeItems.map(i => i.category).filter((c): c is string => Boolean(c)))
    ).map((name: string) => ({ name }));

    const locations: TemplateLocation[] = [
        ...new Set(activeItems.map(i => i.location).filter(Boolean) as string[])
    ].map(name => ({ name, type: 'Dry' as const }));

    // Convert to template items
    const templateItems: TemplateItem[] = activeItems.map(i => ({
        name: i.name,
        category: i.category || 'Other',
        unit: i.quantityUnit || i.unit || 'pcs',
        cost: i.unitCost ?? i.cost,
        suggestedPar: i.minStockLevel ?? i.suggestedPar,
    }));

    const handleSave = useCallback(async () => {
        if (!name.trim()) {
            setError('Template name is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const result = await createTemplate({
                name: name.trim(),
                description: description.trim() || undefined,
                icon,
                businessId,
                categories,
                locations,
                items: templateItems,
            }, userId);

            if (result.error) {
                throw result.error;
            }

            onSaved();
            onClose();
        } catch (e: any) {
            setError(e.message || WIZARD_STRINGS.errorSaveTemplate);
        } finally {
            setSaving(false);
        }
    }, [name, description, icon, businessId, categories, locations, templateItems, userId, onSaved, onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        💾 {WIZARD_STRINGS.saveAsTemplate}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Template Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {WIZARD_STRINGS.templateName} *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="My Restaurant Template"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {WIZARD_STRINGS.templateDescription}
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Brief description of this template..."
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Icon Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {WIZARD_STRINGS.templateIcon}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {TEMPLATE_ICONS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => setIcon(emoji)}
                                    className={`
                    w-10 h-10 rounded-lg text-xl transition-all
                    ${icon === emoji
                                            ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }
                  `}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats Preview */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Will save: <strong>{activeItems.length}</strong> items · <strong>{categories.length}</strong> categories · <strong>{locations.length}</strong> locations
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        {WIZARD_STRINGS.cancel}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className={`
              px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${!saving && name.trim()
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            }
            `}
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                Saving...
                            </>
                        ) : (
                            WIZARD_STRINGS.saveTemplate
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveAsTemplateModal;
