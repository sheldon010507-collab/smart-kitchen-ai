/**
 * MenuItemCard Component
 * 
 * Displays a single menu item card with Staff/Manager view modes
 */

import React from 'react';
import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { MenuItem, InventoryItem } from '../../../types';

interface MenuItemCardProps {
    item: MenuItem;
    inventory: InventoryItem[];
    isStaff: boolean;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
}

export function MenuItemCard({
    item,
    inventory,
    isStaff,
    onEdit,
    onDelete,
}: MenuItemCardProps) {

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this dish?')) {
            onDelete(item.id);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(item);
    };

    // Staff View: Simplified Card
    if (isStaff) {
        return (
            <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm hover:border-accent transition-all group relative">
                <div className="aspect-[4/3] bg-background relative overflow-hidden">
                    {item.imageUrl ? (
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-border bg-gray-50">
                            <ImageIcon className="w-8 h-8 opacity-40" />
                        </div>
                    )}

                    {/* Staff Actions Overlay */}
                    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            onClick={handleEdit}
                            className="p-1.5 bg-white/90 rounded-md text-primary hover:text-accent shadow-sm backdrop-blur-sm border border-black/5"
                            title="Edit Dish"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-1.5 bg-white/90 rounded-md text-red-500 hover:text-red-700 shadow-sm backdrop-blur-sm border border-black/5"
                            title="Delete Dish"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                <div className="p-3">
                    <h3 className="font-bold text-primary text-sm leading-tight truncate" title={item.name}>
                        {item.name}
                    </h3>
                </div>
            </div>
        );
    }

    // Manager View: Full Card with Cost Analysis
    const margin = item.sellingPrice - (item.estimatedCost || 0);
    const marginPercent = item.sellingPrice > 0 ? (margin / item.sellingPrice) * 100 : 0;

    return (
        <div className="bg-white rounded-xl border border-border overflow-hidden hover:border-accent transition-all group flex flex-col shadow-sm">
            {/* Image */}
            <div className="h-48 bg-background relative overflow-hidden">
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-border">
                        <ImageIcon className="w-12 h-12 opacity-50" />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        onClick={handleEdit}
                        className="p-2 bg-white rounded-lg text-primary hover:bg-gray-100 shadow-sm border border-border"
                        title="Edit"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 bg-white rounded-lg text-red-600 hover:bg-gray-100 shadow-sm border border-border"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-primary text-lg">{item.name}</h4>
                    <span className="font-bold text-primary text-lg">${item.sellingPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-secondary font-bold uppercase tracking-wider mb-4">
                    {item.category}
                </p>

                {/* Cost Analysis */}
                <div className="mt-auto bg-background rounded-lg p-3 border border-border">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-secondary uppercase">Dynamic Cost</span>
                        <span className="text-sm font-mono font-extrabold text-primary">
                            ${(item.estimatedCost || 0).toFixed(2)}
                        </span>
                    </div>

                    {/* Margin Progress Bar */}
                    <div className="w-full bg-white border border-border rounded-full h-2 mb-1.5 overflow-hidden">
                        <div
                            className={`h-full ${marginPercent < 60 ? 'bg-amber-400' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(Math.max(marginPercent, 0), 100)}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-secondary font-medium">Updated live from inventory</span>
                        <span className={`text-xs font-bold ${marginPercent < 60 ? 'text-amber-600' : 'text-green-600'}`}>
                            {marginPercent.toFixed(0)}% Margin
                        </span>
                    </div>

                    {/* Ingredient Breakdown */}
                    {item.ingredients && item.ingredients.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-border/50">
                            <p className="text-[10px] text-secondary font-bold uppercase mb-1">Cost Breakdown</p>
                            <div className="space-y-1">
                                {item.ingredients.slice(0, 3).map((ing, idx) => {
                                    const invName = inventory.find(i => i.id === ing.inventoryItemId)?.name || 'Unknown';
                                    return (
                                        <div key={idx} className="flex justify-between text-[10px] text-secondary">
                                            <span className="truncate max-w-[150px]">{invName}</span>
                                            <span className="font-mono">${ing.costSnapshot.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                                {item.ingredients.length > 3 && (
                                    <div className="text-[10px] text-secondary italic">
                                        + {item.ingredients.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MenuItemCard;
