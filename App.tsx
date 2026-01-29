import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  ChefHat,
  Store,
} from 'lucide-react';

import {
  InventoryItem,
  ViewState,
  MenuItem,
} from './types';

// import InventoryCard from './components/InventoryCard'; // Moved to InventoryView.tsx
import Scanner from './components/Scanner';
// ChefView migrated to DashboardPage
// import RestaurantDashboard from './components/RestaurantDashboard'; // Migrated to DashboardPage
// StoreModal is removed from render so import is already removed above. 

import MobileNav from './components/MobileNav';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import { ShoppingListView, ShoppingListSummary } from './features/shopping-list';
import { SubscriptionView } from './components/SubscriptionView'; // Added import
// ✅ 注意：StaffCalendar 应该在 RestaurantDashboard 内部使用，不在这里导入
import { useInventoryContext } from './lib/InventoryContext';
import { useBusiness } from './lib/BusinessContext';
import { useAuthContext } from './lib/AuthContext'; // Added

import { sanitizeStorage } from './utils/storageUtils';
import { ErrorBoundary } from './components/ErrorBoundary';
// Modals migrated to DashboardPage
// Dashboard components migrated to DashboardPage
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { MobileHeader } from './components/layout/MobileHeader';
import { useBusinessHandlers } from './hooks/useBusinessHandlers';
import { useManagerBusinessAutoRecovery } from './hooks/useManagerBusinessAutoRecovery';


