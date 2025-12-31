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
            className="bg-white p-8 rounded-xl border border-border hover:border-accent hover:shadow-md transition-all cursor-pointer group relative"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div className="pr-10">
                    <h3 className="font-bold text-xl text-primary mb-2 group-hover:text-accent transition-colors">
                        {business.name}
                    </h3>
                    {business.address && (
                        <div className="flex items-center text-sm text-secondary">
                            <MapPin className="w-4 h-4 mr-1.5" />
                            <span className="truncate">{business.address}</span>
                        </div>
                    )}
                </div>
                <span className="text-xs bg-background px-2 py-1 rounded text-secondary font-mono border border-border">
                    {business.joinCode}
                </span>
            </div>

            {/* Edit Button */}
            <button
                onClick={onEdit}
                className="absolute top-6 right-12 p-2 text-secondary hover:text-primary rounded-lg hover:bg-background transition-colors z-10"
            >
                <Edit className="w-4 h-4" />
            </button>

            {/* Stats */}
            <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex justify-between text-base items-center">
                    <span className="text-secondary font-medium">Revenue</span>
                    <span className="font-bold text-primary">${totalRev.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-base items-center">
                    <span className="text-secondary font-medium">Alerts</span>
                    <span className={`font-semibold ${alertCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {alertCount} items
                    </span>
                </div>
            </div>
        </div>
    );
}

export default LocationCard;
