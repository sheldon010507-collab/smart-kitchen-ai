/**
 * Location Card Component
 * 
 * Card displaying a business location with revenue and alerts
 * Used in Master Dashboard grid view
 */

import React from 'react';
import { MapPin, Edit } from 'lucide-react';
import { Business, InventoryItem, SalesReceipt } from '../../../types';

interface LocationCardProps {
    business: Business;
    inventory: InventoryItem[];
    sales: SalesReceipt[];
    onClick: () => void;
    onEdit: (e: React.MouseEvent) => void;
}

export function LocationCard({
    business,
    inventory,
    sales,
    onClick,
    onEdit,
}: LocationCardProps) {
    const totalRev = sales.reduce((acc, s) => acc + s.totalAmount, 0);

    // Count items expiring within 3 days
    const alertCount = inventory.filter(i => {
        if (!i.expiryDate) return false;
        const expiry = new Date(i.expiryDate);
        const threshold = new Date(Date.now() + 86400000 * 3);
        return expiry < threshold;
    }).length;

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all cursor-pointer group relative"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div className="pr-10">
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                        {business.name}
                    </h3>
                    {business.address && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="w-4 h-4 mr-1.5" />
                            <span className="truncate">{business.address}</span>
                        </div>
                    )}
                </div>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 dark:text-gray-400 font-mono border border-gray-200 dark:border-gray-600">
                    {business.joinCode}
                </span>
            </div>

            {/* Edit Button */}
            <button
                onClick={onEdit}
                className="absolute top-6 right-12 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
            >
                <Edit className="w-4 h-4" />
            </button>

            {/* Stats */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-base items-center">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Revenue</span>
                    <span className="font-bold text-gray-900 dark:text-white">${totalRev.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-base items-center">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Alerts</span>
                    <span className={`font-semibold ${alertCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {alertCount} items
                    </span>
                </div>
            </div>
        </div>
    );
}

export default LocationCard;
