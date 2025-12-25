import React, { useState, useMemo, useEffect } from 'react';
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

import InventoryCard from './components/InventoryCard';
import Scanner from './components/Scanner';
import ChefView from './components/ChefView';
import EditItemModal from './components/EditItemModal';
import RestaurantDashboard from './components/RestaurantDashboard';
import PrepList from './components/PrepList';
import StoreModal from './components/StoreModal';
import MobileNav from './components/MobileNav';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import MenuManager from './components/MenuManager';
import StaffInventoryOverview from './components/StaffInventoryOverview';
import SupabaseLogin from './components/SupabaseLogin';
import { EditableTitle } from './components/EditableTitle';
import { ShoppingListView, ShoppingListSummary, FEATURE_SHOPPING_LIST_ENABLED } from './features/shopping-list';
// ✅ 注意：StaffCalendar 应该在 RestaurantDashboard 内部使用，不在这里导入
import { supabase } from './lib/supabase';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#475569', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9'];

// Helper to convert units for cost calculation
const calculateIngredientCost = (invItem: InventoryItem, usageQty: number, usageUnit: string): number => {
  const invUnit = (invItem.quantityUnit || 'pcs').toLowerCase();
  const uUnit = usageUnit.toLowerCase();
  const costPerInvUnit = invItem.unitCost || 0;

  let ratio = 0;
  if (uUnit === invUnit) ratio = usageQty;
  else if (invUnit === 'kg' && uUnit === 'g') ratio = usageQty / 1000;
  else if (invUnit === 'g' && uUnit === 'kg') ratio = usageQty * 1000;
  else if (invUnit === 'l' && uUnit === 'ml') ratio = usageQty / 1000;
  else if (invUnit === 'ml' && uUnit === 'l') ratio = usageQty * 1000;
  else if (invUnit === 'lb' && uUnit === 'oz') ratio = usageQty / 16;
  else if (invUnit === 'oz' && uUnit === 'lb') ratio = usageQty * 16;
  else ratio = usageQty; // fallback

  return ratio * costPerInvUnit;
};

const normMemberStatus = (s: any): 'Active' | 'Pending' => {
  const v = String(s || '').toLowerCase();
  return v === 'active' ? 'Active' : 'Pending';
};

// ✅ 新增：日期格式转换函数 (dd/mm/yyyy -> YYYY-MM-DD)
const toISODate = (dateStr: string | undefined | null): string | null => {
  if (!dateStr) return null;
  const v = dateStr.trim();
  if (!v) return null;
  // 已经是 YYYY-MM-DD 格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // dd/mm/yyyy 格式
  const match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
};

