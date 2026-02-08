import React from 'react';
import { InventoryItem } from '../types';

interface OrderProps {
  onBack: () => void;
  items: InventoryItem[];
}

export const Order: React.FC<OrderProps> = ({ onBack, items }) => {
  return (
    <div className="bg-[#f6f8f6] text-[#111813] min-h-full pb-32 font-display">
      <div className="sticky top-0 z-50 bg-[#f6f8f6]/95 backdrop-blur-md">
        <div className="flex items-center px-4 py-3 max-w-md mx-auto">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#111813] hover:opacity-70 transition-opacity group">
            <span className="material-symbols-outlined text-[24px]">home</span>
            <span className="text-[15px] font-bold leading-normal">Home</span>
            <span className="material-symbols-outlined text-[20px] text-[#61896f]">expand_more</span>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <div className="px-4 pt-2 flex items-center gap-4">
          <div className="bg-[#c9f5d6] w-16 h-16 rounded-2xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-black text-[32px]">shopping_cart</span>
          </div>
          <div className="flex flex-col items-start">
            <h1 className="text-[#111813] text-[28px] font-extrabold leading-tight tracking-tight">Order</h1>
            <p className="text-[#61896f] text-sm font-medium mt-0.5">Smart Kitchen AI</p>
          </div>
        </div>

        <div className="px-4 py-6">
          <label className="flex flex-col w-full">
            <div className="flex w-full flex-1 items-stretch rounded-xl h-12 shadow-sm ring-1 ring-black/5 bg-white">
              <div className="text-[#61896f] flex border-none bg-white items-center justify-center pl-4 rounded-l-xl">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input className="form-input flex w-full flex-1 border-none bg-white focus:ring-0 h-full placeholder:text-[#61896f] px-3 rounded-r-xl text-base font-normal text-[#111813] outline-none" placeholder="Search items to order..."/>
            </div>
          </label>
        </div>

        <div className="flex gap-3 px-4 pb-6">
          <button className="flex-1 flex h-12 items-center justify-between px-4 rounded-xl bg-white border border-gray-100 shadow-sm active:bg-gray-50 transition-colors">
            <span className="text-[#111813] text-[15px] font-semibold">Category</span>
            <span className="material-symbols-outlined text-[#61896f] text-xl">expand_more</span>
          </button>
          <button className="flex-1 flex h-12 items-center justify-between px-4 rounded-xl bg-white border border-gray-100 shadow-sm active:bg-gray-50 transition-colors">
            <span className="text-[#111813] text-[15px] font-semibold">Vendor</span>
            <span className="material-symbols-outlined text-[#61896f] text-xl">expand_more</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 px-4 pb-8">
          <div className="bg-white h-32 rounded-xl border-2 border-[#c9f5d6] flex flex-col items-center justify-center text-center gap-3 cursor-pointer active:scale-[0.98] transition-all shadow-sm">
            <div className="bg-[#c9f5d6] w-10 h-10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-green-700 text-xl">auto_awesome</span>
            </div>
            <p className="text-[15px] font-bold text-[#111813] leading-tight">Auto-fill from Par</p>
          </div>
          <div className="bg-white h-32 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center gap-3 cursor-pointer active:scale-[0.98] transition-all shadow-sm">
            <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-500 text-xl">bolt</span>
            </div>
            <p className="text-[15px] font-bold text-[#111813] leading-tight">Quick Order</p>
          </div>
        </div>

        <div className="px-4 pb-8">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-[#111813] text-lg font-bold">ORDER LIST</h2>
            <span className="bg-brand-green text-black px-3 py-1 rounded-full text-xs font-bold shadow-sm">{items.length} items</span>
          </div>

          <div className="grid grid-cols-12 py-2 text-[10px] font-bold text-[#61896f] tracking-widest uppercase">
            <div className="col-span-6">NAME</div>
            <div className="col-span-3">CATEGORY</div>
            <div className="col-span-3 text-right">QTY</div>
          </div>

          <div className="space-y-1">
            {items.map(item => (
                <div key={item.id} className="grid grid-cols-12 items-center py-4 border-b border-gray-100/50">
                <div className="col-span-6 pr-2">
                  <p className="text-[15px] font-bold text-[#111813] leading-tight mb-0.5">{item.name}</p>
                  <p className="text-[11px] text-[#61896f]">{item.supplier || 'Generic Vendor'}</p>
                </div>
                <div className="col-span-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${getBadgeColor(item.category)}`}>{item.category}</span>
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <button className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-base">remove</span>
                  </button>
                  <span className="text-[15px] font-bold w-4 text-center tabular-nums">4</span>
                  <button className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center hover:brightness-105 active:scale-95 transition-all shadow-sm">
                    <span className="material-symbols-outlined text-base text-black">add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#f6f8f6]/95 backdrop-blur-md border-t border-green-100 p-4 z-50 pb-8">
        <div className="max-w-md mx-auto">
          <button className="w-full h-14 bg-brand-green hover:bg-green-400 text-[#111813] font-extrabold text-lg rounded-xl shadow-[0_8px_20px_rgba(19,236,91,0.25)] flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined">shopping_cart_checkout</span>
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
};

const getBadgeColor = (cat: string) => {
    switch(cat) {
        case 'Dairy': return 'bg-blue-50 text-blue-600';
        case 'Produce': return 'bg-orange-50 text-orange-600';
        case 'Dry Goods': return 'bg-yellow-50 text-yellow-700';
        case 'Oils': return 'bg-green-50 text-green-700';
        default: return 'bg-gray-50 text-gray-600';
    }
}
