import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SetPar } from './components/SetPar';
import { Restock } from './components/Restock';
import { TakeInventory } from './components/TakeInventory';
import { Order } from './components/Order';
import { Operations } from './components/Operations';
import { AIChef } from './components/AIChef';
import { View, InventoryItem } from './types';

// Mock Initial Data
const INITIAL_ITEMS: InventoryItem[] = [
    { id: '1', name: 'Whole Milk', category: 'Dairy', currentStock: 2, unit: 'Gal', par: 4, supplier: 'Sysco Food Services' },
    { id: '2', name: 'Avocados (Hass)', category: 'Produce', currentStock: 15, unit: 'Units', par: 20, supplier: 'Baldor Specialty' },
    { id: '3', name: 'Extra Virgin Olive Oil', category: 'Pantry', currentStock: 4, unit: 'L', par: 5, supplier: 'Baldor Specialty' },
    { id: '4', name: 'Sourdough Loaves', category: 'Bakery', currentStock: 8, unit: 'Units', par: 12, supplier: 'Local Bakery' },
    { id: '5', name: 'San Marzano Tomatoes', category: 'Canned', currentStock: 6, unit: 'Cans', par: 10, supplier: 'Sysco Food Services' },
    { id: '6', name: 'Kosher Salt', category: 'Spices', currentStock: 5, unit: 'kg', par: 5, supplier: 'Sysco Food Services' },
    { id: '7', name: 'Heavy Cream', category: 'Dairy', currentStock: 2, unit: 'Qt', par: 6, supplier: 'Sysco Food Services' },
    { id: '8', name: 'Red Onions', category: 'Produce', currentStock: 10, unit: 'lb', par: 15, supplier: 'Baldor Specialty' },
    { id: '9', name: 'AP Flour', category: 'Dry Goods', currentStock: 40, unit: 'lb', par: 50, supplier: 'King Arthur' },
    { id: '10', name: 'Canola Oil', category: 'Oils', currentStock: 2, unit: 'Gal', par: 4, supplier: 'Sysco Food Services' },
];

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onChangeView={setCurrentView} />;
      case 'set-par':
        return <SetPar onBack={() => setCurrentView('dashboard')} items={items} setItems={setItems} />;
      case 'restock':
        return <Restock onBack={() => setCurrentView('dashboard')} items={items} />;
      case 'take-inventory':
        return <TakeInventory onBack={() => setCurrentView('dashboard')} items={items} />;
      case 'order':
        return <Order onBack={() => setCurrentView('dashboard')} items={items} />;
      case 'operations':
        return <Operations onBack={() => setCurrentView('dashboard')} />;
      case 'ai-chef':
        return <AIChef onBack={() => setCurrentView('dashboard')} />;
      default:
        return <Dashboard onChangeView={setCurrentView} />;
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto h-screen bg-white overflow-hidden shadow-2xl">
        {renderView()}
    </div>
  );
}

export default App;
