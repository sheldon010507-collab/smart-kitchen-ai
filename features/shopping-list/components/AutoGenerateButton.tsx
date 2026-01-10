/**
 * Auto-generate shopping list button with preview modal
 */

import React, { useState } from 'react';
import { Zap, Check, AlertCircle, X } from 'lucide-react';
import type { GeneratedShoppingItem, AutoGenerateOptions } from '../types';
import { useAutoGenerate } from '../hooks/useAutoGenerate';
import { PRIORITY_LABELS, REASON_LABELS, REASON_ICONS, DEFAULT_AUTO_GENERATE_OPTIONS } from '../constants';

interface AutoGenerateButtonProps {
    businessId: string;
    userId: string;
    onComplete: () => void;
}

const AutoGenerateButton: React.FC<AutoGenerateButtonProps> = ({
    businessId,
    userId,
    onComplete,
}) => {
    const { loading, result, generate, insertItems, clear } = useAutoGenerate(businessId, userId);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [inserting, setInserting] = useState(false);
    const [insertResult, setInsertResult] = useState<{ inserted: number; errors: string[] } | null>(null);

    // Generation options (could be made configurable via UI)
    const [options] = useState<AutoGenerateOptions>(DEFAULT_AUTO_GENERATE_OPTIONS);

    const handleGenerate = async () => {
        const genResult = await generate(options);
        if (genResult.items.length > 0) {
            // Pre-select all items
            setSelectedItems(new Set(genResult.items.map((_, i) => String(i))));
            setShowPreview(true);
        } else if (genResult.errors.length > 0) {
            alert(`Generation completed with errors:\n${genResult.errors.join('\n')}`);
        } else {
            alert('No items to add. Your inventory looks good!');
        }
        setInsertResult(null);
    };

    const toggleItem = (index: number) => {
        const key = String(index);
        const newSelected = new Set(selectedItems);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedItems(newSelected);
    };

    const toggleAll = () => {
        if (selectedItems.size === (result?.items.length ?? 0)) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(result?.items.map((_, i) => String(i)) ?? []));
        }
    };

    const handleInsert = async () => {
        if (!result) return;

        const itemsToInsert = result.items.filter((_, i) => selectedItems.has(String(i)));
        if (itemsToInsert.length === 0) {
            alert('Please select at least one item to add.');
            return;
        }

        setInserting(true);
        try {
            const insertRes = await insertItems(itemsToInsert);
            setInsertResult(insertRes);

            if (insertRes.inserted > 0) {
                setTimeout(() => {
                    setShowPreview(false);
                    clear();
                    onComplete();
                }, 1500);
            }
        } finally {
            setInserting(false);
        }
    };

    const handleClose = () => {
        setShowPreview(false);
        clear();
        setInsertResult(null);
        setSelectedItems(new Set());
    };

    return (
        <>
            <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
                <Zap className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">{loading ? 'Scanning...' : 'Auto Generate'}</span>
                <span className="sm:hidden">{loading ? '...' : 'Auto'}</span>
            </button>

            {/* Preview Modal */}
            {showPreview && result && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] md:max-h-[80vh] flex flex-col overflow-hidden mb-20 md:mb-0">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-[#E9E9E7]">
                            <div>
                                <h2 className="text-base md:text-lg font-semibold text-[#37352F]">Generated Items</h2>
                                <p className="text-xs md:text-sm text-[#787774]">
                                    {result.items.length} items found • {result.skipped} skipped
                                </p>
                            </div>
                            <button onClick={handleClose} className="text-[#787774] hover:text-[#37352F]">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Errors */}
                        {result.errors.length > 0 && (
                            <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-200">
                                <div className="flex items-start space-x-2 text-yellow-700 text-sm">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>{result.errors.join('; ')}</div>
                                </div>
                            </div>
                        )}

                        {/* Item List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {result.items.length === 0 ? (
                                <div className="text-center py-8 text-[#787774]">
                                    <Zap className="w-8 h-8 mx-auto mb-2 text-[#D3D1CB]" />
                                    <p>No items to generate. Your inventory looks good!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Select All */}
                                    <button
                                        onClick={toggleAll}
                                        className="text-sm text-blue-600 hover:underline mb-2"
                                    >
                                        {selectedItems.size === result.items.length ? 'Deselect All' : 'Select All'}
                                    </button>

                                    {result.items.map((item, index) => (
                                        <div
                                            key={index}
                                            onClick={() => toggleItem(index)}
                                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedItems.has(String(index))
                                                ? 'border-blue-300 bg-blue-50'
                                                : 'border-[#E9E9E7] hover:bg-[#F7F6F3]'
                                                }`}
                                        >
                                            <div
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedItems.has(String(index))
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'border-[#D3D1CB]'
                                                    }`}
                                            >
                                                {selectedItems.has(String(index)) && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-[#37352F] truncate">{item.item_name}</div>
                                                <div className="text-xs text-[#787774] flex items-center space-x-2">
                                                    <span>
                                                        {item.quantity_needed} {item.unit}
                                                    </span>
                                                    {item.category && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{item.category}</span>
                                                        </>
                                                    )}
                                                    <span>•</span>
                                                    <span>{REASON_ICONS[item.reason]} {REASON_LABELS[item.reason]}</span>
                                                </div>
                                            </div>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${item.priority === 'urgent'
                                                    ? 'bg-red-100 text-red-700'
                                                    : item.priority === 'normal'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {PRIORITY_LABELS[item.priority]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Insert Result */}
                        {insertResult && (
                            <div
                                className={`px-6 py-3 border-t ${insertResult.errors.length > 0 ? 'bg-yellow-50' : 'bg-green-50'
                                    }`}
                            >
                                <div className="text-sm">
                                    {insertResult.inserted > 0 && (
                                        <span className="text-green-700">
                                            ✓ Added {insertResult.inserted} items
                                        </span>
                                    )}
                                    {insertResult.errors.length > 0 && (
                                        <span className="text-yellow-700 ml-2">
                                            ({insertResult.errors.length} errors)
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        {result.items.length > 0 && !insertResult && (
                            <div className="flex space-x-3 px-6 py-4 border-t border-[#E9E9E7]">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-2.5 border border-[#E9E9E7] rounded-lg text-[#37352F] font-medium hover:bg-[#F7F6F3] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleInsert}
                                    disabled={inserting || selectedItems.size === 0}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {inserting ? 'Adding...' : `Add ${selectedItems.size} Items`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default AutoGenerateButton;
