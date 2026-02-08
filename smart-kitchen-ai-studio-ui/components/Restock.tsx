import React, { useState } from 'react';
import { InventoryItem } from '../types';

interface RestockProps {
  onBack: () => void;
  items: InventoryItem[];
}

export const Restock: React.FC<RestockProps> = ({ onBack, items }) => {
  const [cart, setCart] = useState<Record<string, number>>({});

  const updateCart = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const getRestockQty = (item: InventoryItem) => {
      // Default restock suggestion: par - current (if positive)
      const suggestion = Math.max(0, item.par - item.currentStock);
      return cart[item.id] !== undefined ? cart[item.id] : suggestion;
  };

  return (
    <div className="bg-white min-h-full font-display text-notion-text">
        <div className="flex items-center px-5 py-3 sticky top-0 bg-white z-10">
            <button onClick={onBack} className="hover:bg-gray-100 -ml-2 p-2 pr-3 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold text-[#1A1A1A] group">
                <span className="material-symbols-outlined text-[20px] text-[#1A1A1A]">arrow_back</span>
                <span className="text-[#1A1A1A]">Home</span>
            </button>
        </div>
        <div className="px-5 pt-2 pb-6">
            <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-brand-green/20 text-green-900 shadow-sm">
                    <span className="material-symbols-outlined text-[32px]">inventory_2</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 leading-tight">Restock</h1>
                    <p className="text-gray-500 text-sm font-medium mt-0.5">Smart Kitchen AI</p>
                </div>
            </div>
        </div>

        {/* Search */}
        <div className="px-5 py-2 flex flex-col gap-3">
            <div className="flex items-center w-full rounded-lg bg-white border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-green-100 focus-within:border-green-400 transition-all">
                <div className="pl-3 flex items-center pointer-events-none text-gray-400">
                    <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input className="w-full bg-transparent border-none text-sm text-gray-900 placeholder-gray-400 focus:ring-0 p-3 h-11 outline-none" placeholder="Search items..." type="text"/>
            </div>
        </div>

        {/* Buttons */}
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-100 bg-white hover:border-green-200 hover:bg-green-50/50 transition-all active:scale-95 group shadow-sm">
                <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-brand-green/20 group-hover:text-green-900 transition-colors">
                    <span className="material-symbols-outlined">barcode_scanner</span>
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-green-800">Scan Barcode</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-100 bg-white hover:border-green-200 hover:bg-green-50/50 transition-all active:scale-95 group shadow-sm">
                <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-brand-green/20 group-hover:text-green-900 transition-colors">
                    <span className="material-symbols-outlined">upload_file</span>
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-green-800">Upload Invoice</span>
            </button>
        </div>

        {/* List */}
        <div className="flex-1 px-5 py-2 pb-8">
            <div className="flex items-center justify-between mb-4 pt-2 border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Items List</h3>
                <span className="text-xs font-bold text-green-700 bg-brand-green/20 px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            
            <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-gray-400 mb-2 px-2 uppercase tracking-wide">
                <div className="col-span-6">Name</div>
                <div className="col-span-3 text-center">Category</div>
                <div className="col-span-3 text-right">Qty</div>
            </div>

            <div className="flex flex-col">
                {items.map(item => (
                     <div key={item.id} className="group flex items-center justify-between py-3 border-b border-gray-100 hover:bg-green-50/30 -mx-2 px-2 rounded-md transition-colors cursor-pointer">
                     <div className="flex-1 min-w-0 pr-2">
                         <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                         <p className="text-[11px] text-gray-400 truncate mt-0.5">Par: {item.par} {item.unit}</p>
                     </div>
                     <div className="shrink-0 mr-2 w-16 text-center">
                        <CategoryBadge category={item.category} />
                     </div>
                     <div className="shrink-0 flex items-center gap-1 justify-end w-20">
                         <button onClick={() => updateCart(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-green-100 hover:text-green-700 transition-colors">
                             <span className="material-symbols-outlined text-[16px]">remove</span>
                         </button>
                         <span className="text-sm font-bold text-gray-900 w-6 text-center">{getRestockQty(item)}</span>
                         <button onClick={() => updateCart(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-green-100 hover:text-green-700 transition-colors">
                             <span className="material-symbols-outlined text-[16px]">add</span>
                         </button>
                     </div>
                 </div>
                ))}
            </div>
        </div>
    </div>
  );
};

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
    let classes = "bg-gray-100 text-gray-800";
    if (category === 'Dairy') classes = "bg-yellow-100 text-yellow-800 ring-yellow-600/20";
    if (category === 'Produce') classes = "bg-green-100 text-green-800 ring-green-600/20";
    if (category === 'Pantry') classes = "bg-orange-100 text-orange-800 ring-orange-600/20";
    if (category === 'Bakery') classes = "bg-stone-100 text-stone-700 ring-stone-600/20";
    if (category === 'Canned') classes = "bg-red-100 text-red-700 ring-red-600/20";
    if (category === 'Spices') classes = "bg-blue-100 text-blue-700 ring-blue-600/20";

    return (
        <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset w-full ${classes}`}>
            {category}
        </span>
    );
}
