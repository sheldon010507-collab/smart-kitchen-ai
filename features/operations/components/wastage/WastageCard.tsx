/**
 * WastageCard Component
 * 
 * Displays wastage metrics in the Operations Overview
 */

import React from 'react';
import { TrendingDown, AlertTriangle } from 'lucide-react';

interface WastageCardProps {
    totalWastage: number;
    wastageRate: number;
    recordCount: number;
}

export const WastageCard: React.FC<WastageCardProps> = ({
    totalWastage,
    wastageRate,
    recordCount,
}) => {
    const isHighWastage = wastageRate > 0.05; // 5% threshold

    return (
        <div className="bg-white p-6 rounded-lg border border-[#e9e9e7] shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[#787774]">Total Wastage</p>
                {isHighWastage && (
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                )}
            </div>

            <p className="text-3xl font-bold text-[#37352f]">
                ${totalWastage.toFixed(0)}
            </p>

            <div className="flex items-center mt-2 space-x-2">
                <TrendingDown className="w-4 h-4 text-[#9b9a97]" />
                <p className="text-sm text-[#9b9a97]">
                    {(wastageRate * 100).toFixed(1)}% of inventory ({recordCount} records)
                </p>
            </div>

            {isHighWastage && (
                <p className="text-xs text-orange-600 mt-2">
                    ⚠️ Wastage exceeds 5% threshold
                </p>
            )}
        </div>
    );
};
