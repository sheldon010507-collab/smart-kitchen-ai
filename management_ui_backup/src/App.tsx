import { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Scanner } from './components/Scanner';
import { ShoppingList } from './components/ShoppingList';
import { PrepList } from './components/PrepList';
import { Menu } from './components/Menu';
import { Settings } from './components/Settings';
import { Navigation } from './components/Navigation';

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('onboarding');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);

  useEffect(() => {
    // Check if user has completed onboarding
    const stored = localStorage.getItem('businessData');
    if (stored) {
      setBusinessData(JSON.parse(stored));
      setIsOnboarded(true);
      setCurrentPage('dashboard');
    }
  }, []);

  const handleOnboardingComplete = (data: any) => {
    setBusinessData(data);
    setIsOnboarded(true);
    setCurrentPage('dashboard');
    localStorage.setItem('businessData', JSON.stringify(data));
  };

  const renderPage = () => {
    if (!isOnboarded) {
      return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard businessData={businessData} />;
      case 'inventory':
        return <Inventory />;
      case 'scanner':
        return <Scanner />;
      case 'shopping':
        return <ShoppingList />;
      case 'prep':
        return <PrepList />;
      case 'menu':
        return <Menu />;
      case 'settings':
        return <Settings businessData={businessData} setBusinessData={setBusinessData} />;
      default:
        return <Dashboard businessData={businessData} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff]">
      {renderPage()}
      {isOnboarded && <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />}
    </div>
  );
}