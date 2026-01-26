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
  'Meat': {
    bg: 'bg-[#ffe5e5]',
    text: 'text-[#8b3a3a]',
    border: 'border-[#ffc9c9]',
    emoji: '🥩'
  },
  'Seafood': {
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
  'Dry Goods': {
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
  }
};

export const getCategoryStyle = (category: string): CategoryStyle => {
  return categoryColors[category] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    emoji: '📦'
  };
};
