import { useState } from 'react';
import { ShoppingCart, Check, Plus, Truck, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export function ShoppingList() {
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>('Tesco');

  // Mock shopping list data grouped by supplier
  const shoppingList = [
    {
      supplier: 'Tesco',
      urgency: 'high',
      items: [
        { name: 'Whole Milk', needed: 10, unit: 'L', current: 2, par: 12, cost: 1.20, checked: false },
        { name: 'Cheddar Cheese', needed: 1.5, unit: 'kg', current: 2.5, par: 4, cost: 8.50, checked: false },
        { name: 'Tomatoes', needed: 2.5, unit: 'kg', current: 0.5, par: 3, cost: 2.50, checked: false },
      ],
    },
    {
      supplier: 'Brakes',
      urgency: 'medium',
      items: [
        { name: 'All-Purpose Flour', needed: 4, unit: 'kg', current: 1, par: 5, cost: 0.80, checked: false },
        { name: 'Olive Oil', needed: 1, unit: 'L', current: 3, par: 4, cost: 6.50, checked: false },
        { name: 'Chicken Breast', needed: 3, unit: 'kg', current: 1, par: 4, cost: 7.50, checked: false },
      ],
    },
    {
      supplier: 'Coffee Wholesale',
      urgency: 'high',
      items: [
        { name: 'Coffee Beans (Arabica)', needed: 1.7, unit: 'kg', current: 0.3, par: 2, cost: 15.50, checked: false },
        { name: 'Coffee Filters', needed: 200, unit: 'pcs', current: 50, par: 250, cost: 0.05, checked: false },
      ],
    },
    {
      supplier: 'Local Market',
      urgency: 'low',
      items: [
        { name: 'Fresh Basil', needed: 0.3, unit: 'kg', current: 0.1, par: 0.4, cost: 12.00, checked: false },
        { name: 'Lettuce', needed: 1, unit: 'kg', current: 0.5, par: 1.5, cost: 3.50, checked: false },
      ],
    },
  ];

  const [lists, setLists] = useState(shoppingList);

  const toggleItem = (supplierIndex: number, itemIndex: number) => {
    const newLists = [...lists];
    newLists[supplierIndex].items[itemIndex].checked = !newLists[supplierIndex].items[itemIndex].checked;
    setLists(newLists);
  };

  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'high') return 'bg-red-100 text-red-700 border-red-200';
    if (urgency === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getUrgencyLabel = (urgency: string) => {
    if (urgency === 'high') return 'Urgent';
    if (urgency === 'medium') return 'Medium';
    return 'Routine';
  };

  const calculateSupplierTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.needed * item.cost), 0);
  };

  const totalItems = lists.reduce((sum, supplier) => sum + supplier.items.length, 0);
  const checkedItems = lists.reduce((sum, supplier) => 
    sum + supplier.items.filter(item => item.checked).length, 0
  );
  const totalCost = lists.reduce((sum, supplier) => sum + calculateSupplierTotal(supplier.items), 0);

  return (
    <div className="pb-24 px-4 pt-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Shopping List</h1>
        <p className="text-gray-600">Generated from PAR levels and current stock</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
          <div className="text-xs text-gray-600">Total Items</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-blue-600">{checkedItems}/{totalItems}</div>
          <div className="text-xs text-gray-600">Checked</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">£{totalCost.toFixed(2)}</div>
          <div className="text-xs text-gray-600">Est. Total</div>
        </div>
      </div>

      {/* Shopping by Supplier */}
      <div className="space-y-3 mb-6">
        {lists.map((supplier, supplierIndex) => {
          const isExpanded = expandedSupplier === supplier.supplier;
          const supplierTotal = calculateSupplierTotal(supplier.items);
          const checkedCount = supplier.items.filter(item => item.checked).length;

          return (
            <div key={supplierIndex} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Supplier Header */}
              <button
                onClick={() => setExpandedSupplier(isExpanded ? null : supplier.supplier)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">{supplier.supplier}</div>
                    <div className="text-sm text-gray-600">
                      {supplier.items.length} items • £{supplierTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getUrgencyColor(supplier.urgency)}`}>
                    {getUrgencyLabel(supplier.urgency)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Items List */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-2">
                  {supplier.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      onClick={() => toggleItem(supplierIndex, itemIndex)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                        item.checked
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          item.checked
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300'
                        }`}>
                          {item.checked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold mb-1 ${item.checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {item.name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Need: {item.needed} {item.unit}</span>
                            <span className="text-gray-400">•</span>
                            <span>Stock: {item.current}/{item.par} {item.unit}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            £{(item.needed * item.cost).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            £{item.cost.toFixed(2)}/{item.unit}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}

                  <div className="pt-3 mt-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Supplier Total</span>
                    <span className="font-bold text-gray-900">£{supplierTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button className="py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          Add Item
        </button>
        <button className="py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Start Shopping
        </button>
      </div>

      {/* Info Banner */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <span className="font-semibold">Shopping Tip:</span> This list is auto-generated based on your PAR levels. Items are grouped by supplier for efficient ordering.
        </div>
      </div>
    </div>
  );
}
