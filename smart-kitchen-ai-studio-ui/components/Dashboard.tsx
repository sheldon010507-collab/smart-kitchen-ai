import React from 'react';
import { View } from '../types';

interface DashboardProps {
  onChangeView: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onChangeView }) => {
  return (
    <div className="flex flex-col h-full bg-white text-[#37352f]">
      {/* Header */}
      <header className="pt-6 px-6 pb-2 shrink-0 relative z-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-green/20 rounded-lg flex items-center justify-center text-brand-green-dark shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[22px]">chef_hat</span>
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-lg font-bold text-gray-800 leading-none">Smart Kitchen AI</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center bg-[#f7f6f3] hover:bg-notion-hover rounded-md transition-colors text-notion-text-gray">
              <span className="material-symbols-outlined text-[20px]">dark_mode</span>
            </button>
            <button className="w-9 h-9 flex items-center justify-center bg-[#f7f6f3] hover:bg-notion-hover rounded-md transition-colors text-notion-text-gray cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
          </div>
        </div>

        <div className="mb-4 px-1">
          <h1 className="text-2xl font-bold text-notion-text mb-2 tracking-tight">Dashboard</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-notion-text-gray mb-4">
            <div className="flex items-center">
              <span className="flex items-center gap-1 mr-1"><span className="material-symbols-outlined text-[15px]">person</span> Owner</span>
              <span className="text-notion-text flex items-center gap-1 font-medium"><span className="w-4 h-4 bg-brand-green text-black rounded-full text-[9px] flex items-center justify-center font-bold">JD</span> John Doe</span>
            </div>
            <div className="flex items-center">
              <span className="flex items-center gap-1 mr-1"><span className="material-symbols-outlined text-[15px]">update</span> Updated</span>
              <span className="text-notion-text font-medium">10:42 AM</span>
            </div>
            <div className="flex items-center">
              <span className="flex items-center gap-1 mr-1"><span className="material-symbols-outlined text-[15px]">label</span> Status</span>
              <span className="bg-brand-green/30 text-green-800 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide">Operational</span>
            </div>
          </div>
          <hr className="border-notion-border mb-4"/>
          
          <div className="relative group mb-4">
            <span className="absolute inset-y-0 left-3 flex items-center text-notion-text-gray">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-notion-border rounded-xl text-sm placeholder-notion-text-gray focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-colors outline-none" 
              placeholder="Search actions..." 
              type="text"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button className="whitespace-nowrap px-4 py-1 bg-brand-green rounded-full text-[12px] text-black hover:bg-brand-green/80 transition-colors border border-transparent font-semibold shadow-sm">
              All
            </button>
            <button className="whitespace-nowrap px-4 py-1 bg-white border border-notion-border rounded-full text-[12px] text-notion-text hover:bg-notion-hover transition-colors">
              Inventory
            </button>
            <button className="whitespace-nowrap px-4 py-1 bg-white border border-notion-border rounded-full text-[12px] text-notion-text hover:bg-notion-hover transition-colors">
              Staff
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="px-6 flex-1 flex flex-col min-h-0 justify-between pb-6 overflow-y-auto no-scrollbar">
        <section className="flex-1 flex flex-col justify-start mb-4">
          <div className="grid grid-cols-2 gap-4">
            <DashboardCard icon="tune" label="Set Par" onClick={() => onChangeView('set-par')} />
            <DashboardCard icon="sync_alt" label="Restock" onClick={() => onChangeView('restock')} />
            <DashboardCard icon="inventory_2" label="Take Inventory" onClick={() => onChangeView('take-inventory')} />
            <DashboardCard icon="shopping_cart" label="Order" onClick={() => onChangeView('order')} />
            <DashboardCard icon="settings" label="Operations" onClick={() => onChangeView('operations')} />
            <DashboardCard icon="auto_awesome" label="AI Chef" onClick={() => onChangeView('ai-chef')} />
          </div>
        </section>

        {/* Notes */}
        <section className="shrink-0 mb-2">
          <h3 className="text-sm font-bold text-notion-text mb-2 px-1">Notes</h3>
          <div className="bg-brand-green/10 p-4 rounded-xl border border-brand-green/20 shadow-sm">
            <p className="text-[13px] leading-snug text-notion-text">
              Check milk expiry dates (Tuesday delivery) and confirm napkin supplier contact details before noon.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

const DashboardCard: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-row items-center justify-start px-5 py-6 bg-white border border-notion-border rounded-2xl shadow-sm hover:bg-notion-hover hover:shadow-md transition-all active:scale-[0.98] group h-full w-full"
  >
    <span className="material-symbols-outlined text-[32px] mr-3 text-notion-text opacity-80 group-hover:text-brand-green-dark group-hover:opacity-100 transition-all">
      {icon}
    </span>
    <span className="font-semibold text-notion-text text-[16px] text-left leading-tight">
      {label}
    </span>
  </button>
);
