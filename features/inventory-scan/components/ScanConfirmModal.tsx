/**
 * ScanConfirmModal Component
 * Allows users to review and correct container-based scan results
 * Records fill level corrections for self-learning
 */

import React, { useState } from 'react';
import { X, Check, RefreshCw, Box } from 'lucide-react';
import type { FillLevel } from '../../../types';
import type { ScanResultItem } from '../services/promptTemplates';

interface ScanConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: ScanResultItem[];
    onConfirm: (correctedItems: CorrectedItem[]) => void;
    onRecordCorrection?: (itemName: string, originalFillLevel: FillLevel, correctedFillLevel: FillLevel) => void;
}

export interface CorrectedItem extends ScanResultItem {
    corrected_fill_level?: FillLevel;
    corrected_quantity?: number;
}

const FILL_LEVEL_OPTIONS: { value: FillLevel; label: string; color: string }[] = [
    { value: 'full', label: '滿', color: 'bg-green-500' },
    { value: 'medium', label: '半滿', color: 'bg-yellow-500' },
    { value: 'low', label: '少量', color: 'bg-orange-500' },
    { value: 'empty', label: '空', color: 'bg-red-500' },
];

const ScanConfirmModal: React.FC<ScanConfirmModalProps> = ({
    isOpen,
    onClose,
    items,
    onConfirm,
    onRecordCorrection,
}) => {
    // Track corrections per item
    const [corrections, setCorrections] = useState<Map<number, Partial<CorrectedItem>>>(new Map());

    if (!isOpen) return null;

    const handleFillLevelChange = (index: number, item: ScanResultItem, newLevel: FillLevel) => {
        setCorrections(prev => {
            const updated = new Map(prev);
            updated.set(index, {
                ...prev.get(index),
                corrected_fill_level: newLevel,
            });
            return updated;
        });

        // Record correction for learning
        if (onRecordCorrection && item.fill_level && item.fill_level !== newLevel) {
            onRecordCorrection(item.name, item.fill_level as FillLevel, newLevel);
        }
    };

    const handleQuantityChange = (index: number, newQty: number) => {
        setCorrections(prev => {
            const updated = new Map(prev);
            updated.set(index, {
                ...prev.get(index),
                corrected_quantity: newQty,
            });
            return updated;
        });
    };

    const handleConfirm = () => {
        const correctedItems: CorrectedItem[] = items.map((item, index) => {
            const correction = corrections.get(index);
            return {
                ...item,
                corrected_fill_level: correction?.corrected_fill_level,
                corrected_quantity: correction?.corrected_quantity,
            };
        });
        onConfirm(correctedItems);
    };

    // Filter to show only container items (with fill_level or container_name)
    const containerItems = items.filter(i => i.container_name || i.fill_level);
    const looseItems = items.filter(i => !i.container_name && !i.fill_level);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[75vh] md:max-h-[80vh] flex flex-col overflow-hidden mb-16 md:mb-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">確認掃描結果</h2>
                        <p className="text-sm text-gray-500">{items.length} 個項目識別</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Container Items Section */}
                    {containerItems.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <Box className="w-4 h-4 mr-1" />
                                容器項目 ({containerItems.length})
                            </h3>
                            <div className="space-y-3">
                                {containerItems.map((item, idx) => {
                                    const originalIndex = items.indexOf(item);
                                    const correction = corrections.get(originalIndex);
                                    const currentFillLevel = correction?.corrected_fill_level || item.fill_level;

                                    return (
                                        <div key={idx} className="border rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <span className="font-medium">{item.name}</span>
                                                    {item.container_name && (
                                                        <span className="text-xs text-blue-600 ml-2">
                                                            📦 {item.container_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    type="number"
                                                    value={correction?.corrected_quantity ?? item.quantity}
                                                    onChange={(e) => handleQuantityChange(originalIndex, parseFloat(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 border rounded text-right text-sm"
                                                    min="0"
                                                    step="0.1"
                                                />
                                                <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
                                            </div>

                                            {/* Fill Level Selector */}
                                            <div className="flex gap-1">
                                                {FILL_LEVEL_OPTIONS.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => handleFillLevelChange(originalIndex, item, opt.value)}
                                                        className={`flex-1 py-1.5 text-xs rounded transition-colors ${currentFillLevel === opt.value
                                                                ? `${opt.color} text-white`
                                                                : 'bg-gray-100 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* AI note */}
                                            {item.notes && (
                                                <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Loose Items Section */}
                    {looseItems.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">
                                散裝項目 ({looseItems.length})
                            </h3>
                            <div className="space-y-2">
                                {looseItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-sm text-gray-500">
                                            {item.quantity} {item.unit}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-4 py-3 border-t">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primaryHover flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        確認並保存
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScanConfirmModal;
