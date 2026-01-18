import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { getCategoryStyle } from '../utils/categoryColors';

export function Menu() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'Starters', 'Mains', 'Desserts', 'Beverages'];

  const menuItems = [
    {
      id: 1,
      name: 'Caesar Salad',
      category: 'Starters',
      price: 8.50,
      cost: 2.30,
      margin: 73,
      ingredients: [
        { name: 'Lettuce', quantity: 100, unit: 'g', category: 'Produce' },
        { name: 'Parmesan', quantity: 30, unit: 'g', category: 'Dairy' },
        { name: 'Croutons', quantity: 40, unit: 'g', category: 'Dry Goods' },
        { name: 'Caesar Dressing', quantity: 50, unit: 'ml', category: 'Condiments' },
      ],
      popularity: 'high'
    },
    {
      id: 2,
      name: 'Margherita Pizza',
      category: 'Mains',
      price: 12.00,
      cost: 3.80,
      margin: 68,
      ingredients: [
        { name: 'Pizza Dough', quantity: 250, unit: 'g', category: 'Dry Goods' },
        { name: 'Tomato Sauce', quantity: 80, unit: 'ml', category: 'Condiments' },
        { name: 'Mozzarella', quantity: 120, unit: 'g', category: 'Dairy' },
        { name: 'Basil', quantity: 10, unit: 'g', category: 'Produce' },
      ],
      popularity: 'high'
    },
    {
      id: 3,
      name: 'Grilled Chicken',
      category: 'Mains',
      price: 15.50,
      cost: 5.20,
      margin: 66,
      ingredients: [
        { name: 'Chicken Breast', quantity: 200, unit: 'g', category: 'Meat' },
        { name: 'Olive Oil', quantity: 15, unit: 'ml', category: 'Condiments' },
        { name: 'Mixed Vegetables', quantity: 150, unit: 'g', category: 'Produce' },
        { name: 'Herbs', quantity: 5, unit: 'g', category: 'Produce' },
      ],
      popularity: 'medium'
    },
    {
      id: 4,
      name: 'Tiramisu',
      category: 'Desserts',
      price: 6.50,
      cost: 1.80,
      margin: 72,
      ingredients: [
        { name: 'Mascarpone', quantity: 100, unit: 'g', category: 'Dairy' },
        { name: 'Ladyfingers', quantity: 80, unit: 'g', category: 'Dry Goods' },
        { name: 'Coffee', quantity: 50, unit: 'ml', category: 'Beverages' },
        { name: 'Cocoa', quantity: 10, unit: 'g', category: 'Condiments' },
      ],
      popularity: 'medium'
    },
    {
      id: 5,
      name: 'Cappuccino',
      category: 'Beverages',
      price: 3.50,
      cost: 0.60,
      margin: 83,
      ingredients: [
        { name: 'Coffee Beans', quantity: 18, unit: 'g', category: 'Beverages' },
        { name: 'Whole Milk', quantity: 150, unit: 'ml', category: 'Dairy' },
      ],
      popularity: 'high'
    },
  ];

  const filteredItems = menuItems.filter(item => 
    selectedCategory === 'all' || item.category === selectedCategory
  );

  const getPopularityStyle = (popularity: string) => {
    if (popularity === 'high') return { bg: 'bg-[#d3e5d0]', text: 'text-[#2d5f2e]', border: 'border-[#b8d4b5]', emoji: '🔥' };
    if (popularity === 'medium') return { bg: 'bg-[#fff3e0]', text: 'text-[#9a6324]', border: 'border-[#ffe0b2]', emoji: '📊' };
    return { bg: 'bg-[#f7f6f3]', text: 'text-[#787774]', border: 'border-[#e9e9e7]', emoji: '📉' };
  };

  return (
    <div className="pb-24 px-4 pt-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#37352f]">Menu Engineering</h1>
          <p className="text-sm text-[#787774]">{filteredItems.length} items</p>
        </div>
        <button className="bg-[#37352f] text-white p-3 rounded-lg hover:bg-[#1f1e1b] transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex-shrink-0 transition-colors ${
              selectedCategory === cat
                ? 'bg-[#37352f] text-white'
                : 'bg-white text-[#37352f] border border-[#e9e9e7] hover:border-[#9b9a97]'
            }`}
          >
            {cat === 'all' ? 'All Items' : cat}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const popularityStyle = getPopularityStyle(item.popularity);
          
          return (
            <div key={item.id} className="bg-white rounded-lg p-5 shadow-sm border border-[#e9e9e7]">
              {/* Item Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-[#37352f]">{item.name}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${popularityStyle.bg} ${popularityStyle.text} ${popularityStyle.border}`}>
                      {popularityStyle.emoji} {item.popularity === 'high' ? 'Popular' : item.popularity === 'medium' ? 'Regular' : 'Low'}
                    </span>
                  </div>
                  <span className="text-xs bg-[#f7f6f3] text-[#787774] px-2.5 py-1 rounded-md border border-[#e9e9e7]">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Pricing & Margin */}
              <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-[#f7f6f3] rounded-lg">
                <div>
                  <div className="text-xs text-[#787774] mb-1">Sell Price</div>
                  <div className="font-bold text-[#37352f]">£{item.price.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#787774] mb-1">Cost</div>
                  <div className="font-bold text-[#37352f]">£{item.cost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#787774] mb-1">Profit</div>
                  <div className="font-bold text-[#27ae60]">£{(item.price - item.cost).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#787774] mb-1">Margin</div>
                  <div className="font-bold text-[#1565c0]">{item.margin}%</div>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#37352f] mb-2">
                  <Package className="w-4 h-4" />
                  Ingredients ({item.ingredients.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {item.ingredients.map((ingredient, index) => {
                    const catStyle = getCategoryStyle(ingredient.category);
                    return (
                      <div key={index} className={`text-sm ${catStyle.bg} ${catStyle.text} border ${catStyle.border} rounded-lg px-3 py-2`}>
                        <div className="flex items-center gap-1">
                          <span>{catStyle.emoji}</span>
                          <span className="font-medium">{ingredient.name}</span>
                        </div>
                        <div className="text-xs opacity-75 mt-0.5">{ingredient.quantity}{ingredient.unit}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
