
import React from 'react';
import { LayoutDashboard, Refrigerator, ChefHat, Store, ShoppingCart } from 'lucide-react';
import { ViewState } from '../types';

interface Props {
  view: ViewState;
  setView: (view: ViewState) => void;
  isManager: boolean;
}

const MobileNav: React.FC<Props> = ({ view, setView, isManager }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        <button
          onClick={() => setView(ViewState.DASHBOARD)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${view === ViewState.DASHBOARD
              ? 'text-slate-800'
              : 'text-gray-400 active:text-gray-600'
            }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${view === ViewState.DASHBOARD ? 'stroke-[2.5px]' : ''}`} />
          <span className="text-[10px] font-semibold mt-1">Home</span>
          {view === ViewState.DASHBOARD && <div className="absolute bottom-1 w-1 h-1 bg-slate-800 rounded-full" />}
        </button>

        <button
          onClick={() => setView(ViewState.INVENTORY)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${view === ViewState.INVENTORY
              ? 'text-slate-800'
              : 'text-gray-400 active:text-gray-600'
            }`}
        >
          <Refrigerator className={`w-5 h-5 ${view === ViewState.INVENTORY ? 'stroke-[2.5px]' : ''}`} />
          <span className="text-[10px] font-semibold mt-1">Items</span>
          {view === ViewState.INVENTORY && <div className="absolute bottom-1 w-1 h-1 bg-slate-800 rounded-full" />}
        </button>

        <button
          onClick={() => setView(ViewState.SHOPPING)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${view === ViewState.SHOPPING
              ? 'text-slate-800'
              : 'text-gray-400 active:text-gray-600'
            }`}
        >
          <ShoppingCart className={`w-5 h-5 ${view === ViewState.SHOPPING ? 'stroke-[2.5px]' : ''}`} />
          <span className="text-[10px] font-semibold mt-1">Shop</span>
          {view === ViewState.SHOPPING && <div className="absolute bottom-1 w-1 h-1 bg-slate-800 rounded-full" />}
        </button>

        <button
          onClick={() => setView(ViewState.CHEF)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${view === ViewState.CHEF
              ? 'text-slate-800'
              : 'text-gray-400 active:text-gray-600'
            }`}
        >
          <ChefHat className={`w-5 h-5 ${view === ViewState.CHEF ? 'stroke-[2.5px]' : ''}`} />
          <span className="text-[10px] font-semibold mt-1">Chef</span>
          {view === ViewState.CHEF && <div className="absolute bottom-1 w-1 h-1 bg-slate-800 rounded-full" />}
        </button>

        {isManager && (
          <button
            onClick={() => setView(ViewState.RESTAURANT)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${view === ViewState.RESTAURANT
                ? 'text-slate-800'
                : 'text-gray-400 active:text-gray-600'
              }`}
          >
            <Store className={`w-5 h-5 ${view === ViewState.RESTAURANT ? 'stroke-[2.5px]' : ''}`} />
            <span className="text-[10px] font-semibold mt-1">Ops</span>
            {view === ViewState.RESTAURANT && <div className="absolute bottom-1 w-1 h-1 bg-slate-800 rounded-full" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileNav;
