import { useState } from 'react';
import { Search, Filter, Package, MapPin, Calendar, Plus } from 'lucide-react';
import { getCategoryStyle } from '../utils/categoryColors';

export function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Mock inventory data
  const categories = ['all', 'Dairy', 'Produce', 'Dry Goods', 'Meat', 'Beverages', 'Seafood'];
  const locations = ['all', 'Fridge A', 'Fridge B', 'Dry Storage', 'Freezer', 'Coffee Station'];

  const inventoryItems = [
    {
      id: 1,
      name: 'Whole Milk',
      category: 'Dairy',
      quantity: 2,
      unit: 'L',
      parLevel: 12,
      cost: 1.2,
      location: 'Fridge A',
      expiryDate: '2026-01-20',
      supplier: 'Tesco',
      status: 'critical'
    },
    {
      id: 2,
      name: 'All-Purpose Flour',
      category: 'Dry Goods',
      quantity: 1,
      unit: 'kg',
      parLevel: 5,
      cost: 0.8,
      location: 'Dry Storage',
      expiryDate: '2026-06-15',
      supplier: 'Brakes',
      status: 'low'
    },
    {
      id: 3,
      name: 'Tomatoes',
      category: 'Produce',
      quantity: 0.5,
      unit: 'kg',
      parLevel: 3,
      cost: 2.5,
      location: 'Fridge B',
      expiryDate: '2026-01-18',
      supplier: 'Local Market',
      status: 'low'
    },
    {
      id: 4,
      name: 'Coffee Beans (Arabica)',
      category: 'Beverages',
      quantity: 0.3,
      unit: 'kg',
      parLevel: 2,
      cost: 15.5,
      location: 'Coffee Station',
      expiryDate: '2026-03-01',
      supplier: 'Coffee Wholesale',
      status: 'critical'
    },
    {
      id: 5,
      name: 'Cheddar Cheese',
      category: 'Dairy',
      quantity: 2.5,
      unit: 'kg',
      parLevel: 3,
      cost: 8.5,
      location: 'Fridge A',
      expiryDate: '2026-02-10',
      supplier: 'Tesco',
      status: 'ok'
    },
    {
      id: 6,
      name: 'Olive Oil',
      category: 'Dry Goods',
      quantity: 3,
      unit: 'L',
      parLevel: 4,
      cost: 6.5,
      location: 'Dry Storage',
      expiryDate: '2026-12-31',
      supplier: 'Brakes',
      status: 'ok'
    },
    {
      id: 7,
      name: 'Salmon Fillets',
      category: 'Seafood',
      quantity: 1.2,
      unit: 'kg',
      parLevel: 2,
      cost: 18.5,
      location: 'Freezer',
      expiryDate: '2026-02-01',
      supplier: 'Fresh Fish Co',
      status: 'ok'
    },
  ];

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesLocation = selectedLocation === 'all' || item.location === selectedLocation;
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const getStatusColor = (status: string) => {
    if (status === 'critical') return 'bg-[#ffe5e5] text-[#8b3a3a] border-[#ffc9c9]';
    if (status === 'low') return 'bg-[#fff3e0] text-[#9a6324] border-[#ffe0b2]';
    return 'bg-[#d3e5d0] text-[#2d5f2e] border-[#b8d4b5]';
  };

  const getStockPercentage = (quantity: number, par: number) => {
    return Math.min((quantity / par) * 100, 100);
  };

  return (
    <div className="pb-24 px-4 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#37352f]">Inventory</h1>
          <p className="text-sm text-[#787774]">{filteredItems.length} items</p>
        </div>
        <button className="bg-[#37352f] text-white p-3 rounded-lg hover:bg-[#1f1e1b] transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9b9a97]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search inventory..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-[#e9e9e7] rounded-lg focus:outline-none focus:border-[#37352f]"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 bg-white border border-[#e9e9e7] rounded-lg px-4 py-2 flex-shrink-0">
          <Filter className="w-4 h-4 text-[#787774]" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm font-medium text-[#37352f] bg-transparent border-none outline-none cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-[#e9e9e7] rounded-lg px-4 py-2 flex-shrink-0">
          <MapPin className="w-4 h-4 text-[#787774]" />
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="text-sm font-medium text-[#37352f] bg-transparent border-none outline-none cursor-pointer"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc === 'all' ? 'All Locations' : loc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const stockPercentage = getStockPercentage(item.quantity, item.parLevel);
          const categoryStyle = getCategoryStyle(item.category);
          
          return (
            <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm border border-[#e9e9e7]">
              {/* Item Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-[#37352f] mb-2">{item.name}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border} px-2.5 py-1 rounded-md font-medium flex items-center gap-1`}>
                      <span>{categoryStyle.emoji}</span>
                      <span>{item.category}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#787774]">
                      <MapPin className="w-3 h-3" />
                      {item.location}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${getStatusColor(item.status)}`}>
                  {item.status === 'critical' ? 'Critical' : item.status === 'low' ? 'Low Stock' : 'In Stock'}
                </span>
              </div>

              {/* Stock Level */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-[#787774]">Stock Level</span>
                  <span className="font-semibold text-[#37352f]">
                    {item.quantity} / {item.parLevel} {item.unit}
                  </span>
                </div>
                <div className="h-1.5 bg-[#f7f6f3] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      stockPercentage < 30 ? 'bg-[#eb5757]' :
                      stockPercentage < 60 ? 'bg-[#f2994a]' :
                      'bg-[#27ae60]'
                    }`}
                    style={{ width: `${stockPercentage}%` }}
                  />
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#e9e9e7]">
                <div>
                  <div className="text-xs text-[#787774] mb-0.5">Cost</div>
                  <div className="text-sm font-semibold text-[#37352f]">£{item.cost}</div>
                </div>
                <div>
                  <div className="text-xs text-[#787774] mb-0.5">Supplier</div>
                  <div className="text-sm font-semibold text-[#37352f] truncate">{item.supplier}</div>
                </div>
                <div>
                  <div className="text-xs text-[#787774] mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expires
                  </div>
                  <div className="text-sm font-semibold text-[#37352f]">
                    {new Date(item.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-[#e9e9e7] mx-auto mb-3" />
          <p className="text-[#787774]">No items found</p>
        </div>
      )}
    </div>
  );
}
