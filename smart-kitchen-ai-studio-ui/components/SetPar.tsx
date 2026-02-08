import React, { useState } from 'react';
import { View, InventoryItem } from '../types';

interface SetParProps {
  onBack: () => void;
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
}

export const SetPar: React.FC<SetParProps> = ({ onBack, items, setItems }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const updatePar = (id: string, delta: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, par: Math.max(0, item.par + delta) } : item
    ));
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-white min-h-full flex flex-col font-display">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-5 py-3">
          <button onClick={onBack} className="text-[#1A1A1A] hover:bg-gray-100 p-2 -ml-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            <span>Home</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
          </button>
        </div>
        <div className="px-5 pt-2 pb-6">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-14 w-14 rounded-xl flex items-center justify-center bg-brand-green/20 text-black shrink-0">
              <span className="material-symbols-outlined text-[32px]">tune</span>
            </div>
            <div className="flex flex-col pt-1">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 leading-tight">Set Par</h1>
              <p className="text-gray-500 text-sm font-medium mt-0.5">Smart Kitchen AI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 py-2 flex flex-col gap-3">
        <div className="flex items-center w-full rounded-lg bg-white border border-gray-200 shadow-sm focus-within:ring-1 focus-within:ring-brand-green focus-within:border-brand-green transition-all">
          <div className="pl-3 flex items-center pointer-events-none text-gray-400">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-sm text-gray-900 placeholder-gray-400 focus:ring-0 p-3 h-11 outline-none" 
            placeholder="Search items..." 
            type="text"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shrink-0 shadow-sm">
            <span className="text-xs font-semibold text-gray-700">Category</span>
            <span className="material-symbols-outlined text-[16px] text-gray-400">expand_more</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shrink-0 shadow-sm">
            <span className="text-xs font-semibold text-gray-700">Location</span>
            <span className="material-symbols-outlined text-[16px] text-gray-400">expand_more</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all active:scale-95 group shadow-sm">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-brand-green/20 group-hover:text-green-700 transition-colors">
            <span className="material-symbols-outlined">photo_camera</span>
          </div>
          <span className="text-sm font-semibold text-gray-800">Take Picture</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all active:scale-95 group shadow-sm">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-brand-green/20 group-hover:text-green-700 transition-colors">
            <span className="material-symbols-outlined">upload_file</span>
          </div>
          <span className="text-sm font-semibold text-gray-800">Upload File</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 px-5 py-2 pb-10">
        <div className="flex items-center justify-between mb-4 pt-2 border-b border-gray-100 pb-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Items List</h3>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{filteredItems.length}</span>
        </div>
        
        <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-gray-400 mb-2 px-2 uppercase tracking-wide">
          <div className="col-span-6">Name</div>
          <div className="col-span-3 text-center">Category</div>
          <div className="col-span-3 text-right text-green-700">Par</div>
        </div>

        <div className="flex flex-col">
          {filteredItems.map(item => (
            <div key={item.id} className="group flex items-center justify-between py-3 border-b border-gray-100 hover:bg-brand-green/5 -mx-2 px-2 rounded-md transition-colors cursor-pointer">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">current: {item.currentStock} {item.unit}</p>
              </div>
              <div className="shrink-0 mr-2 w-16 text-center">
                <Badge category={item.category} />
              </div>
              <div className="shrink-0 flex items-center gap-1 justify-end w-20">
                <button onClick={() => updatePar(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-brand-green hover:text-black transition-colors">
                  <span className="material-symbols-outlined text-[16px]">remove</span>
                </button>
                <span className="text-sm font-bold text-gray-900 w-6 text-center">{item.par}</span>
                <button onClick={() => updatePar(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-brand-green hover:text-black transition-colors">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 mb-4">
          <button className="w-full bg-brand-green hover:bg-green-400 text-black font-bold text-base py-3.5 px-6 rounded-lg shadow-sm active:translate-y-0.5 transition-all flex items-center justify-center gap-2">
            <span>Save Changes</span>
            <span className="material-symbols-outlined text-[20px]">check</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const Badge: React.FC<{ category: string }> = ({ category }) => {
  let colors = "bg-gray-100 text-gray-700";
  if (category === 'Dairy') colors = "bg-yellow-100 text-yellow-800 ring-yellow-600/20";
  if (category === 'Produce') colors = "bg-green-100 text-green-800 ring-green-600/20";
  if (category === 'Pantry') colors = "bg-orange-100 text-orange-800 ring-orange-600/20";
  if (category === 'Bakery') colors = "bg-stone-100 text-stone-700 ring-stone-600/20";
  if (category === 'Canned') colors = "bg-red-100 text-red-700 ring-red-600/20";
  if (category === 'Spices') colors = "bg-blue-100 text-blue-700 ring-blue-600/20";
  
  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset w-full ${colors}`}>
      {category}
    </span>
  );
};
