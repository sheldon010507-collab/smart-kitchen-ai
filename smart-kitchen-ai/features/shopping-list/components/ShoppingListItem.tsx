/**
 * Single shopping list item row component
 */

import React from 'react';
import { Check, X, Edit2, Trash2, RotateCcw } from 'lucide-react';
import type { ShoppingListItem } from '../types';
import { PRIORITY_COLORS, PRIORITY_LABELS, REASON_ICONS, REASON_LABELS } from '../constants';

interface ShoppingListItemRowProps {
    item: ShoppingListItem;
    onMarkPurchased?: (id: string) => void;
    onMarkCancelled?: (id: string) => void;
    onMarkPending?: (id: string) => void;
    onEdit?: (item: ShoppingListItem) => void;
    onDelete?: (id: string) => void;
    showBusinessName?: boolean;
    businessName?: string;
}

const ShoppingListItemRow: React.FC<ShoppingListItemRowProps> = ({
    item,
    onMarkPurchased,
    onMarkCancelled,
    onMarkPending,
    onEdit,
    onDelete,
    showBusinessName = false,
    businessName,
}) => {
    const isPending = item.status === 'pending';
    const isPurchased = item.status === 'purchased';
    const isCancelled = item.status === 'cancelled';

    return (
        <div
            className={`group flex items-center justify-between p-3 rounded-lg border transition-colors ${isPurchased
                    ? 'bg-green-50/50 border-green-100'
                    : isCancelled
                        ? 'bg-gray-50 border-gray-100 opacity-60'
                        : 'bg-white border-[#E9E9E7] hover:border-[#D3D1CB]'
                }`}
        >
            {/* Left: Checkbox/Status + Item Info */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Status/Action Button */}
                {isPending && onMarkPurchased && (
                    <button
                        onClick={() => onMarkPurchased(item.id)}
                        className="flex-shrink-0 w-5 h-5 rounded border-2 border-[#D3D1CB] hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center"
                        title="Mark as purchased"
                    >
                        <Check className="w-3 h-3 text-transparent group-hover:text-green-500" />
                    </button>
                )}
                {isPurchased && onMarkPending && (
                    <button
                        onClick={() => onMarkPending(item.id)}
                        className="flex-shrink-0 w-5 h-5 rounded bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                        title="Undo purchase"
                    >
                        <Check className="w-3 h-3 text-white" />
                    </button>
                )}
                {isCancelled && onMarkPending && (
                    <button
                        onClick={() => onMarkPending(item.id)}
                        className="flex-shrink-0 w-5 h-5 rounded bg-gray-300 flex items-center justify-center hover:bg-gray-400 transition-colors"
                        title="Restore item"
                    >
                        <RotateCcw className="w-3 h-3 text-white" />
                    </button>
                )}

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <span
                            className={`font-medium truncate ${isCancelled ? 'line-through text-gray-400' : 'text-[#37352F]'
                                }`}
                        >
                            {item.item_name}
                        </span>

                        {/* Priority Badge */}
                        <span
                            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[item.priority]}`}
                        >
                            {PRIORITY_LABELS[item.priority]}
                        </span>
                    </div>

                    <div className="flex items-center space-x-3 mt-1 text-xs text-[#787774]">
                        <span className="font-medium">
                            {item.quantity_needed} {item.unit}
                        </span>
                        {item.category && (
                            <>
                                <span>•</span>
                                <span>{item.category}</span>
                            </>
                        )}
                        <span>•</span>
                        <span title={REASON_LABELS[item.reason]}>
                            {REASON_ICONS[item.reason]} {REASON_LABELS[item.reason]}
                        </span>
                        {showBusinessName && businessName && (
                            <>
                                <span>•</span>
                                <span className="font-medium">{businessName}</span>
                            </>
                        )}
                    </div>

                    {item.notes && (
                        <p className="text-xs text-[#9B9A97] mt-1 truncate italic">{item.notes}</p>
                    )}
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isPending && onEdit && (
                    <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F6F3] rounded transition-colors"
                        title="Edit item"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}

                {isPending && onMarkCancelled && (
                    <button
                        onClick={() => onMarkCancelled(item.id)}
                        className="p-1.5 text-[#787774] hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                        title="Cancel item"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 text-[#787774] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete item"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ShoppingListItemRow;
