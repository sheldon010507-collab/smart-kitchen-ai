
import React from 'react';
import { LayoutDashboard, Refrigerator, ChefHat, Store, ShoppingCart } from 'lucide-react';
import { ViewState } from '../types';

interface Props {
  view: ViewState;
  setView: (view: ViewState) => void;
  isManager: boolean;
}

const MobileNav: React.FC<Props> = ({ view, setView, isManager }) => {
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Home', icon: LayoutDashboard },
    { id: ViewState.INVENTORY, label: 'Items', icon: Refrigerator },
    { id: ViewState.SHOPPING, label: 'Shop', icon: ShoppingCart },
    { id: ViewState.CHEF, label: 'Chef', icon: ChefHat },
    ...(isManager ? [{ id: ViewState.RESTAURANT, label: 'Ops', icon: Store }] : []),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e9e9e7] px-2 py-2 shadow-sm z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-3 rounded-lg transition-all ${isActive
                  ? 'text-[#37352f]'
                  : 'text-[#9b9a97] hover:text-[#37352f]'
                }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : ''}`} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#37352f] rounded-full" />
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
