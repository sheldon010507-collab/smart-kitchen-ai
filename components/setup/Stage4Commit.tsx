/**
 * Stage 4: Confirm & Commit
 * Final review, merge strategy selection, and import confirmation
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Stage4CommitProps, MergeStrategy } from './types';
import { WIZARD_STRINGS } from './constants';

export const Stage4Commit: React.FC<Stage4CommitProps> = ({
    items,
    existingItemCount,
    businessId,
    userId,
    onCommit,
    onBack,
    onSaveAsTemplate,
}) => {
    const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('smart-merge');
    const [isCommitting, setIsCommitting] = useState(false);
    const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);

    // Stats
    const activeItems = items.filter(i => !i.isDeleted);
    const categories = useMemo(() =>
        [...new Set(activeItems.map(i => i.category).filter(Boolean))],
        [activeItems]
    );
    const locations = useMemo(() =>
        [...new Set(activeItems.map(i => i.location).filter(Boolean))],
        [activeItems]
    );

    const handleStrategyChange = useCallback((strategy: MergeStrategy) => {
        setMergeStrategy(strategy);
        if (strategy === 'overwrite' && existingItemCount > 0) {
            setShowConfirmOverwrite(true);
        }
    }, [existingItemCount]);

    const handleCommit = useCallback(async () => {
        setIsCommitting(true);
        try {
            await onCommit(mergeStrategy);
        } catch (e) {
            console.error('Commit failed:', e);
            alert(WIZARD_STRINGS.errorImport);
        } finally {
            setIsCommitting(false);
        }
    }, [mergeStrategy, onCommit]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {WIZARD_STRINGS.confirmImport}
                </h3>
            </div>

            {/* Stats Summary */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    {WIZARD_STRINGS.readyToImport}
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                        <div className="text-3xl font-bold text-blue-500">{activeItems.length}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{WIZARD_STRINGS.items}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                        <div className="text-3xl font-bold text-green-500">{categories.length}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{WIZARD_STRINGS.categories}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                        <div className="text-3xl font-bold text-purple-500">{locations.length}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{WIZARD_STRINGS.locations}</div>
                    </div>
                </div>

                {/* Existing Items Warning */}
                {existingItemCount > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="text-amber-700 dark:text-amber-300 text-sm">
                            ⚠️ {WIZARD_STRINGS.existingItems} <strong>{existingItemCount}</strong> {WIZARD_STRINGS.existingItemsLabel}
                        </div>
                    </div>
                )}
            </div>

            {/* Merge Strategy Selection */}
            {existingItemCount > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                        {WIZARD_STRINGS.mergeStrategy}
                    </h4>
                    <div className="space-y-3">
                        {/* Smart Merge */}
                        <label
                            className={`
                flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors
                ${mergeStrategy === 'smart-merge'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                }
              `}
                        >
                            <input
                                type="radio"
                                name="mergeStrategy"
                                value="smart-merge"
                                checked={mergeStrategy === 'smart-merge'}
                                onChange={() => handleStrategyChange('smart-merge')}
                                className="mt-1"
                            />
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {WIZARD_STRINGS.smartMerge} <span className="text-xs text-blue-500">(Recommended)</span>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {WIZARD_STRINGS.smartMergeDesc}
                                </div>
                            </div>
                        </label>

                        {/* Add New Only */}
                        <label
                            className={`
                flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors
                ${mergeStrategy === 'add-new-only'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                }
              `}
                        >
                            <input
                                type="radio"
                                name="mergeStrategy"
                                value="add-new-only"
                                checked={mergeStrategy === 'add-new-only'}
                                onChange={() => handleStrategyChange('add-new-only')}
                                className="mt-1"
                            />
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {WIZARD_STRINGS.addNewOnly}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {WIZARD_STRINGS.addNewOnlyDesc}
                                </div>
                            </div>
                        </label>

                        {/* Overwrite */}
                        <label
                            className={`
                flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors
                ${mergeStrategy === 'overwrite'
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                                }
              `}
                        >
                            <input
                                type="radio"
                                name="mergeStrategy"
                                value="overwrite"
                                checked={mergeStrategy === 'overwrite'}
                                onChange={() => handleStrategyChange('overwrite')}
                                className="mt-1"
                            />
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {WIZARD_STRINGS.overwrite}
                                </div>
                                <div className="text-sm text-red-500 dark:text-red-400">
                                    {WIZARD_STRINGS.overwriteWarning}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {WIZARD_STRINGS.overwriteDesc}
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {/* Save as Template Section */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            💾 {WIZARD_STRINGS.saveAsTemplate}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {WIZARD_STRINGS.saveAsTemplateDesc}
                        </div>
                    </div>
                    <button
                        onClick={onSaveAsTemplate}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        {WIZARD_STRINGS.saveAsTemplate}...
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    ← {WIZARD_STRINGS.back}
                </button>
                <button
                    onClick={handleCommit}
                    disabled={isCommitting || activeItems.length === 0}
                    className={`
            px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
            ${activeItems.length > 0 && !isCommitting
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }
          `}
                >
                    {isCommitting ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Importing...
                        </>
                    ) : (
                        <>✓ {WIZARD_STRINGS.confirm}</>
                    )}
                </button>
            </div>

            {/* Overwrite Confirmation Modal */}
            {showConfirmOverwrite && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">⚠️</div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Confirm Overwrite
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            This will permanently delete all <strong>{existingItemCount}</strong> existing inventory items. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setMergeStrategy('smart-merge');
                                    setShowConfirmOverwrite(false);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowConfirmOverwrite(false)}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stage4Commit;
