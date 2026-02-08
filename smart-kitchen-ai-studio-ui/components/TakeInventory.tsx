import React from 'react';
import { InventoryItem } from '../types';

interface TakeInventoryProps {
  onBack: () => void;
  items: InventoryItem[];
}

export const TakeInventory: React.FC<TakeInventoryProps> = ({ onBack, items }) => {
  return (
    <div className="bg-[#f6f8f6] min-h-full font-display text-[#111813]">
      <div className="flex items-center bg-white/95 backdrop-blur-sm p-4 pb-2 border-b border-gray-100 sticky top-0 z-20">
        <button onClick={onBack} className="flex items-center gap-2 cursor-pointer text-[#1A1A1A] hover:opacity-70 transition-opacity">
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span className="text-base font-bold leading-normal">Home</span>
        </button>
      </div>

      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-[#d1fbe0] p-3 rounded-xl shrink-0">
            <span className="material-symbols-outlined text-[#111813] text-[32px]">assignment</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[#111813] tracking-tight text-[28px] font-bold leading-tight">Take Inventory</h1>
            <p className="text-[#61896f] text-sm font-medium leading-normal mt-0.5">Smart Kitchen AI</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <label className="flex flex-col min-w-40 h-12 w-full">
          <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-gray-200 overflow-hidden shadow-sm">
            <div className="text-[#61896f] flex bg-gray-50 items-center justify-center pl-4 pr-1">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input className="form-input flex w-full min-w-0 flex-1 border-none bg-gray-50 text-[#111813] focus:outline-0 focus:ring-0 h-full placeholder:text-[#61896f] px-4 pl-2 text-base font-normal leading-normal outline-none" placeholder="Search items to count..."/>
          </div>
        </label>
      </div>

      <div className="flex gap-3 px-4 py-2 flex-wrap">
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 px-4 border border-gray-200 hover:bg-gray-200 transition-colors">
          <p className="text-[#111813] text-sm font-medium leading-normal">Category</p>
          <span className="material-symbols-outlined text-[18px]">expand_more</span>
        </button>
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 px-4 border border-gray-200 hover:bg-gray-200 transition-colors">
          <p className="text-[#111813] text-sm font-medium leading-normal">Location</p>
          <span className="material-symbols-outlined text-[18px]">expand_more</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 px-4 py-4">
        <div className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-white cursor-pointer hover:bg-[#d1fbe0]/30 transition-colors group">
          <span className="material-symbols-outlined text-[#111813] text-[40px] mb-2 group-hover:scale-110 transition-transform">qr_code_scanner</span>
          <span className="text-sm font-bold text-[#111813]">Scan QR Code</span>
        </div>
        <div className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-white cursor-pointer hover:bg-[#d1fbe0]/30 transition-colors group">
          <span className="material-symbols-outlined text-[#111813] text-[40px] mb-2 group-hover:scale-110 transition-transform">edit_note</span>
          <span className="text-sm font-bold text-[#111813]">Manual Entry</span>
        </div>
      </div>

      <div className="px-4 py-4 flex items-center justify-between border-b border-gray-200">
        <h3 className="text-[12px] font-bold tracking-widest text-[#61896f] uppercase">Inventory List</h3>
        <span className="bg-gray-200 text-[#111813] text-[11px] font-bold px-2 py-0.5 rounded-full">{items.length} ITEMS</span>
      </div>

      <div className="flex flex-col w-full px-4 pt-4 mb-24">
        <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase pb-2 tracking-wider">
          <div className="flex-[3]">Name</div>
          <div className="flex-[2]">Category</div>
          <div className="flex-[2] text-right">Count</div>
        </div>
        
        {items.map(item => (
           <div key={item.id} className="flex items-center py-4 border-b border-gray-200">
           <div className="flex-[3]">
             <p className="font-bold text-sm text-[#111813]">{item.name}</p>
           </div>
           <div className="flex-[2]">
             <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${getCategoryColor(item.category)}`}>
              {item.category}
             </span>
           </div>
           <div className="flex-[2] flex items-center justify-end gap-2">
             <button className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
               <span className="material-symbols-outlined text-[18px]">remove</span>
             </button>
             <span className="text-sm font-bold w-6 text-center">{item.currentStock}</span>
             <button className="w-7 h-7 flex items-center justify-center rounded-md bg-brand-green text-[#111813] hover:brightness-95 transition-all">
               <span className="material-symbols-outlined text-[18px]">add</span>
             </button>
           </div>
         </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 pb-8 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="max-w-md mx-auto">
            <button className="w-full h-14 bg-brand-green text-[#111813] font-bold text-lg rounded-xl flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-transform hover:brightness-105">
                <span className="material-symbols-outlined font-bold">check_circle</span>
                <span>Complete Audit</span>
            </button>
        </div>
      </div>
    </div>
  );
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Pantry': return 'bg-orange-100 text-orange-700';
    case 'Dairy': return 'bg-blue-100 text-blue-700';
    case 'Produce': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}