// ✅ Fix: Properly typed ErrorBoundary
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: unknown;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[UI crashed]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-800">
          <div className="font-bold mb-2">This page crashed.</div>
          <div className="text-sm opacity-90">
            Open DevTools Console to see the error details. Fix the error and refresh.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // --- Global State ---
  const [user, setUser] = useState<User | null>(null);

  // ✅ 用 Supabase 后，别用 mock 了（避免 Manager/Staff 看到假店）
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);

  // ✅ 3) 增加“兼容旧缓存”的清理，避免用户浏览器里旧的 biz_... 继续触发错误
  const sanitizeStorage = () => {
    if (typeof window === 'undefined') return;

    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const keysToCheck = ['active_business_id', 'selectedBusinessId', 'currentBusinessId'];

    keysToCheck.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) {
        // 如果是以 biz_ 开头，或者不是有效 UUID，就移除
        if (val.startsWith('biz_') || !uuidRegex.test(val)) {
          console.warn(`[Sanitize] Removing invalid ID from localStorage key "${key}":`, val);
          localStorage.removeItem(key);
        }
      }
    });
  };

  useEffect(() => {
    sanitizeStorage();
  }, []);

  // Data State（先保留本地 state，逐步接 Supabase）
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
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
  const [metaTab, setMetaTab] = useState<'categories' | 'locations'>('categories');
  const [metaNewValue, setMetaNewValue] = useState('');

  // Store Modal State
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  // Staff Join Modal State
  const [isJoinStoreModalOpen, setIsJoinStoreModalOpen] = useState(false);
  const [joinStoreCode, setJoinStoreCode] = useState('');
  const [joinStoreNameAlias, setJoinStoreNameAlias] = useState('');

  // ✅ 新增：浏览器返回按钮处理
  useEffect(() => {
    const handlePopState = () => {
      if (isScannerOpen) {
        setIsScannerOpen(false);
        return;
      }
      if (isEditModalOpen) {
        setIsEditModalOpen(false);
        return;
      }
      if (isStoreModalOpen) {
        setIsStoreModalOpen(false);
        return;
      }
      if (isJoinStoreModalOpen) {
        setIsJoinStoreModalOpen(false);
        return;
      }
      if (isMetaManagerOpen) {
        setIsMetaManagerOpen(false);
        return;
      }
      if (isBusinessDropdownOpen) {
        setIsBusinessDropdownOpen(false);
        return;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isScannerOpen, isEditModalOpen, isStoreModalOpen, isJoinStoreModalOpen, isMetaManagerOpen, isBusinessDropdownOpen]);

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
    const bizItems =
      currentBusinessId ? inventory.filter((i: any) => i.businessId === currentBusinessId) : inventory;

    const fromItems = Array.from(
      new Set((bizItems as any[]).map(i => i.category).filter(Boolean) as string[])
    );

    const fromBiz = activeBusiness?.customCategories ?? [];
    return Array.from(new Set([...fromBiz, ...fromItems]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [inventory, currentBusinessId, activeBusiness]);

  const derivedLocations = useMemo(() => {
    const bizItems =
      currentBusinessId ? inventory.filter((i: any) => i.businessId === currentBusinessId) : inventory;

    const fromItems = Array.from(
      new Set((bizItems as any[]).map(i => i.location).filter(Boolean) as string[])
    );

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

    // 2) update local inventory state
    setInventory(prev =>
      prev.map(i => {
        if (i.businessId !== currentBusinessId) return i;
        if (type === 'categories' && (i.category || '').trim() === oldV) return { ...i, category: newV };
        if (type === 'locations' && (i.location || '').trim() === oldV) return { ...i, location: newV };
        return i;
      })
    );

    // 3) persist to DB (inventory_items)
    const patch = type === 'categories' ? { category: newV } : { location: newV };
    const column = type === 'categories' ? 'category' : 'location';

    const { error } = await supabase
      .from('inventory_items')
      .update(patch as any)
      .eq('business_id', currentBusinessId)
      .eq(column, oldV);

    if (error) {
      console.error(error);
      alert(error.message || 'Rename failed');
      return;
    }
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

    // 2) clear from local inventory state
    setInventory(prev =>
      prev.map(i => {
        if (i.businessId !== currentBusinessId) return i;
        if (type === 'categories' && (i.category || '').trim() === v) return { ...i, category: '' };
        if (type === 'locations' && (i.location || '').trim() === v) return { ...i, location: '' };
        return i;
      })
    );

    // 3) clear from DB
    const patch = type === 'categories' ? { category: null } : { location: null };
    const column = type === 'categories' ? 'category' : 'location';

    const { error } = await supabase
      .from('inventory_items')
      .update(patch as any)
      .eq('business_id', currentBusinessId)
      .eq(column, v);

    if (error) {
      console.error(error);
      alert(error.message || 'Delete failed');
      return;
    }
  };

  // ✅ Staff：Active + Pending 都放进列表（让 dropdown 能看到店）
  const staffMemberships = useMemo(
    () =>
      user?.role === 'Staff'
        ? staff.filter(s => s.email === user.email && (s.status === 'Active' || s.status === 'Pending'))
        : [],
    [staff, user]
  );

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

  // ===== Step1: Inventory <-> Supabase =====
  const mapDbRowToInventoryItem = (r: any): InventoryItem => {
    const qtyVal = Number(r.quantity_value ?? 0);
    const qtyUnit = (r.quantity_unit ?? 'pcs') as string;

    return {
      id: r.id,
      businessId: r.business_id,
      name: r.name,
      category: r.category || '',
      location: r.location || '',
      unitCost: Number(r.unit_cost ?? 0),
      quantityValue: qtyVal,
      quantityUnit: qtyUnit,
      quantity: `${qtyVal} ${qtyUnit}`,
      expiryDate: r.expiry_date || '',
      addedDate: r.added_date || '',
    };
  };

  const loadInventory = async (bizId: string) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('business_id', bizId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('loadInventory error:', error);
      alert(error.message || 'Failed to load inventory');
      return;
    }

    setInventory((data || []).map(mapDbRowToInventoryItem));
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

  // ✅ 必须有：你 UI 里在用 handleLogout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBusinesses([]);
    setCurrentBusinessId(null);
    setView(ViewState.DASHBOARD);

    // 清空本地数据（避免换号后看到上个账号的数据）
    setInventory([]);
    setSales([]);
    setStaff([]);
    setShifts([]);
    setMenu([]);
    setPrepTasks([]);
  };

  const handleSwitchBusiness = (bizId: string | null) => {
    // ✅ Staff：Pending 不允许切进去
    if (user?.role === 'Staff' && bizId) {
      const mem = staffMemberships.find(m => m.businessId === bizId);
      if (mem?.status === 'Pending') {
        alert('This store is pending approval. Please wait for manager approval.');
        setIsBusinessDropdownOpen(false);
        return;
      }
    }

    setCurrentBusinessId(bizId);
    setIsBusinessDropdownOpen(false);
    setView(ViewState.DASHBOARD);
  };

  // --- Store Management Handlers ---
  const handleOpenCreateStore = () => {
    setEditingBusiness(null);
    setIsStoreModalOpen(true);
  };

  const handleOpenEditStore = (biz: Business, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBusiness(biz);
    setIsStoreModalOpen(true);
  };

  const handleSaveStore = async (businessData: Partial<Business>) => {
    if (!user) return;

    try {
      if (businessData.id) {
        // Edit Mode
        const { error } = await supabase
          .from('businesses')
          .update({
            name: businessData.name,
            // 嘗試更新這些字段，如果數據庫沒有對應列可能會報錯，請根據實際 Schema 調整
            // address: businessData.address,
            // hours: businessData.hours,
            // contact_info: businessData.contactInfo, 
          })
          .eq('id', businessData.id);

        if (error) throw error;

        setBusinesses(prev => prev.map(b => (b.id === businessData.id ? { ...b, ...businessData } as Business : b)));
      } else {
        // Create Mode - ✅ 修复：前端不传 ID，让 Supabase 生成 UUID
        const { data: biz, error } = await supabase
          .from('businesses')
          .insert({
            name: businessData.name?.trim(),
            owner_id: user.id
            // 如果您的 Schema 支持其他字段，请在此添加，例如：
            // address: businessData.address,
          })
          .select('id, name, owner_id')
          .single();

        if (error) throw error;
        if (!biz) throw new Error('Failed to create business');

        const realUUID = biz.id;

        // ✅ 必须插 business_members，不然 manager 自己都看不见
        const { error: memErr } = await supabase.from('business_members').insert({
          business_id: realUUID,
          user_id: user.id,
          role: 'owner',
          status: 'active'
        });

        if (memErr) throw memErr;

        // 构造本地对象（填充 UUID）
        const newBusinessFull: Business = {
          ...businessData,
          id: realUUID,
          ownerId: user.id,
          // 默认值
          joinCode: 'PENDING',
          customCategories: ['Produce', 'Dairy', 'Meat', 'Pantry'],
          customLocations: ['Fridge', 'Freezer', 'Pantry'],
          pendingStaffIds: [],
        } as Business;

        setBusinesses(prev => [...prev, newBusinessFull]);

        if (user) {
          setUser({ ...user, ownedBusinessIds: [...(user.ownedBusinessIds || []), realUUID] });
        }

        // 切換到新店
        localStorage.setItem('active_business_id', realUUID);
        setCurrentBusinessId(realUUID);
      }
    } catch (err: any) {
      console.error('Save store failed:', err);
      alert('Failed to save store: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteStore = (businessId: string) => {
    setBusinesses(prev => prev.filter(b => b.id !== businessId));
    if (user) {
      setUser({ ...user, ownedBusinessIds: user.ownedBusinessIds?.filter(id => id !== businessId) });
    }
    setInventory(prev => prev.filter(i => i.businessId !== businessId));
    setSales(prev => prev.filter(s => s.businessId !== businessId));
    setStaff(prev => prev.filter(s => s.businessId !== businessId));
    setShifts(prev => prev.filter(s => s.businessId !== businessId));
    setMenu(prev => prev.filter(m => m.businessId !== businessId));
    setPrepTasks(prev => prev.filter(t => t.businessId !== businessId));

    if (currentBusinessId === businessId) setCurrentBusinessId(null);
  };

  // --- Staff Join Store (Modal Submit) ---
  const handleJoinStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || user.role !== 'Staff') return;

    const code = joinStoreCode.trim().toUpperCase();
    if (!code) return;

    try {
      // ✅ Fix: 不用 RPC，改前端直接查 + 插，确保 status = 'active'
      // 1. 查店铺
      const { data: business, error: findErr } = await supabase
        .from('businesses')
        .select('id, name, owner_id')
        .eq('join_code', code)
        .single();

      if (findErr || !business) {
        console.error('Find business failed:', findErr);
        alert('Invalid or unauthorized store code.');
        return;
      }

      // 2. 直接插入 active member
      const { error: joinErr } = await supabase
        .from('business_members')
        .insert({
          business_id: business.id,
          user_id: user.id,
          role: 'staff', // 修正：使用 'staff' 符合資料庫 check constraint
          status: 'active' // 重点：直接 Active，不再 Pending
        });

      if (joinErr) {
        // 23505 = unique constraint violation (already joined)
        if (joinErr.code === '23505') {
          alert('You are already a member of this store.');
        } else {
          alert(joinErr.message || 'Join failed');
        }
        return;
      }

      // 3. 成功 -> 更新本地状态
      const newMembership = {
        id: `${user.id}_${business.id}`,
        businessId: business.id,
        name: user.name,
        email: user.email,
        role: 'Server',
        hourlyRate: 0,
        status: 'Active',
      };

      setStaff(prev => [...prev, newMembership as Staff]);

      // 还要把 business 加到 businesses 列表里供 dropdown 显示
      setBusinesses(prev => {
        if (prev.some(b => b.id === business.id)) return prev;
        return [...prev, {
          id: business.id,
          name: business.name,
          ownerId: business.owner_id,
          joinCode: '',
          address: '', hours: '', contactInfo: '', notes: '',
          customCategories: [], customLocations: [], pendingStaffIds: []
        }];
      });

      setJoinStoreCode('');
      setJoinStoreNameAlias('');
      setIsJoinStoreModalOpen(false);

      // 自动切过去
      if (window.confirm(`Joined ${business.name} successfully! Switch to it now?`)) {
        setCurrentBusinessId(business.id);
        setView(ViewState.DASHBOARD);
      }

    } catch (err: any) {
      console.error('Join store error:', err);
      alert(err.message);
    }
  };

  // --- Data Handlers ---
  const handleScanResult = async (items: InventoryItem[]) => {
    if (!currentBusinessId) return;

    const itemsWithBiz = items.map(i => ({ ...i, businessId: currentBusinessId }));

    try {
      // 先用当前 inventory（已从 DB load）做匹配：同名则累加数量
      for (const newItem of itemsWithBiz) {
        const matched = inventory.find(
          i =>
            i.businessId === currentBusinessId &&
            i.name.trim().toLowerCase() === (newItem.name || '').trim().toLowerCase()
        );

        if (matched) {
          const newQtyValue = Number(matched.quantityValue || 0) + Number(newItem.quantityValue || 0);

          const payload: any = {
            name: matched.name,
            canonical_name: matched.name,
            category: newItem.category || matched.category || null,
            location: newItem.location || matched.location || null,
            quantity_value: newQtyValue,
            quantity_unit: matched.quantityUnit || newItem.quantityUnit || 'pcs',
            unit_cost: Number(newItem.unitCost ?? matched.unitCost ?? 0),
            // ✅ 修复：转换日期格式
            expiry_date: toISODate(newItem.expiryDate) || toISODate(matched.expiryDate),
          };

          const { error } = await supabase
            .from('inventory_items')
            .update(payload)
            .eq('id', matched.id)
            .eq('business_id', currentBusinessId);

          if (error) throw error;
        } else {
          const payload: any = {
            business_id: currentBusinessId,
            name: newItem.name,
            canonical_name: newItem.name,
            category: newItem.category || null,
            location: newItem.location || null,
            quantity_value: Number(newItem.quantityValue || 0),
            quantity_unit: newItem.quantityUnit || 'pcs',
            unit_cost: Number(newItem.unitCost || 0),
            // ✅ 修复：转换日期格式 + 默认使用今天日期
            expiry_date: toISODate(newItem.expiryDate),
            added_date: new Date().toISOString().split('T')[0],
          };

          const { error } = await supabase.from('inventory_items').insert(payload);
          if (error) throw error;
        }
      }

      await loadInventory(currentBusinessId);
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

  const handleDeleteInventoryItem = async (id: string) => {
    if (!currentBusinessId) return;
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('business_id', currentBusinessId);

    if (error) {
      alert(error.message || 'Delete failed');
      return;
    }

    setInventory(prev => prev.filter(i => i.id !== id));
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
            setView(ViewState.DASHBOARD);
            return;
          }

          setUser(nextUser);
          setCurrentBusinessId(null);
          setView(ViewState.DASHBOARD);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary font-sans flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-background fixed h-full z-10 print:hidden pr-6 border-r border-border">
        <div className="p-8 flex items-center space-x-3 mb-6">
          <div className="bg-white p-2 rounded-lg border border-border shadow-sm">
            <ChefHat className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-primary text-lg leading-none tracking-tight">SmartKitchen</h1>
            <p className="text-xs text-secondary font-medium mt-1">AI Workspace</p>
          </div>
        </div>

        <div className="px-6 space-y-2 flex-1 overflow-y-auto">
          {/* Business Switcher */}
          {(user.role === 'Manager' || user.role === 'Staff') && (
            <div className="relative mb-10">
              <button
                onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-border rounded-lg text-sm text-primary hover:border-accent transition-colors shadow-sm"
              >
                <div className="flex items-center space-x-3 truncate">
                  <Building2 className="w-4 h-4 text-secondary" />
                  <span className="font-semibold truncate">
                    {activeBusiness ? activeBusiness.name : user.role === 'Manager' ? 'Master Dashboard' : 'Select Store'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-secondary" />
              </button>

              {isBusinessDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-border z-20 py-2">
                  {user.role === 'Manager' && (
                    <button
                      onClick={() => handleSwitchBusiness(null)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-background font-medium"
                    >
                      <span className="text-primary">Master View</span>
                      {!currentBusinessId && <Check className="w-4 h-4 text-accent" />}
                    </button>
                  )}

                  {accessibleBusinesses.length > 0 ? (
                    accessibleBusinesses.map(b => {
                      const mem = user.role === 'Staff' ? staffMemberships.find(m => m.businessId === b.id) : null;
                      const isPending = mem?.status === 'Pending';
                      return (
                        <button
                          key={b.id}
                          onClick={() => handleSwitchBusiness(b.id)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-background"
                        >
                          <span className="truncate text-secondary">
                            {b.name}
                            {user.role === 'Staff' && isPending ? ' (Pending)' : ''}
                          </span>
                          {b.id === currentBusinessId && <Check className="w-4 h-4 text-accent" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-2 text-xs text-secondary italic">No stores found.</div>
                  )}

                  {user.role === 'Staff' && (
                    <button
                      onClick={() => {
                        setIsBusinessDropdownOpen(false);
                        setIsJoinStoreModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-background border-t border-border mt-1 text-accent font-bold"
                    >
                      <span className="flex items-center">
                        <Plus className="w-3 h-3 mr-2" /> Add Store
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <div className="px-4 py-2 text-xs font-bold text-secondary uppercase tracking-widest opacity-70 mb-2">Modules</div>

            <button
              onClick={() => setView(ViewState.DASHBOARD)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.DASHBOARD
                ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                : 'text-secondary hover:text-primary hover:bg-white/50'
                }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setView(ViewState.INVENTORY)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.INVENTORY
                ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                : 'text-secondary hover:text-primary hover:bg-white/50'
                }`}
            >
              <Refrigerator className="w-5 h-5" />
              <span>Inventory</span>
            </button>

            <button
              onClick={() => setView(ViewState.CHEF)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.CHEF
                ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                : 'text-secondary hover:text-primary hover:bg-white/50'
                }`}
            >
              <ChefHat className="w-5 h-5" />
              <span>AI Chef</span>
            </button>

            {FEATURE_SHOPPING_LIST_ENABLED && (
              <button
                onClick={() => setView(ViewState.SHOPPING)}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.SHOPPING
                  ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                  : 'text-secondary hover:text-primary hover:bg-white/50'
                  }`}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Shopping List</span>
              </button>
            )}

            {user.role === 'Manager' && (
              <button
                onClick={() => setView(ViewState.RESTAURANT)}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${view === ViewState.RESTAURANT
                  ? 'bg-white text-primary font-semibold shadow-sm border border-border'
                  : 'text-secondary hover:text-primary hover:bg-white/50'
                  }`}
              >
                <Store className="w-5 h-5" />
                <span>Store Ops</span>
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 mt-auto border-t border-border bg-background/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 text-secondary hover:text-primary rounded-lg transition-colors text-sm font-medium hover:bg-white mb-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>

          <button
            onClick={() => setView(ViewState.PRIVACY)}
            className="w-full flex items-center space-x-3 px-4 py-2 text-secondary hover:text-primary rounded-lg transition-colors text-xs font-medium"
          >
            <Shield className="w-4 h-4" />
            <span>Cookies & Privacy</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 pb-24 md:pb-12 bg-white min-h-screen md:rounded-tl-2xl md:border-l md:border-border overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-border p-4 flex justify-between items-center sticky top-0 z-20">
          <h1 className="font-bold text-primary">SmartKitchen</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)} className="flex items-center text-secondary">
                <span className="mr-2 text-sm font-bold truncate max-w-[100px]">
                  {activeBusiness?.name || (user.role === 'Manager' ? 'Master' : 'Stores')}
                </span>
                <Building2 className="w-6 h-6" />
              </button>

              {isBusinessDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-border z-30 py-2">
                  {user.role === 'Manager' && (
                    <button
                      onClick={() => handleSwitchBusiness(null)}
                      className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-background font-bold"
                    >
                      Master View
                    </button>
                  )}

                  {accessibleBusinesses.map(b => {
                    const mem = user.role === 'Staff' ? staffMemberships.find(m => m.businessId === b.id) : null;
                    const isPending = mem?.status === 'Pending';
                    return (
                      <button
                        key={b.id}
                        onClick={() => handleSwitchBusiness(b.id)}
                        className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-background"
                      >
                        {b.name}
                        {user.role === 'Staff' && isPending ? ' (Pending)' : ''}
                      </button>
                    );
                  })}

                  {user.role === 'Staff' && (
                    <button
                      onClick={() => {
                        setIsBusinessDropdownOpen(false);
                        setIsJoinStoreModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-accent font-bold hover:bg-background border-t border-border mt-1"
                    >
                      + Add Store
                    </button>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setView(ViewState.PRIVACY)} className="text-secondary">
              <Shield className="w-6 h-6" />
            </button>
            <button onClick={handleLogout} className="text-secondary">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-16 max-w-6xl mx-auto min-h-screen">
          {/* MASTER DASHBOARD VIEW (Managers Only) */}
          {isMasterView && view === ViewState.DASHBOARD && (
            <div className="space-y-16 animate-in fade-in duration-500">
              <header className="flex justify-between items-end border-b border-border pb-6">
                <div>
                  <h2 className="text-4xl font-bold text-primary tracking-tight">
                    <EditableTitle defaultTitle="Master Dashboard" storageKey="overview_master_dashboard" />
                  </h2>
                  <p className="text-secondary mt-3 text-lg font-light">Overview of {accessibleBusinesses.length} locations</p>
                </div>
                <button
                  onClick={handleOpenCreateStore}
                  className="flex items-center px-6 py-3 bg-accent text-white rounded-lg shadow-sm text-sm font-semibold hover:bg-accentHover transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Location
                </button>
              </header>

              <section>
                <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6">Locations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {accessibleBusinesses.map(biz => {
                    const bizInv = inventory.filter(i => i.businessId === biz.id);
                    const bizSales = sales.filter(s => s.businessId === biz.id);
                    const totalRev = bizSales.reduce((acc, s) => acc + s.totalAmount, 0);
                    const alerts = bizInv.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date(Date.now() + 86400000 * 3)).length;

                    return (
                      <div
                        key={biz.id}
                        onClick={() => setCurrentBusinessId(biz.id)}
                        className="bg-white p-8 rounded-xl border border-border hover:border-accent hover:shadow-md transition-all cursor-pointer group relative"
                      >
                        <div className="flex justify-between items-start mb-8">
                          <div className="pr-10">
                            <h3 className="font-bold text-xl text-primary mb-2 group-hover:text-accent transition-colors">{biz.name}</h3>
                            {biz.address && (
                              <div className="flex items-center text-sm text-secondary">
                                <MapPin className="w-4 h-4 mr-1.5" />
                                <span className="truncate">{biz.address}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs bg-background px-2 py-1 rounded text-secondary font-mono border border-border">
                            {biz.joinCode}
                          </span>
                        </div>

                        <button
                          onClick={e => handleOpenEditStore(biz, e)}
                          className="absolute top-6 right-12 p-2 text-secondary hover:text-primary rounded-lg hover:bg-background transition-colors z-10"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <div className="space-y-4 pt-4 border-t border-border">
                          <div className="flex justify-between text-base items-center">
                            <span className="text-secondary font-medium">Revenue</span>
                            <span className="font-bold text-primary">${totalRev.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between text-base items-center">
                            <span className="text-secondary font-medium">Alerts</span>
                            <span className={`font-semibold ${alerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {alerts} items
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* SINGLE STORE DASHBOARD VIEW */}
          {!isMasterView && view === ViewState.DASHBOARD && (
            <div className="space-y-16 animate-in fade-in duration-500">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border pb-8">
                <div>
                  <h2 className="text-4xl font-bold text-primary tracking-tight">{user.name}</h2>
                  <p className="text-secondary mt-3 text-lg flex items-center">
                    {activeBusiness?.name || (user.role === 'Staff' ? 'No Store Selected' : 'Loading...')}
                    {activeBusiness && user.role === 'Manager' ? (
                      <span className="ml-4 text-xs bg-background text-secondary px-2 py-1 rounded border border-border font-mono">
                        {activeBusiness?.joinCode}
                      </span>
                    ) : activeBusiness ? (
                      <span className="ml-4 text-xs bg-accent text-white px-2 py-1 rounded border border-border font-bold">
                        STAFF
                      </span>
                    ) : null}
                  </p>
                </div>

                {user.role === 'Manager' && (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => openScanner('receipt')}
                      className="flex items-center px-6 py-3 bg-white text-primary border border-border rounded-lg shadow-sm hover:bg-background text-sm font-semibold transition-colors"
                    >
                      <ScanLine className="w-5 h-5 mr-2" />
                      Scan Invoice
                    </button>
                    <button
                      onClick={() => openScanner('fridge')}
                      className="flex items-center px-6 py-3 bg-accent text-white rounded-lg shadow-sm hover:bg-accentHover text-sm font-semibold transition-colors"
                    >
                      <ScanLine className="w-5 h-5 mr-2" />
                      Scan Fridge
                    </button>
                  </div>
                )}
              </header>

              {user.role === 'Staff' ? (
                <div className="space-y-8">
                  {activeBusiness ? (
                    <>
                      <StaffInventoryOverview inventory={filteredInventory} />

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                          <MenuManager
                            menu={filteredMenu}
                            inventory={filteredInventory}
                            onAddMenuItem={handleAddMenuItem}
                            onDeleteMenuItem={handleDeleteMenuItem}
                            onUpdateMenuItem={handleUpdateMenuItem}
                            isStaff={true}
                          />
                        </div>

                        <div className="h-[600px]">
                          <PrepList
                            tasks={filteredTasks}
                            currentUser={user}
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
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl">
                      <Store className="w-16 h-16 text-border mb-4" />
                      <h3 className="text-lg font-bold text-primary mb-2">No Store Selected</h3>
                      <p className="text-secondary mb-6 text-center max-w-md">
                        If you just joined, you may be waiting for approval. Or add a store using your invite code.
                      </p>
                      <button
                        onClick={() => setIsJoinStoreModalOpen(true)}
                        className="px-6 py-3 bg-accent text-white rounded-lg font-bold shadow-sm hover:bg-accentHover"
                      >
                        Add Store Code
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-12">
                    <section>
                      <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6">Inventory Breakdown</h3>
                      <div className="bg-white p-8 rounded-xl border border-border h-96 flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={(() => {
                                const data: any = {};
                                filteredInventory.forEach(i => (data[i.category] = (data[i.category] || 0) + 1));
                                return Object.keys(data).map(k => ({ name: k, value: data[k] }));
                              })()}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={100}
                              paddingAngle={4}
                              dataKey="value"
                              stroke="none"
                            >
                              {COLORS.map((c, i) => (
                                <Cell key={i} fill={c} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: 'none', padding: '8px 12px' }}
                              itemStyle={{ fontWeight: 600, color: '#111827' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  </div>

                  <div className="h-[400px]">
                    <PrepList
                      tasks={filteredTasks}
                      currentUser={user}
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
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INVENTORY VIEW */}
          {view === ViewState.INVENTORY &&
            (isMasterView ? (
              <div className="flex flex-col items-center justify-center h-96 animate-in fade-in duration-500">
                <Store className="w-16 h-16 text-border mb-6" />
                <p className="text-secondary text-lg">Select a store to view its inventory.</p>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in duration-500">
                <header className="flex justify-between items-end border-b border-border pb-6">
                  <div>
                    <h2 className="text-4xl font-bold text-primary tracking-tight">
                      <EditableTitle defaultTitle="Inventory" storageKey="module_inventory_title" />
                    </h2>
                    <p className="text-secondary mt-3 text-lg font-light">Manage ingredients and stock for {activeBusiness?.name}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => openScanner('receipt')}
                      className="flex items-center px-6 py-3 bg-white text-primary border border-border rounded-lg shadow-sm text-sm font-semibold hover:bg-background transition-colors"
                    >
                      <ScanLine className="w-5 h-5 mr-2" /> Scan
                    </button>
                    <button
                      onClick={() => {
                        setMetaTab('categories');
                        setMetaNewValue('');
                        setIsMetaManagerOpen(true);
                      }}
                      className="flex items-center px-6 py-3 bg-white text-primary border border-border rounded-lg shadow-sm text-sm font-semibold hover:bg-background transition-colors"
                    >
                      <Edit className="w-5 h-5 mr-2" />
                      Manage
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setIsEditModalOpen(true);
                      }}
                      className="flex items-center px-6 py-3 bg-accent text-white rounded-lg shadow-sm text-sm font-semibold hover:bg-accentHover"
                    >
                      <Plus className="w-5 h-5 mr-2" /> Add Item
                    </button>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border bg-white shadow-sm rounded-lg overflow-hidden">
                  {filteredInventory.map(item => (
                    <div key={item.id} className="border-r border-b border-border p-6 hover:bg-background transition-colors">
                      <InventoryCard
                        item={item}
                        onRemove={handleDeleteInventoryItem}
                        onEdit={it => {
                          setEditingItem(it);
                          setIsEditModalOpen(true);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

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
      {isJoinStoreModalOpen && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-border p-6 relative">
            <button onClick={() => setIsJoinStoreModalOpen(false)} className="absolute top-4 right-4 text-secondary hover:text-primary">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-xl mb-4 bg-background border border-border">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-primary">Join a Store</h3>
              <p className="text-secondary text-sm mt-1">Enter the code provided by your manager.</p>
            </div>

            <form onSubmit={handleJoinStoreSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Store Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DK2025"
                  value={joinStoreCode}
                  onChange={e => setJoinStoreCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-center font-mono text-lg uppercase tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Alias (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. My Workplace"
                  value={joinStoreNameAlias}
                  onChange={e => setJoinStoreNameAlias(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-white rounded-lg font-bold shadow-sm hover:bg-black transition-colors flex items-center justify-center"
              >
                Join Store <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </form>
          </div>
        </div>
      )}
      {isMetaManagerOpen && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-border p-6 relative">
            <button
              onClick={() => setIsMetaManagerOpen(false)}
              className="absolute top-4 right-4 text-secondary hover:text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-primary">Manage Categories & Locations</h3>
            <p className="text-sm text-secondary mt-1">Rename / delete will update your inventory records too.</p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setMetaTab('categories')}
                className={`px-4 py-2 rounded-lg text-sm font-bold border ${metaTab === 'categories' ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-border'
                  }`}
              >
                Categories
              </button>
              <button
                onClick={() => setMetaTab('locations')}
                className={`px-4 py-2 rounded-lg text-sm font-bold border ${metaTab === 'locations' ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-border'
                  }`}
              >
                Locations
              </button>
            </div>

            <div className="mt-5 space-y-3 max-h-[360px] overflow-auto pr-1">
              {(metaTab === 'categories' ? derivedCategories : derivedLocations).map(v => (
                <div key={v} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div className="font-semibold text-primary truncate">{v}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const nv = window.prompt('Rename to:', v);
                        if (!nv) return;
                        await renameMetaItem(metaTab, v, nv);
                      }}
                      className="px-3 py-2 rounded-lg bg-white border border-border text-primary font-bold text-xs hover:bg-background"
                    >
                      Rename
                    </button>
                    <button
                      onClick={async () => {
                        await deleteMetaItem(metaTab, v);
                      }}
                      className="px-3 py-2 rounded-lg bg-white border border-border text-red-600 font-bold text-xs hover:bg-background"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {(metaTab === 'categories' ? derivedCategories : derivedLocations).length === 0 && (
                <div className="p-6 text-center text-secondary text-sm border border-dashed border-border rounded-lg">
                  No items yet.
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <input
                value={metaNewValue}
                onChange={e => setMetaNewValue(e.target.value)}
                placeholder={metaTab === 'categories' ? 'Add new category...' : 'Add new location...'}
                className="flex-1 px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
              />
              <button
                onClick={() => {
                  addMetaItem(metaTab, metaNewValue);
                  setMetaNewValue('');
                }}
                className="px-5 py-3 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accentHover"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