export default function App() {
  // --- Global State ---
  const { user } = useAuthContext();
  const {
    activeBusiness,
    accessibleBusinesses,
    currentBusinessId,
    setCurrentBusinessId,
    staffMemberships,
    isMasterView
  } = useBusiness();

  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);

  // ✅ Manager Business Auto-Recovery (防止Email确认中断创建流程)
  const { isRecovering, recoveryError, recoveredBusinessId } = useManagerBusinessAutoRecovery(user);

  // ✅ 使用导入的 sanitizeStorage 函數清理舊緩存
  useEffect(() => {
    sanitizeStorage();
  }, []);

  // ✅ 使用 InventoryContext 管理庫存狀態
  const inventoryCtx = useInventoryContext();
  const inventory = inventoryCtx.inventory;

  // Data State（其他狀態保持本地管理）
  // Legacy states removed: staff, shifts, menu, prepTasks - all migrated to DashboardPage

  // UI State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'receipt' | 'fridge'>('receipt');
  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);

  // ✅ P1 優化：使用 useRef 避免 popstate 監聽器頻繁重新註冊
  const modalStatesRef = useRef({
    isScannerOpen,
    isBusinessDropdownOpen
  });

  // 更新 ref（不觸發重新渲染）
  useEffect(() => {
    modalStatesRef.current = {
      isScannerOpen,
      isBusinessDropdownOpen
    };
  });

  // 監聽器只註冊一次
  useEffect(() => {
    const handlePopState = () => {
      const states = modalStatesRef.current;
      if (states.isScannerOpen) { setIsScannerOpen(false); return; }
      if (states.isBusinessDropdownOpen) { setIsBusinessDropdownOpen(false); return; }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // 空依賴 - 只註冊一次

  const location = useLocation();
  const navigate = useNavigate();

  // Sync URL to View
  useEffect(() => {
    const path = location.pathname;
    if (path === '/inventory') {
      if (view !== ViewState.INVENTORY) setView(ViewState.INVENTORY);
    } else if (path === '/chef') {
      if (view !== ViewState.CHEF) setView(ViewState.CHEF);
    } else if (path === '/shopping-list') {
      if (view !== ViewState.SHOPPING) setView(ViewState.SHOPPING);
    } else if (path === '/operations') {
      if (view !== ViewState.RESTAURANT) setView(ViewState.RESTAURANT);
    } else if (path === '/dashboard' || path === '/') {
      if (view !== ViewState.DASHBOARD) setView(ViewState.DASHBOARD);
    }
  }, [location.pathname]);

  // Sync View to URL (navigate when view changes)
  useEffect(() => {
    const currentPath = location.pathname;

    if (view === ViewState.INVENTORY && currentPath !== '/inventory') {
      navigate('/inventory', { replace: true });
    } else if (view === ViewState.CHEF && currentPath !== '/chef') {
      navigate('/chef', { replace: true });
    } else if (view === ViewState.SHOPPING && currentPath !== '/shopping-list') {
      navigate('/shopping-list', { replace: true });
    } else if (view === ViewState.RESTAURANT && currentPath !== '/operations') {
      navigate('/operations', { replace: true });
    } else if (view === ViewState.DASHBOARD && currentPath !== '/dashboard' && currentPath !== '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [view, navigate, location.pathname]);

  const openScanner = (mode: 'receipt' | 'fridge') => {
    setScannerMode(mode);
    window.history.pushState({ modal: 'scanner' }, '');
    setIsScannerOpen(true);
  };

  // --- Derived State ---
  // Replaced by BusinessContext

  // ✅ Phase D: 使用 useBusinessHandlers hook 集中管理業務邏輯
  const {
    handleLogout,
    handleSwitchBusiness,
  } = useBusinessHandlers({
    setView,
    setIsBusinessDropdownOpen,
  });

  // 🔄 Transform Supabase User to App User (types.ts User)
  const appUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: user.user_metadata?.full_name || user.email || 'User',
      email: user.email || '',
      role: (user.user_metadata?.role || 'Staff') as 'Manager' | 'Staff',
      ownedBusinessIds: [],
      workingBusinessId: currentBusinessId || undefined,
    };
  }, [user, currentBusinessId]);

  const filteredInventory = useMemo(
    () => (isMasterView ? inventory : inventory.filter(i => i.businessId === currentBusinessId)),
    [inventory, currentBusinessId, isMasterView]
  );

  // ✅ 使用 Context 加載庫存
  const loadInventory = async (bizId: string) => {
    await inventoryCtx.loadInventory(bizId);
  };

  // 当前店铺变化 -> 自动拉库存
  useEffect(() => {
    if (!user) return;
    if (!currentBusinessId) return;
    loadInventory(currentBusinessId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currentBusinessId]);


  // --- Data Handlers ---
  // ✅ 使用 InventoryContext 處理掃描結果
  const handleScanResult = async (items: InventoryItem[], mode: 'cumulative' | 'stocktake' = 'cumulative') => {
    if (!currentBusinessId) return;

    try {
      await inventoryCtx.addItems(items, currentBusinessId, mode);
      setIsScannerOpen(false);
    } catch (err: any) {
      console.error('handleScanResult error:', err);
      alert(err?.message || 'Scan import failed');
    }
  };

  // --- Render Login if not authenticated ---
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 text-primary dark:text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <DesktopSidebar
        user={appUser!}
        view={view}
        setView={setView}
        activeBusiness={activeBusiness}
        accessibleBusinesses={accessibleBusinesses}
        currentBusinessId={currentBusinessId}
        isBusinessDropdownOpen={isBusinessDropdownOpen}
        setIsBusinessDropdownOpen={setIsBusinessDropdownOpen}
        staffMemberships={staffMemberships}
        onSwitchBusiness={handleSwitchBusiness}
        // Removed onOpenJoinStore
        onLogout={handleLogout}
      />
      {/* Main Content */}
      <main className="flex-1 md:ml-72 pb-20 md:pb-12 bg-gray-50 dark:bg-gray-900 md:bg-white md:dark:bg-gray-900 min-h-screen md:rounded-tl-2xl md:border-l md:border-border dark:border-gray-700 overflow-hidden relative">
        {/* Mobile Header */}
        <MobileHeader
          user={appUser!}
          activeBusiness={activeBusiness}
          accessibleBusinesses={accessibleBusinesses}
          currentBusinessId={currentBusinessId}
          isBusinessDropdownOpen={isBusinessDropdownOpen}
          setIsBusinessDropdownOpen={setIsBusinessDropdownOpen}
          staffMemberships={staffMemberships}
          onSwitchBusiness={handleSwitchBusiness}
          // Removed onOpenJoinStore
          onLogout={handleLogout}
          onUpgrade={() => setView(ViewState.SUBSCRIPTION)}
        />

        <div className="p-4 md:p-16 max-w-6xl mx-auto min-h-screen bg-white dark:bg-gray-900">
          {/* MASTER DASHBOARD VIEW & SINGLE STORE DASHBOARD (Routed) */}
          {view === ViewState.DASHBOARD && <Outlet context={{ onOpenScanner: openScanner }} />}

          {/* INVENTORY VIEW (Routed) */}
          {view === ViewState.INVENTORY && <Outlet context={{ onOpenScanner: openScanner }} />}


          {/* CHEF VIEW - Now handled via Outlet to DashboardPage */}
          {view === ViewState.CHEF && <Outlet context={{ onOpenScanner: openScanner }} />}

          {/* RESTAURANT VIEW (Routed) */}
          {view === ViewState.RESTAURANT && <Outlet context={{ onOpenScanner: openScanner }} />}

          {/* SHOPPING LIST VIEW */}
          {view === ViewState.SHOPPING && (
            <div className="animate-in fade-in duration-500 h-full">
              {currentBusinessId ? (
                // Single Store View (Staff or Manager selected store)
                <ShoppingListView businessId={currentBusinessId} />
              ) : appUser?.role === 'Manager' ? (
                // Master Dashboard Summary
                <ShoppingListSummary onSelectBusiness={setCurrentBusinessId} />
              ) : (
                // Staff without business selected (shouldn't happen often)
                <div className="flex flex-col items-center justify-center h-full text-secondary">
                  <div className="bg-white p-8 rounded-xl border border-border shadow-sm text-center">
                    <Store className="w-12 h-12 mx-auto mb-4 text-[#D3D1CB]" />
                    <h3 className="text-lg font-medium text-primary mb-2">No Store Selected</h3>
                    <p>Please select a store to view its shopping list.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PRIVACY VIEW */}
          {view === ViewState.PRIVACY && <PrivacyPolicyPage />}

          {/* SUBSCRIPTION VIEW */}
          {view === ViewState.SUBSCRIPTION && (
            <SubscriptionView user={user} activeBusiness={activeBusiness} />
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav view={view} setView={setView} isManager={user.role === 'Manager'} />

      {/* Overlays */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-white/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <ErrorBoundary>
            <Scanner
              initialMode={scannerMode}
              inventoryNameOptions={filteredInventory.map((i) => i.name)}
              businessId={currentBusinessId || ''}
              onClose={() => setIsScannerOpen(false)}
              onItemsFound={handleScanResult}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* EditItemModal migrated to InventoryPage */}



      {/* MetaManagerModal migrated to InventoryPage */}

      {/* 🆕 WASTAGE MODAL */}
      {/* WastageModal migrated to InventoryPage */}

      {/* 🆕 INVENTORY SETUP WIZARD - Moved to InventoryPage */}

    </div>
  );
}
