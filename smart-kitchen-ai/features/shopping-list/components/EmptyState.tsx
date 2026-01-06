/**
 * Empty state placeholder for shopping list
 */

import React from 'react';
import { ShoppingCart, Plus, Zap } from 'lucide-react';

interface EmptyStateProps {
    tab: 'pending' | 'purchased' | 'cancelled';
    onAddItem?: () => void;
    onAutoGenerate?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ tab, onAddItem, onAutoGenerate }) => {
    const messages = {
        pending: {
            icon: <ShoppingCart className="w-12 h-12 text-[#D3D1CB]" />,
            title: 'No pending items',
            description: 'Add items manually or auto-generate from your inventory.',
        },
        purchased: {
            icon: <ShoppingCart className="w-12 h-12 text-green-300" />,
            title: 'No purchased items',
            description: 'Items marked as purchased will appear here.',
        },
        cancelled: {
            icon: <ShoppingCart className="w-12 h-12 text-gray-300" />,
            title: 'No cancelled items',
            description: 'Cancelled items will appear here.',
        },
    };

    const { icon, title, description } = messages[tab];

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="mb-4">{icon}</div>
            <h3 className="text-lg font-medium text-[#37352F] mb-2">{title}</h3>
            <p className="text-sm text-[#787774] mb-6 max-w-sm">{description}</p>

            {tab === 'pending' && (onAddItem || onAutoGenerate) && (
                <div className="flex flex-wrap gap-3 justify-center">
                    {onAutoGenerate && (
                        <button
                            onClick={onAutoGenerate}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                            <Zap className="w-4 h-4" />
                            <span>Auto Generate</span>
                        </button>
                    )}
                    {onAddItem && (
                        <button
                            onClick={onAddItem}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#37352F] text-white rounded-lg hover:bg-[#2f2e2b] transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Item</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmptyState;
