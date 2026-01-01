/**
 * MenuList Component
 * 
 * Displays menu items grouped by category
 */

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { MenuItem, InventoryItem } from '../../../types';
import { MenuItemCard } from './MenuItemCard';

interface MenuListProps {
    menu: MenuItem[];
    inventory: InventoryItem[];
    isStaff: boolean;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
}

// Category display order
const CATEGORY_ORDER = ['Starter', 'Main', 'Lunch', 'Dessert', 'Beverage', 'Drink', 'Food', 'Other'];

export function MenuList({
    menu,
    inventory,
    isStaff,
    onEdit,
    onDelete,
}: MenuListProps) {
    // Group menu items by category
    const groupedMenu = menu.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    // Get ordered categories that have items
    const categoriesToDisplay = Array.from(
        new Set([...CATEGORY_ORDER, ...Object.keys(groupedMenu)])
    ).filter(c => groupedMenu[c] && groupedMenu[c].length > 0);

    // Empty state
    if (menu.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-background rounded-xl border border-dashed border-border">
                <div className="mb-4">
                    <ImageIcon className="w-10 h-10 text-border" />
                </div>
                <p className="text-base font-medium text-secondary">No menu items added.</p>
            </div>
        );
    }

    return (
        <div className={isStaff ? 'w-full space-y-8' : 'lg:col-span-2 space-y-10'}>
            {categoriesToDisplay.map(category => (
                <div key={category} className="space-y-4">
                    {/* Category Header */}
                    <h4 className="text-sm font-bold text-secondary uppercase tracking-widest border-b border-dashed border-border pb-2 flex items-center">
                        {category}
                        <span className="ml-2 bg-gray-100 text-secondary text-[10px] px-1.5 py-0.5 rounded-full border border-border">
                            {groupedMenu[category].length}
                        </span>
                    </h4>

                    {/* Menu Grid */}
                    <div className={isStaff
                        ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4'
                        : 'grid grid-cols-1 md:grid-cols-2 gap-8'
                    }>
                        {groupedMenu[category].map(item => (
                            <MenuItemCard
                                key={item.id}
                                item={item}
                                inventory={inventory}
                                isStaff={isStaff}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default MenuList;
