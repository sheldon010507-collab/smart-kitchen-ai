import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  Refrigerator,
  Plus,
  ChefHat,
  Store,
  LogOut,
  ScanLine,
  Building2,
  ChevronDown,
  Check,
  MapPin,
  Edit,
  Shield,
  X,
  ArrowRight,
  ShoppingCart,
  Search,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

import {
  InventoryItem,
  ViewState,
  SalesReceipt,
  Staff,
  Shift,
  MenuItem,
  User,
  PrepTask,
  Business,
} from './types';

// import InventoryCard from './components/InventoryCard'; // Moved to InventoryView.tsx
import Scanner from './components/Scanner';
import ChefView from './components/ChefView';
import EditItemModal from './components/EditItemModal';
import RestaurantDashboard from './components/RestaurantDashboard';
import PrepList from './components/PrepList';
import StoreModal from './components/StoreModal';
import MobileNav from './components/MobileNav';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import { MenuManager } from './features/menu';
import StaffInventoryOverview from './components/StaffInventoryOverview';
import SupabaseLogin from './components/SupabaseLogin';
import { EditableTitle } from './components/EditableTitle';
import { ShoppingListView, ShoppingListSummary, FEATURE_SHOPPING_LIST_ENABLED, useShoppingListSummary } from './features/shopping-list';
import { SubscriptionView } from './components/SubscriptionView'; // Added import
// ✅ 注意：StaffCalendar 应该在 RestaurantDashboard 内部使用，不在这里导入
import { supabase } from './lib/supabase';
import { useInventoryContext } from './lib/InventoryContext';
import { useBusiness, BusinessProvider } from './lib/BusinessContext';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// ✅ 從模組導入工具函數
import { toISODate } from './utils/dateUtils';
import { calculateIngredientCost } from './utils/costCalculations';
import { normMemberStatus, mapDbRowToInventoryItem } from './utils/transforms';
import { sanitizeStorage } from './utils/storageUtils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { JoinStoreModal } from './components/modals/JoinStoreModal';
import { MetaManagerModal } from './components/modals/MetaManagerModal';
import { MasterDashboard } from './features/dashboard/MasterDashboard';
import { StoreDashboard } from './features/dashboard/StoreDashboard';
import { StaffDashboard } from './features/dashboard/StaffDashboard';
import { InventoryView } from './features/inventory/InventoryView';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { MobileHeader } from './components/layout/MobileHeader';
import { useBusinessHandlers } from './hooks/useBusinessHandlers';
import WastageModal from './components/WastageModal';
import { recordWastage } from './services/wastageService';
import { InventorySetupWizard, DraftInventoryItem, MergeStrategy } from './components/setup';

