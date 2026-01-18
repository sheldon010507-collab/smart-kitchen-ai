/**
 * WastageModal Component
 * 
 * Modal for recording wastage/loss of inventory items.
 * Shows item info, allows quantity/reason input, displays estimated loss.
 */

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import type { InventoryItem, WastageReason } from '../types';

interface WastageModalProps {
    item: InventoryItem | null;
    onClose: () => void;
    onConfirm: (data: {
        itemId: string;
        quantity: number;
        reason: WastageReason;
        notes?: string;
    }) => Promise<void>;
}

const REASON_OPTIONS: { value: WastageReason; label: string; icon: string }[] = [
    { value: 'expired', label: 'Expired', icon: '📅' },
    { value: 'spoiled', label: 'Spoiled', icon: '🦠' },
    { value: 'damaged', label: 'Damaged', icon: '💔' },
    { value: 'preparation', label: 'Prep Loss', icon: '🔪' },
    { value: 'other', label: 'Other', icon: '📝' },
];

export default function WastageModal({ item, onClose, onConfirm }: WastageModalProps) {
    const [quantity, setQuantity] = useState(item?.quantityValue || 0);
    const [reason, setReason] = useState<WastageReason>('expired');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!item) return null;

    const maxQuantity = item.quantityValue || 0;
    const estimatedLoss = quantity * (item.unitCost || 0);

    const handleQuantityChange = (value: string) => {
        const num = parseFloat(value) || 0;
        setQuantity(Math.min(Math.max(0, num), maxQuantity));
    };

    const handleSubmit = async () => {
        if (quantity <= 0) {
            setError('Please enter a valid quantity');
            return;
        }
        if (quantity > maxQuantity) {
            setError('Quantity cannot exceed stock');
            return;
        }

        setError('');
        setIsSubmitting(true);
        try {
            await onConfirm({
                itemId: item.id,
                quantity,
                reason,
                notes: notes.trim() || undefined,
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to record');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-600">
                        <Trash2 className="w-5 h-5" />
                        <h3 className="font-bold">Record Wastage</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Item Info */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium text-primary">{item.name}</div>
                        <div className="text-sm text-secondary">
                            Current Stock: {item.quantityValue} {item.quantityUnit}
                            {(item.unitCost || 0) > 0 && ` · Unit Price: £${item.unitCost?.toFixed(2)}`}
                        </div>
                    </div>

                    {/* Quantity Input */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Wastage Quantity</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => handleQuantityChange(e.target.value)}
                                className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                                min="0"
                                max={maxQuantity}
                                step="0.1"
                            />
                            <span className="text-secondary">{item.quantityUnit}</span>
                            <button
                                type="button"
                                onClick={() => setQuantity(maxQuantity)}
                                className="text-xs text-accent hover:underline"
                            >
                                All
                            </button>
                        </div>
                    </div>

                    {/* Reason Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Wastage Reason</label>
                        <div className="grid grid-cols-2 gap-2">
                            {REASON_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setReason(opt.value)}
                                    className={`p-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${reason === opt.value
                                        ? 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <span>{opt.icon}</span>
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                            rows={2}
                            placeholder="e.g., Found moldy when checking..."
                        />
                    </div>

                    {/* Estimated Loss */}
                    {estimatedLoss > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-sm text-red-700">
                                Estimated Loss: <strong>£{estimatedLoss.toFixed(2)}</strong>
                            </span>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2 border border-border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={quantity <= 0 || isSubmitting}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Processing...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
