
import React from 'react';
import { LayoutDashboard, Refrigerator, ChefHat, Store } from 'lucide-react';
import { ViewState } from '../types';

interface Props {
  view: ViewState;
  setView: (view: ViewState) => void;
  isManager: boolean;
}

const MobileNav: React.FC<Props> = ({ view, setView, isManager }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border pb-safe z-50 flex justify-around items-center h-16 shadow-lg">
      <button 
        onClick={() => setView(ViewState.DASHBOARD)}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
          view === ViewState.DASHBOARD ? 'text-accent' : 'text-secondary hover:text-primary'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Home</span>
      </button>

      <button 
        onClick={() => setView(ViewState.INVENTORY)}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
          view === ViewState.INVENTORY ? 'text-accent' : 'text-secondary hover:text-primary'
        }`}
      >
        <Refrigerator className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Items</span>
      </button>

      <button 
        onClick={() => setView(ViewState.CHEF)}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
          view === ViewState.CHEF ? 'text-accent' : 'text-secondary hover:text-primary'
        }`}
      >
        <ChefHat className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Chef</span>
      </button>

      {isManager && (
        <button 
          onClick={() => setView(ViewState.RESTAURANT)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            view === ViewState.RESTAURANT ? 'text-accent' : 'text-secondary hover:text-primary'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Ops</span>
        </button>
      )}
    </div>
  );
};

export default MobileNav;