const COLORS = ['#475569', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9'];

// ✅ 函數已移至模組文件


export default function App() {
  // --- Global State ---
  const [user, setUser] = useState<User | null>(null);

  // ✅ 業務狀態 - 保持本地管理（為未來 Context 遷移準備別名）
  const [businesses, setBusinessesDirect] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessIdDirect] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);

  // ✅ 創建兼容層：保持現有代碼不變
  const setBusinesses = setBusinessesDirect;
  const setCurrentBusinessId = setCurrentBusinessIdDirect;

  // ✅ 使用導入的 sanitizeStorage 函數清理舊緩存

  useEffect(() => {
    sanitizeStorage();
  }, []);

  // ✅ 使用 InventoryContext 管理庫存狀態
  const inventoryCtx = useInventoryContext();
  const inventory = inventoryCtx.inventory;
  const setInventory = (updater: InventoryItem[] | ((prev: InventoryItem[]) => InventoryItem[])) => {
    // 注意：Context 不支持直接 setState，這是一個兼容層
    // 對於 filter 操作，我們需要在業務層處理
    console.warn('[App] Direct setInventory is deprecated, use inventoryCtx methods instead');
  };

  // Data State（其他狀態保持本地管理）
  const [sales, setSales] = useState<SalesReceipt[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);

  // UI State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'receipt' | 'fridge' | 'sales'>('receipt');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);
  // ✅ Manage Category/Location
  const [isMetaManagerOpen, setIsMetaManagerOpen] = useState(false);
  const [metaTab, setMetaTab] = useState<'categories' | 'locations' | 'containers'>('categories');
  const [metaNewValue, setMetaNewValue] = useState('');

  // Store Modal State
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  // Staff Join Modal State
  const [isJoinStoreModalOpen, setIsJoinStoreModalOpen] = useState(false);
  const [joinStoreCode, setJoinStoreCode] = useState('');
  const [joinStoreNameAlias, setJoinStoreNameAlias] = useState('');

  // Inventory Search State
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');

  // 🆕 Wastage Modal State
  const [wastageItem, setWastageItem] = useState<InventoryItem | null>(null);

  // 🆕 Setup Wizard State
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  // ✅ P1 優化：使用 useRef 避免 popstate 監聽器頻繁重新註冊
  const modalStatesRef = useRef({
    isScannerOpen,
    isEditModalOpen,
    isStoreModalOpen,
    isJoinStoreModalOpen,
    isMetaManagerOpen,
    isBusinessDropdownOpen
  });

  // 更新 ref（不觸發重新渲染）
  useEffect(() => {
    modalStatesRef.current = {
      isScannerOpen,
      isEditModalOpen,
      isStoreModalOpen,
      isJoinStoreModalOpen,
      isMetaManagerOpen,
      isBusinessDropdownOpen
    };
  });

  // 監聽器只註冊一次
  useEffect(() => {
    const handlePopState = () => {
      const states = modalStatesRef.current;
      if (states.isScannerOpen) { setIsScannerOpen(false); return; }
      if (states.isEditModalOpen) { setIsEditModalOpen(false); return; }
      if (states.isStoreModalOpen) { setIsStoreModalOpen(false); return; }
      if (states.isJoinStoreModalOpen) { setIsJoinStoreModalOpen(false); return; }
      if (states.isMetaManagerOpen) { setIsMetaManagerOpen(false); return; }
      if (states.isBusinessDropdownOpen) { setIsBusinessDropdownOpen(false); return; }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // 空依賴 - 只註冊一次

  // ✅ 新增：打开 Scanner 的辅助函数
  const openScanner = (mode: 'receipt' | 'fridge' | 'sales') => {
    setScannerMode(mode);
    window.history.pushState({ modal: 'scanner' }, '');
    setIsScannerOpen(true);
  };

  // --- Derived State ---
  const activeBusiness = businesses.find(b => b.id === currentBusinessId);
  // ✅ Dropdown options = inventory-used + custom list
  const derivedCategories = useMemo(() => {
    const bizItems: InventoryItem[] =
      currentBusinessId ? inventory.filter((i) => i.businessId === currentBusinessId) : inventory;

    const fromItems = Array.from(
      new Set(bizItems.map(i => i.category).filter(Boolean))
    ) as string[];

    const fromBiz = activeBusiness?.customCategories ?? [];
    return Array.from(new Set([...fromBiz, ...fromItems]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [inventory, currentBusinessId, activeBusiness]);

  const derivedLocations = useMemo(() => {
    const bizItems: InventoryItem[] =
      currentBusinessId ? inventory.filter((i) => i.businessId === currentBusinessId) : inventory;

    const fromItems = Array.from(
      new Set(bizItems.map(i => i.location).filter(Boolean))
    ) as string[];

    const fromBiz = activeBusiness?.customLocations ?? [];
    return Array.from(new Set([...fromBiz, ...fromItems]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [inventory, currentBusinessId, activeBusiness]);

  const addMetaItem = (type: 'categories' | 'locations', value: string) => {
    if (!currentBusinessId) return;
    const v = value.trim();
    if (!v) return;

    setBusinesses(prev =>
      prev.map(b => {
        if (b.id !== currentBusinessId) return b;
        const list = type === 'categories' ? (b.customCategories || []) : (b.customLocations || []);
        const next = Array.from(new Set([...list, v]));
        return type === 'categories'
          ? { ...b, customCategories: next }
          : { ...b, customLocations: next };
      })
    );
  };

  const renameMetaItem = async (
    type: 'categories' | 'locations',
    oldName: string,
    newName: string
  ) => {
    if (!currentBusinessId) return;
    const oldV = oldName.trim();
    const newV = newName.trim();
    if (!oldV || !newV || oldV === newV) return;

    // 1) update custom lists
    setBusinesses(prev =>
      prev.map(b => {
        if (b.id !== currentBusinessId) return b;
        const list = type === 'categories' ? (b.customCategories || []) : (b.customLocations || []);
        const next = Array.from(
          new Set(list.map(x => (String(x).trim() === oldV ? newV : String(x).trim())).filter(Boolean))
        );
        return type === 'categories'
          ? { ...b, customCategories: next }
          : { ...b, customLocations: next };
      })
    );

    // 2) update inventory in DB and reload (instead of local state mutation)
    // Note: The setInventory call is now a no-op, the actual update happens in DB

    // 3) persist to DB (inventory_items)
    const patch: Record<string, string | null> = type === 'categories'
      ? { category: newV }
      : { location: newV };
    const column = type === 'categories' ? 'category' : 'location';

    const { error } = await supabase
      .from('inventory_items')
      .update(patch)
      .eq('business_id', currentBusinessId)
      .eq(column, oldV);

    if (error) {
      console.error(error);
      alert(error.message || 'Rename failed');
      return;
    }

    // ✅ 刷新庫存以反映 DB 變更
    await loadInventory(currentBusinessId);
  };

  const deleteMetaItem = async (type: 'categories' | 'locations', name: string) => {
    if (!currentBusinessId) return;
    const v = name.trim();
    if (!v) return;

    const ok = window.confirm(`Delete "${v}"? Items using it will be cleared.`);
    if (!ok) return;

    // 1) remove from custom lists
    setBusinesses(prev =>
      prev.map(b => {
        if (b.id !== currentBusinessId) return b;
        if (type === 'categories') {
          return { ...b, customCategories: (b.customCategories || []).filter(x => String(x).trim() !== v) };
        }
        return { ...b, customLocations: (b.customLocations || []).filter(x => String(x).trim() !== v) };
      })
    );

    // 2) update inventory in DB and reload (instead of local state mutation)
    // Note: The setInventory call is now a no-op, the actual update happens in DB

    // 3) clear from DB
    const patch: Record<string, string | null> = type === 'categories'
      ? { category: null }
      : { location: null };
    const column = type === 'categories' ? 'category' : 'location';

    const { error } = await supabase
      .from('inventory_items')
      .update(patch)
      .eq('business_id', currentBusinessId)
      .eq(column, v);

    if (error) {
      console.error(error);
      alert(error.message || 'Delete failed');
      return;
    }

    // ✅ 刷新庫存以反映 DB 變更
    await loadInventory(currentBusinessId);
  };

  // ✅ Staff：Active + Pending 都放进列表（让 dropdown 能看到店）
  const staffMemberships = useMemo(
    () =>
      user?.role === 'Staff'
        ? staff.filter(s => s.email === user.email && (s.status === 'Active' || s.status === 'Pending'))
        : [],
    [staff, user]
  );

  // ✅ Phase D: 使用 useBusinessHandlers hook 集中管理業務邏輯
  const {
    handleLogout,
    handleSwitchBusiness,
    handleOpenCreateStore,
    handleOpenEditStore,
    handleSaveStore,
    handleDeleteStore,
    handleJoinStoreSubmit,
  } = useBusinessHandlers({
    user,
    currentBusinessId,
    staffMemberships,
    setUser,
    setBusinesses,
    setCurrentBusinessId,
    setView,
    setIsBusinessDropdownOpen,
    setIsStoreModalOpen,
    setEditingBusiness,
    setIsJoinStoreModalOpen,
    setSales,
    setStaff,
    setShifts,
    setMenu,
    setPrepTasks,
    clearInventoryForBusiness: inventoryCtx.clearInventoryForBusiness,
    joinStoreCode,
    setJoinStoreCode,
    setJoinStoreNameAlias,
  });

  const accessibleBusinesses = useMemo(() => {
    if (user?.role === 'Manager') {
      return businesses.filter(b => user?.ownedBusinessIds?.includes(b.id));
    }
    return businesses.filter(b => staffMemberships.some(m => m.businessId === b.id));
  }, [businesses, staffMemberships, user]);

  const isMasterView = user?.role === 'Manager' && !currentBusinessId;

  const filteredInventory = useMemo(
    () => (isMasterView ? inventory : inventory.filter(i => i.businessId === currentBusinessId)),
    [inventory, currentBusinessId, isMasterView]
  );
  const filteredSales = useMemo(() => sales.filter(s => s.businessId === currentBusinessId), [sales, currentBusinessId]);
  const filteredStaff = useMemo(
    () => (isMasterView ? staff : staff.filter(s => s.businessId === currentBusinessId)),
    [staff, currentBusinessId, isMasterView]
  );
  const filteredShifts = useMemo(() => shifts.filter(s => s.businessId === currentBusinessId), [shifts, currentBusinessId]);
  const filteredMenu = useMemo(() => menu.filter(m => m.businessId === currentBusinessId), [menu, currentBusinessId]);
  const filteredTasks = useMemo(
    () => (isMasterView ? prepTasks : prepTasks.filter(t => t.businessId === currentBusinessId)),
    [prepTasks, currentBusinessId, isMasterView]
  );

  // Shopping List Summary for Master Dashboard
  const { summaries: shoppingListSummaries, loading: shoppingListLoading } = useShoppingListSummary(
    user?.role === 'Manager' && isMasterView ? user?.id : null
  );
  const totalPendingItems = shoppingListSummaries.reduce((sum, s) => sum + s.pending_count, 0);
  const totalUrgentItems = shoppingListSummaries.reduce((sum, s) => sum + s.urgent_count, 0);

  // --- Logic: Recalculate Menu Costs ---
  const recalculateMenuCosts = (currentInventory: InventoryItem[]) => {
    setMenu(prevMenu =>
      prevMenu.map(menuItem => {
        if (!menuItem.ingredients || menuItem.ingredients.length === 0) return menuItem;

        let newCost = 0;
        const updatedIngredients = menuItem.ingredients.map(ingUsage => {
          const invItem = currentInventory.find(i => i.id === ingUsage.inventoryItemId);
          if (invItem) {
            const cost = calculateIngredientCost(invItem, ingUsage.quantityUsed, ingUsage.unitUsed);
            newCost += cost;
            return { ...ingUsage, costSnapshot: cost };
          }
          newCost += ingUsage.costSnapshot;
          return ingUsage;
        });

        return { ...menuItem, estimatedCost: newCost, ingredients: updatedIngredients };
      })
    );
  };

  // ✅ mapDbRowToInventoryItem 已統一至 utils/transforms.ts（L60 導入）

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

  // ===== Members refresh (让 Manager 看到 Pending / Active) =====
  const loadMembersForBusiness = async (bizId: string) => {
    try {
      const { data: mems, error: memErr } = await supabase
        .from('business_members')
        .select('user_id, status, role')
        .eq('business_id', bizId);

      if (memErr) throw memErr;

      const userIds = (mems || []).map(m => m.user_id).filter(Boolean);
      let profilesById: Record<string, any> = {};

      // 尝试从 profiles 拉名字/邮箱（没有就忽略）
      if (userIds.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (!pErr && profs) {
          profilesById = Object.fromEntries(profs.map(p => [p.id, p]));
        }
      }

      const rows: Staff[] = (mems || [])
        .filter(m => String(m.role || '').toLowerCase() !== 'owner') // owner 不进排班
        .map(m => {
          const prof = profilesById[m.user_id] || {};
          return {
            id: `${m.user_id}_${bizId}`,
            businessId: bizId,
            name: prof.full_name || 'Staff',
            email: prof.email || '',
            role: 'Server',
            hourlyRate: 0,
            status: normMemberStatus(m.status),
          };
        });

      setStaff(prev => {
        const map = new Map(prev.map(x => [x.id, x]));
        rows.forEach(r => map.set(r.id, r));
        return Array.from(map.values());
      });
    } catch (e: any) {
      console.error('loadMembersForBusiness error:', e);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'Manager') return;
    if (!currentBusinessId) return;
    loadMembersForBusiness(currentBusinessId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, currentBusinessId]);


  // ✅ Phase D: 上述函數已移至 useBusinessHandlers hook

  // --- Data Handlers ---
  // ✅ 使用 InventoryContext 處理掃描結果
  const handleScanResult = async (items: InventoryItem[]) => {
    if (!currentBusinessId) return;

    try {
      await inventoryCtx.addItems(items, currentBusinessId);
      setIsScannerOpen(false);
    } catch (err: any) {
      console.error('handleScanResult error:', err);
      alert(err?.message || 'Scan import failed');
    }
  };

  const handleSalesProcessed = (receipt: SalesReceipt) => {
    if (!currentBusinessId) return;
    setSales(prev => [{ ...receipt, businessId: currentBusinessId }, ...prev]);
    setIsScannerOpen(false);
  };

  const handleSaveItem = async (item: InventoryItem, newCategory?: string, newLocation?: string) => {
    if (!currentBusinessId) return;

    const payload: any = {
      business_id: currentBusinessId,
      name: item.name,
      canonical_name: item.name, // MVP：先用 name
      category: item.category || null,
      location: item.location || null,
      quantity_value: Number(item.quantityValue || 0),
      quantity_unit: item.quantityUnit || 'pcs',
      unit_cost: Number(item.unitCost || 0),
      // ✅ 修复：转换日期格式 + 默认使用今天日期
      expiry_date: toISODate(item.expiryDate),
      added_date: toISODate(item.addedDate) || new Date().toISOString().split('T')[0],
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', editingItem.id)
          .eq('business_id', currentBusinessId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('inventory_items')
          .insert(payload)
          .select('*')
          .single();

        if (error) throw error;
        if (data) item.id = data.id;
      }

      await loadInventory(currentBusinessId);
      setIsEditModalOpen(false);
      setEditingItem(null);

      if ((newCategory || newLocation) && activeBusiness) {
        setBusinesses(prev =>
          prev.map(b => {
            if (b.id !== currentBusinessId) return b;
            return {
              ...b,
              customCategories: newCategory ? [...b.customCategories, newCategory] : b.customCategories,
              customLocations: newLocation ? [...b.customLocations, newLocation] : b.customLocations,
            };
          })
        );
      }
    } catch (err: any) {
      console.error('handleSaveItem error:', err);
      alert(err?.message || 'Save item failed');
    }
  };

  // ✅ 使用 InventoryContext 刪除庫存項目
  const handleDeleteInventoryItem = async (id: string) => {
    if (!currentBusinessId) return;
    const success = await inventoryCtx.deleteItem(id, currentBusinessId);
    if (!success) {
      alert('Delete failed');
    }
  };

  const handleAddMenuItem = (item: MenuItem) => {
    if (!currentBusinessId) return;
    setMenu(prev => [...prev, { ...item, businessId: currentBusinessId }]);
  };

  const handleDeleteMenuItem = (id: string) => setMenu(prev => prev.filter(m => m.id !== id));

  const handleUpdateMenuItem = (item: MenuItem) => setMenu(prev => prev.map(m => (m.id === item.id ? item : m)));

  // --- Render Login if not authenticated ---
  if (!user) {
    return (
      <SupabaseLogin
        onLoginSuccess={async (supabaseUser, role, businessId) => {
          // 先做一个基础 user
          let nextUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
            role,
            ownedBusinessIds: [],
            workingBusinessId: role === 'Staff' ? businessId : undefined,
          };

          // Manager：拉自己店铺列表
          if (role === 'Manager') {
            const { data: bizList, error } = await supabase
              .from('businesses')
              .select('id, name, owner_id, join_code')
              .eq('owner_id', supabaseUser.id);

            if (!error && bizList) {
              const mapped: Business[] = bizList.map((b: any) => ({
                id: b.id,
                name: b.name,
                ownerId: b.owner_id,
                joinCode: b.join_code || '',
                address: '',
                hours: '',
                customCategories: [],
                customLocations: [],
                pendingStaffIds: [],
              }));

              setBusinesses(mapped);
              nextUser = { ...nextUser, ownedBusinessIds: mapped.map(x => x.id) };
            } else {
              console.error('Load businesses failed:', error);
              setBusinesses([]);
              nextUser = { ...nextUser, ownedBusinessIds: [] };
            }

            setUser(nextUser);
            setCurrentBusinessId(null); // manager 进 master view

            // ✅ 處理 URL 中的 plan 參數（來自 Landing Page 重導向）
            const urlParams = new URLSearchParams(window.location.search);
            const targetPlan = urlParams.get('plan') || sessionStorage.getItem('target_plan');
            if (targetPlan && targetPlan !== 'free') {
              sessionStorage.removeItem('target_plan');
              // 清理 URL 參數
              window.history.replaceState({}, '', window.location.pathname);
              setView(ViewState.SUBSCRIPTION);
              return;
            }

            setView(ViewState.DASHBOARD);
            return;
          }

          // Staff：登录后拉自己 memberships（active/pending）-> 让 dropdown 刷新后也能看到
          if (role === 'Staff') {
            const { data: mems, error: memErr } = await supabase
              .from('business_members')
              .select('business_id, status')
              .eq('user_id', supabaseUser.id);

            if (!memErr && mems && mems.length > 0) {
              const bizIds = mems.map(m => m.business_id);

              const { data: bizRows, error: bizErr } = await supabase
                .from('businesses')
                .select('id, name, owner_id')
                .in('id', bizIds);

              if (!bizErr && bizRows) {
                const mappedBiz: Business[] = bizRows.map((b: any) => ({
                  id: b.id,
                  name: b.name,
                  ownerId: b.owner_id,
                  joinCode: '', // staff 不保存 joinCode
                  address: '',
                  hours: '',
                  customCategories: [],
                  customLocations: [],
                  pendingStaffIds: [],
                }));

                setBusinesses(mappedBiz);

                // 自己的 membership 放进 staff state（用于 Pending/Active 标签）
                const selfRows: Staff[] = mems.map(m => ({
                  id: `${supabaseUser.id}_${m.business_id}`,
                  businessId: m.business_id,
                  name: nextUser.name,
                  email: nextUser.email,
                  role: 'Server',
                  hourlyRate: 0,
                  status: normMemberStatus(m.status),
                }));

                setStaff(prev => {
                  const map = new Map(prev.map(x => [x.id, x]));
                  selfRows.forEach(r => map.set(r.id, r));
                  return Array.from(map.values());
                });
              }
            }

            setUser(nextUser);
            setCurrentBusinessId(null); // staff 先不自动进店（Pending 会被拦）

            // ✅ 處理 URL 中的 plan 參數（來自 Landing Page 重導向）
            const urlParams = new URLSearchParams(window.location.search);
            const targetPlan = urlParams.get('plan') || sessionStorage.getItem('target_plan');
            if (targetPlan && targetPlan !== 'free') {
              sessionStorage.removeItem('target_plan');
              window.history.replaceState({}, '', window.location.pathname);
              setView(ViewState.SUBSCRIPTION);
              return;
            }

            setView(ViewState.DASHBOARD);
            return;
          }

          setUser(nextUser);
          setCurrentBusinessId(null);

          // ✅ 處理 URL 中的 plan 參數（通用 fallback）
          const urlParams = new URLSearchParams(window.location.search);
          const targetPlan = urlParams.get('plan') || sessionStorage.getItem('target_plan');
          if (targetPlan && targetPlan !== 'free') {
            sessionStorage.removeItem('target_plan');
            window.history.replaceState({}, '', window.location.pathname);
            setView(ViewState.SUBSCRIPTION);
          } else {
            setView(ViewState.DASHBOARD);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary font-sans flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <DesktopSidebar
        user={user}
        view={view}
        setView={setView}
        activeBusiness={activeBusiness}
        accessibleBusinesses={accessibleBusinesses}
        currentBusinessId={currentBusinessId}
        isBusinessDropdownOpen={isBusinessDropdownOpen}
        setIsBusinessDropdownOpen={setIsBusinessDropdownOpen}
        staffMemberships={staff.filter(s => s.businessId && businesses.some(b => b.id === s.businessId))}
        onSwitchBusiness={handleSwitchBusiness}
        onOpenJoinStore={() => setIsJoinStoreModalOpen(true)}
        onLogout={handleLogout}
      />
      {/* Main Content */}
      <main className="flex-1 md:ml-72 pb-20 md:pb-12 bg-gray-50 md:bg-white min-h-screen md:rounded-tl-2xl md:border-l md:border-border overflow-hidden relative">
        {/* Mobile Header - Redesigned */}
        <MobileHeader
          user={user}
          activeBusiness={activeBusiness}
          accessibleBusinesses={accessibleBusinesses}
          currentBusinessId={currentBusinessId}
          isBusinessDropdownOpen={isBusinessDropdownOpen}
          setIsBusinessDropdownOpen={setIsBusinessDropdownOpen}
          staffMemberships={staff.filter(s => s.businessId && businesses.some(b => b.id === s.businessId))}
          onSwitchBusiness={handleSwitchBusiness}
          onOpenJoinStore={() => setIsJoinStoreModalOpen(true)}
          onLogout={handleLogout}
          onUpgrade={() => setView(ViewState.SUBSCRIPTION)}
        />

        <div className="p-4 md:p-16 max-w-6xl mx-auto min-h-screen">
          {/* MASTER DASHBOARD VIEW (Managers Only) */}
          {isMasterView && view === ViewState.DASHBOARD && (
            <MasterDashboard
              businesses={accessibleBusinesses}
              inventory={inventory}
              sales={sales}
              shoppingListSummaries={shoppingListSummaries}
              shoppingListLoading={shoppingListLoading}
              onSelectBusiness={setCurrentBusinessId}
              onCreateStore={handleOpenCreateStore}
              onEditStore={handleOpenEditStore}
              setView={setView}
            />
          )}

          {/* SINGLE STORE DASHBOARD VIEW */}
          {!isMasterView && view === ViewState.DASHBOARD && activeBusiness && (
            user.role === 'Manager' ? (
              <StoreDashboard
                user={user}
                activeBusiness={activeBusiness}
                inventory={filteredInventory}
                tasks={filteredTasks}
                onAddTask={text => {
                  if (!currentBusinessId) return;
                  setPrepTasks(prev => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      businessId: currentBusinessId,
                      text,
                      completed: false,
                      addedBy: user.name,
                      date: new Date().toISOString(),
                    },
                  ]);
                }}
                onToggleTask={id => setPrepTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)))}
                onDeleteTask={id => setPrepTasks(prev => prev.filter(t => t.id !== id))}
                onOpenScanner={openScanner}
              />
            ) : (
              <StaffDashboard
                user={user}
                activeBusiness={activeBusiness}
                inventory={filteredInventory}
                menu={filteredMenu}
                tasks={filteredTasks}
                onAddMenuItem={handleAddMenuItem}
                onDeleteMenuItem={handleDeleteMenuItem}
                onUpdateMenuItem={handleUpdateMenuItem}
                onAddTask={text => {
                  if (!currentBusinessId) return;
                  setPrepTasks(prev => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      businessId: currentBusinessId,
                      text,
                      completed: false,
                      addedBy: user.name,
                      date: new Date().toISOString(),
                    },
                  ]);
                }}
                onToggleTask={id => setPrepTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)))}
                onDeleteTask={id => setPrepTasks(prev => prev.filter(t => t.id !== id))}
                onOpenJoinStore={() => setIsJoinStoreModalOpen(true)}
              />
            )
          )}
          {!isMasterView && view === ViewState.DASHBOARD && !activeBusiness && user.role === 'Staff' && (
            <StaffDashboard
              user={user}
              activeBusiness={null}
              inventory={[]}
              menu={[]}
              tasks={[]}
              onAddMenuItem={() => { }}
              onDeleteMenuItem={() => { }}
              onUpdateMenuItem={() => { }}
              onAddTask={() => { }}
              onToggleTask={() => { }}
              onDeleteTask={() => { }}
              onOpenJoinStore={() => setIsJoinStoreModalOpen(true)}
            />
          )}

          {/* INVENTORY VIEW */}
          {view === ViewState.INVENTORY && (
            <InventoryView
              isMasterView={isMasterView}
              activeBusiness={activeBusiness}
              inventorySearchQuery={inventorySearchQuery}
              setInventorySearchQuery={setInventorySearchQuery}
              filteredInventory={filteredInventory}
              onDeleteInventoryItem={handleDeleteInventoryItem}
              onEditInventoryItem={it => {
                setEditingItem(it);
                setIsEditModalOpen(true);
              }}
              onOpenScanner={openScanner}
              onOpenMetaManager={() => {
                setMetaTab('categories');
                setMetaNewValue('');
                setIsMetaManagerOpen(true);
              }}
              onAddItem={() => {
                setEditingItem(null);
                setIsEditModalOpen(true);
              }}
              onWastage={setWastageItem}
              onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
            />
          )}


          {/* CHEF VIEW */}
          {view === ViewState.CHEF &&
            (isMasterView ? (
              <div className="flex flex-col items-center justify-center h-96 animate-in fade-in duration-500">
                <ChefHat className="w-16 h-16 text-border mb-6" />
                <p className="text-secondary text-lg">Select a store to access the AI Chef.</p>
              </div>
            ) : (
              <ChefView inventory={filteredInventory} menu={filteredMenu} />
            ))}

          {/* RESTAURANT VIEW */}
          {view === ViewState.RESTAURANT && (
            <div className="animate-in fade-in duration-500">
              {user.role === 'Manager' && currentBusinessId ? (
                <RestaurantDashboard
                  sales={filteredSales}
                  staff={filteredStaff}
                  shifts={filteredShifts}
                  menu={filteredMenu}
                  inventory={filteredInventory}
                  currentBusinessId={currentBusinessId}
                  onAddStaff={newStaff => setStaff(prev => [...prev, { ...newStaff, businessId: currentBusinessId }])}
                  onAddShift={newShift => {
                    if (newShift.id && shifts.some(s => s.id === newShift.id)) {
                      setShifts(prev => prev.map(s => (s.id === newShift.id ? newShift : s)));
                    } else {
                      setShifts(prev => [...prev, { ...newShift, businessId: currentBusinessId }]);
                    }
                  }}
                  onDeleteShift={id => setShifts(prev => prev.filter(s => s.id !== id))}
                  onAddMenuItem={item => setMenu(prev => [...prev, { ...item, businessId: currentBusinessId }])}
                  onDeleteMenuItem={id => setMenu(prev => prev.filter(m => m.id !== id))}
                  onUpdateMenuItem={item => setMenu(prev => prev.map(m => (m.id === item.id ? item : m)))}
                  onOpenScanner={() => openScanner('sales')}
                  onRefreshMembers={() => loadMembersForBusiness(currentBusinessId)}
                  onApproveStaffRequest={async (staffUserId: string) => {
                    // staffUserId 可能是 "uid_bizid" 或 "uid"
                    const uid = staffUserId.includes('_') ? staffUserId.split('_')[0] : staffUserId;
                    const { error } = await supabase
                      .from('business_members')
                      .update({ status: 'active' })
                      .eq('business_id', currentBusinessId)
                      .eq('user_id', uid);

                    if (error) {
                      alert(error.message || 'Approve failed');
                      return;
                    }
                    await loadMembersForBusiness(currentBusinessId);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-96">
                  <Store className="w-16 h-16 text-border mb-6" />
                  <p className="text-secondary text-lg">
                    {user.role !== 'Manager' ? 'Business Management is restricted to Managers.' : 'Select a store to view details.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SHOPPING LIST VIEW */}
          {view === ViewState.SHOPPING && (
            <div className="animate-in fade-in duration-500 h-full">
              {currentBusinessId ? (
                // Single Store View (Staff or Manager selected store)
                <ShoppingListView businessId={currentBusinessId} />
              ) : user.role === 'Manager' ? (
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
              onClose={() => setIsScannerOpen(false)}
              onItemsFound={handleScanResult}
              onSalesProcessed={handleSalesProcessed}
            />
          </ErrorBoundary>
        </div>
      )}

      <EditItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveItem}
        item={editingItem}
        categories={derivedCategories}
        locations={derivedLocations}
      />

      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        onSave={handleSaveStore}
        onDelete={handleDeleteStore}
        initialBusiness={editingBusiness}
        ownerId={user.id}
      />

      {/* JOIN STORE MODAL (Staff) */}
      <JoinStoreModal
        isOpen={isJoinStoreModalOpen}
        onClose={() => setIsJoinStoreModalOpen(false)}
        joinStoreCode={joinStoreCode}
        setJoinStoreCode={setJoinStoreCode}
        joinStoreNameAlias={joinStoreNameAlias}
        setJoinStoreNameAlias={setJoinStoreNameAlias}
        onSubmit={handleJoinStoreSubmit}
      />

      {/* META MANAGER MODAL */}
      <MetaManagerModal
        isOpen={isMetaManagerOpen}
        onClose={() => setIsMetaManagerOpen(false)}
        metaTab={metaTab}
        setMetaTab={setMetaTab}
        metaNewValue={metaNewValue}
        setMetaNewValue={setMetaNewValue}
        categories={derivedCategories}
        locations={derivedLocations}
        businessId={currentBusinessId || ''}
        onRename={renameMetaItem}
        onDelete={deleteMetaItem}
        onAdd={addMetaItem}
      />

      {/* 🆕 WASTAGE MODAL */}
      <WastageModal
        item={wastageItem}
        onClose={() => setWastageItem(null)}
        onConfirm={async (data) => {
          if (!currentBusinessId || !wastageItem) return;

          const result = await recordWastage({
            businessId: currentBusinessId,
            inventoryItemId: data.itemId,
            itemName: wastageItem.name,
            quantity: data.quantity,
            unit: wastageItem.quantityUnit || 'pcs',
            unitCost: wastageItem.unitCost || 0,
            reason: data.reason,
            notes: data.notes,
            expiryDate: wastageItem.expiryDate,
            category: wastageItem.category,
            userId: user?.id,
          });

          if (result.success) {
            await loadInventory(currentBusinessId);
            setWastageItem(null);
          } else {
            throw new Error(result.error || 'Failed to record wastage');
          }
        }}
      />

      {/* 🆕 INVENTORY SETUP WIZARD */}
      {isSetupWizardOpen && currentBusinessId && user && (
        <InventorySetupWizard
          businessId={currentBusinessId}
          userId={user.id}
          existingCategories={derivedCategories}
          existingLocations={derivedLocations}
          existingItemCount={inventory.filter(i => i.businessId === currentBusinessId).length}
          onClose={() => setIsSetupWizardOpen(false)}
          onComplete={async (items: DraftInventoryItem[], strategy: MergeStrategy) => {
            if (strategy === 'overwrite') {
              await inventoryCtx.deleteAllInventoryForBusiness(currentBusinessId);
            }

            const mapped: InventoryItem[] = items.filter(i => !i.isDeleted).map(d => ({
              id: d.id,
              businessId: currentBusinessId,
              name: d.name,
              quantity: '0',
              quantityValue: 0,
              quantityUnit: d.quantityUnit || d.unit || 'pcs',
              unitCost: d.unitCost ?? d.cost ?? 0,
              category: d.category || '',
              location: d.location || '',
              minStockLevel: d.minStockLevel ?? d.suggestedPar,
              supplier: d.supplier || '',
              notes: d.notes || '',
              expiryDate: '',
              addedDate: new Date().toISOString().split('T')[0],
            }));

            // Build lookup map of existing items by name
            const existingItems = inventory.filter(i => i.businessId === currentBusinessId);
            const existingByName = new Map<string, InventoryItem>(
              existingItems.map(i => [i.name.toLowerCase().trim(), i])
            );

            if (strategy === 'add-new-only') {
              // Only add items that don't exist
              const newItems = mapped.filter(i => !existingByName.has(i.name.toLowerCase().trim()));
              await inventoryCtx.addItemsWithDbCheck(newItems, currentBusinessId);
            } else if (strategy === 'smart-merge') {
              // Smart merge: update existing items' settings, add new items
              const itemsToUpdate: InventoryItem[] = [];
              const itemsToAdd: InventoryItem[] = [];

              for (const item of mapped) {
                const existing = existingByName.get(item.name.toLowerCase().trim());
                if (existing) {
                  // Update existing item's settings but preserve quantity
                  itemsToUpdate.push({
                    ...existing,
                    category: item.category || existing.category,
                    location: item.location || existing.location,
                    quantityUnit: item.quantityUnit || existing.quantityUnit,
                    unitCost: item.unitCost ?? existing.unitCost,
                    minStockLevel: item.minStockLevel ?? existing.minStockLevel,
                    supplier: item.supplier || existing.supplier,
                    notes: item.notes || existing.notes,
                    // Preserve quantity - don't change it
                  });
                } else {
                  itemsToAdd.push(item);
                }
              }

              // Update existing items
              for (const item of itemsToUpdate) {
                await inventoryCtx.updateItem(item.id, item);
              }
              // Add new items
              if (itemsToAdd.length > 0) {
                await inventoryCtx.addItemsWithDbCheck(itemsToAdd, currentBusinessId);
              }
            } else {
              // Default: just add all (for overwrite, items were already deleted)
              await inventoryCtx.addItemsWithDbCheck(mapped, currentBusinessId);
            }

            setIsSetupWizardOpen(false);
          }}
        />
      )}

    </div>
  );
}
