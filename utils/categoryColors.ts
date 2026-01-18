/**
 * Food Category Colors Utility
 * Notion-inspired color scheme for inventory categories
 */

export interface CategoryStyle {
    bg: string;
    text: string;
    border: string;
    emoji: string;
}

export const categoryColors: Record<string, CategoryStyle> = {
    'Dairy': {
        bg: 'bg-[#f7f3ef]',
        text: 'text-[#8b7355]',
        border: 'border-[#e8dfd5]',
        emoji: '🥛'
    },
    'Produce': {
        bg: 'bg-[#d3e5d0]',
        text: 'text-[#2d5f2e]',
        border: 'border-[#b8d4b5]',
        emoji: '🥬'
    },
    'Vegetables': {
        bg: 'bg-[#d3e5d0]',
        text: 'text-[#2d5f2e]',
        border: 'border-[#b8d4b5]',
        emoji: '🥬'
    },
    'Fruits': {
        bg: 'bg-[#ffe5e5]',
        text: 'text-[#8b3a3a]',
        border: 'border-[#ffc9c9]',
        emoji: '🍎'
    },
    'Meat': {
        bg: 'bg-[#ffe5e5]',
        text: 'text-[#8b3a3a]',
        border: 'border-[#ffc9c9]',
        emoji: '🥩'
    },
    'Poultry': {
        bg: 'bg-[#ffe5e5]',
        text: 'text-[#8b3a3a]',
        border: 'border-[#ffc9c9]',
        emoji: '🍗'
    },
    'Seafood': {
        bg: 'bg-[#e3f2fd]',
        text: 'text-[#1565c0]',
        border: 'border-[#bbdefb]',
        emoji: '🐟'
    },
    'Fish': {
        bg: 'bg-[#e3f2fd]',
        text: 'text-[#1565c0]',
        border: 'border-[#bbdefb]',
        emoji: '🐟'
    },
    'Beverages': {
        bg: 'bg-[#f5ebe0]',
        text: 'text-[#6b4423]',
        border: 'border-[#e8d4bf]',
        emoji: '☕'
    },
    'Drinks': {
        bg: 'bg-[#f5ebe0]',
        text: 'text-[#6b4423]',
        border: 'border-[#e8d4bf]',
        emoji: '☕'
    },
    'Dry Goods': {
        bg: 'bg-[#f9f5e8]',
        text: 'text-[#796b4a]',
        border: 'border-[#ede6d0]',
        emoji: '🌾'
    },
    'Pantry': {
        bg: 'bg-[#f9f5e8]',
        text: 'text-[#796b4a]',
        border: 'border-[#ede6d0]',
        emoji: '🌾'
    },
    'Frozen': {
        bg: 'bg-[#e8f4f8]',
        text: 'text-[#0d5f7f]',
        border: 'border-[#c8e6f0]',
        emoji: '❄️'
    },
    'Condiments': {
        bg: 'bg-[#fff3e0]',
        text: 'text-[#9a6324]',
        border: 'border-[#ffe0b2]',
        emoji: '🧂'
    },
    'Sauces': {
        bg: 'bg-[#fff3e0]',
        text: 'text-[#9a6324]',
        border: 'border-[#ffe0b2]',
        emoji: '🧂'
    },
    'Bakery': {
        bg: 'bg-[#f9f5e8]',
        text: 'text-[#796b4a]',
        border: 'border-[#ede6d0]',
        emoji: '🍞'
    },
    'Eggs': {
        bg: 'bg-[#f7f3ef]',
        text: 'text-[#8b7355]',
        border: 'border-[#e8dfd5]',
        emoji: '🥚'
    },
};

/**
 * Get category style with fallback for unknown categories
 */
export const getCategoryStyle = (category: string): CategoryStyle => {
    // Try exact match first
    if (categoryColors[category]) {
        return categoryColors[category];
    }

    // Try case-insensitive match
    const lowerCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(categoryColors)) {
        if (key.toLowerCase() === lowerCategory) {
            return value;
        }
    }

    // Try partial match
    for (const [key, value] of Object.entries(categoryColors)) {
        if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
            return value;
        }
    }

    // Default fallback
    return {
        bg: 'bg-[#f7f6f3]',
        text: 'text-[#37352f]',
        border: 'border-[#e9e9e7]',
        emoji: '📦'
    };
};

/**
 * Get status badge style
 */
export type StockStatus = 'critical' | 'low' | 'ok';

export const getStatusStyle = (status: StockStatus): { bg: string; text: string; border: string; label: string } => {
    switch (status) {
        case 'critical':
            return {
                bg: 'bg-[#ffe5e5]',
                text: 'text-[#8b3a3a]',
                border: 'border-[#ffc9c9]',
                label: 'Critical'
            };
        case 'low':
            return {
                bg: 'bg-[#fff3e0]',
                text: 'text-[#9a6324]',
                border: 'border-[#ffe0b2]',
                label: 'Low Stock'
            };
        case 'ok':
        default:
            return {
                bg: 'bg-[#d3e5d0]',
                text: 'text-[#2d5f2e]',
                border: 'border-[#b8d4b5]',
                label: 'In Stock'
            };
    }
};

/**
 * Calculate stock status from quantity and par level
 */
export const getStockStatus = (quantity: number, parLevel: number): StockStatus => {
    const percentage = (quantity / parLevel) * 100;
    if (percentage < 30) return 'critical';
    if (percentage < 60) return 'low';
    return 'ok';
};

/**
 * Get progress bar color based on percentage
 */
export const getProgressBarColor = (percentage: number): string => {
    if (percentage < 30) return 'bg-[#eb5757]';
    if (percentage < 60) return 'bg-[#f2994a]';
    return 'bg-[#27ae60]';
};
