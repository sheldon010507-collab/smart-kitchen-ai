/**
 * Stage 3.2: Category Setup
 * Define categories (hierarchy flattened for now)
 */
import React, { useState, useCallback } from 'react';
import { Stage3CategoriesProps, DraftCategory } from './types';
import { WIZARD_STRINGS } from './constants';

export const Stage3Categories: React.FC<Stage3CategoriesProps> = ({
    categories,
    onChange,
    onNext,
    onBack,
}) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Handlers
    const handleAddCategory = useCallback(() => {
        if (!newCategoryName.trim()) return;

        const newCat: DraftCategory = {
            id: crypto.randomUUID(),
            name: newCategoryName.trim(),
            isNew: true,
        };

        onChange([...categories, newCat]);
        setNewCategoryName('');
    }, [categories, newCategoryName, onChange]);

    const handleUpdateCategory = useCallback((id: string, updates: Partial<DraftCategory>) => {
        onChange(categories.map(cat =>
            cat.id === id ? { ...cat, ...updates } : cat
        ));
    }, [categories, onChange]);

    const handleDeleteCategory = useCallback((id: string) => {
        onChange(categories.filter(cat => cat.id !== id));
    }, [categories, onChange]);

    // Predefined suggestions could go here
    const suggestions = ['Meat', 'Seafood', 'Produce', 'Dairy', 'Dry Goods', 'Beverages'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Setup Categories
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Define proper collection categories for grouping your items.
                    </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full text-sm font-medium">
                    {categories.length} Categories
                </div>
            </div>

            {/* Quick Add Form */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-4">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Fresh Produce"
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                    />
                    <button
                        onClick={handleAddCategory}
                        disabled={!newCategoryName.trim()}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 font-medium"
                    >
                        Add
                    </button>
                </div>

                {/* Suggestions */}
                <div className="flex gap-2 flex-wrap">
                    {suggestions.map(s => (
                        <button
                            key={s}
                            onClick={() => setNewCategoryName(s)}
                            className="px-3 py-1 text-xs rounded-full border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        >
                            + {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Categories List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <div className="col-span-10">Category Name</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                    {categories.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No categories added yet.
                        </div>
                    ) : (
                        categories.map(cat => (
                            <div key={cat.id} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className="col-span-10">
                                    {editingId === cat.id ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={cat.name}
                                            onChange={e => handleUpdateCategory(cat.id, { name: e.target.value })}
                                            onBlur={() => setEditingId(null)}
                                            onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                                            className="w-full px-2 py-1 rounded border border-purple-400 bg-white dark:bg-gray-800"
                                        />
                                    ) : (
                                        <div
                                            className="font-medium text-gray-900 dark:text-white cursor-pointer hover:text-purple-500 flex items-center gap-2"
                                            onClick={() => setEditingId(cat.id)}
                                        >
                                            {cat.isNew && <span className="w-2 h-2 rounded-full bg-green-500" title="New" />}
                                            {cat.name}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-2 text-right">
                                    <button
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    ← Back to Locations
                </button>
                <button
                    onClick={onNext}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                    Next: Cleanse Items →
                </button>
            </div>
        </div>
    );
};

export default Stage3Categories;
