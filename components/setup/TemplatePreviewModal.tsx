/**
 * Template Preview Modal
 * Shows detailed view of a template before selection
 */
import React from 'react';
import { InventoryTemplate } from './types';
import { WIZARD_STRINGS } from './constants';

interface TemplatePreviewModalProps {
    template: InventoryTemplate;
    onClose: () => void;
    onSelect: (template: InventoryTemplate) => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
    template,
    onClose,
    onSelect,
}) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{template.icon}</span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {template.name}
                            </h2>
                            {template.nameZh && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {template.nameZh}
                                </p>
                            )}
                        </div>
                    </div>
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
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Description */}
                    {template.description && (
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {template.description}
                        </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {template.items.length}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {WIZARD_STRINGS.items}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {template.categories.length}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {WIZARD_STRINGS.categories}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {template.locations.length}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {WIZARD_STRINGS.locations}
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {WIZARD_STRINGS.categories}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {template.categories.map((cat, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                                >
                                    {cat.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Locations */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {WIZARD_STRINGS.locations}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {template.locations.map((loc, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm"
                                >
                                    {loc.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Items Preview */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {WIZARD_STRINGS.items} (Preview)
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Category</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Unit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {template.items.slice(0, 10).map((item, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 text-gray-900 dark:text-white">{item.name}</td>
                                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{item.category}</td>
                                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{item.unit}</td>
                                        </tr>
                                    ))}
                                    {template.items.length > 10 && (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-2 text-center text-gray-500 dark:text-gray-400 italic">
                                                ... and {template.items.length - 10} more items
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                        onClick={() => onSelect(template)}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                        {WIZARD_STRINGS.select}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TemplatePreviewModal;
