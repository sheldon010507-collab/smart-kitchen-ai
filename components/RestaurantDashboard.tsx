
import React, { useMemo, useState } from 'react';
import { SalesReceipt, Staff, Shift, MenuItem, InventoryItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Loader2, Lightbulb, CheckCircle2, XCircle, RefreshCcw, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AddShiftModal from './AddShiftModal';
import StaffScheduleTable from './StaffScheduleTable';
import { MenuManager } from '../features/menu';
import { generateOperationalInsights } from '../services/geminiService';
import { StaffCalendar } from './StaffCalendar';

interface Props {
  sales: SalesReceipt[];
  staff: Staff[];
  shifts: Shift[];
  menu: MenuItem[];
  inventory: InventoryItem[];
  currentBusinessId: string;

  onAddShift: (shift: Shift) => void;
  onDeleteShift: (id: string) => void;

  onAddStaff: (staff: Staff) => void;
  onAddMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  onUpdateMenuItem: (item: MenuItem) => void;

  onOpenScanner: () => void;

  onRefreshMembers?: () => void | Promise<void>; // ✅ App 里传进来
}

const RestaurantDashboard: React.FC<Props> = ({
  sales,
  staff,
  shifts,
  menu,
  inventory,
  currentBusinessId,
  onAddShift,
  onDeleteShift,
  onAddStaff,
  onAddMenuItem,
  onDeleteMenuItem,
  onUpdateMenuItem,
  onOpenScanner,
  onRefreshMembers,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'staff' | 'menu' | 'insights'>('overview');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const pendingStaff = useMemo(
    () => staff.filter(s => String(s.status || '').toLowerCase() === 'pending'),
    [staff]
  );
  const activeStaff = useMemo(
    () => staff.filter(s => String(s.status || '').toLowerCase() === 'active'),
    [staff]
  );

  // --- Calculations ---
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalLaborCost = shifts.reduce((sum, s) => sum + s.totalCost, 0);

  const totalCOGS = sales.reduce((sum, receipt) => {
    return (
      sum +
      receipt.items.reduce((rSum, item) => {
        const menuItem = menu.find(m => m.name.toLowerCase().includes(item.name.toLowerCase()));
        const cost = menuItem ? menuItem.estimatedCost : item.price * 0.3;
        return rSum + cost * item.quantity;
      }, 0)
    );
  }, 0);

  const primeCost = totalLaborCost + totalCOGS;
  const grossMargin = totalRevenue - totalCOGS;
  const laborPercent = totalRevenue > 0 ? (totalLaborCost / totalRevenue) * 100 : 0;
  const primePercent = totalRevenue > 0 ? (primeCost / totalRevenue) * 100 : 0;

  const handleGenerateInsights = async () => {
    setLoadingInsights(true);
    try {
      const result = await generateOperationalInsights(sales, shifts, menu);
      setInsights(result);
    } catch (e) {
      console.error(e);
      setInsights('Failed to generate insights.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleShiftSave = (shift: Shift) => {
    onAddShift(shift);
    setIsShiftModalOpen(false);
    setEditingShift(null);
  };

  const handleUpdateShift = (shift: Shift) => onAddShift(shift);

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setIsShiftModalOpen(true);
  };

  const approveMember = async (memberId: string) => {
    try {
      setActingId(memberId);

      // ✅ m.id 格式可能是 "userId_businessId" 或純 "userId"
      const userId = memberId.includes('_') ? memberId.split('_')[0] : memberId;

      const { error } = await supabase
        .from('business_members')
        .update({ status: 'active' })
        .eq('business_id', currentBusinessId)
        .eq('user_id', userId);

      if (error) {
        alert(error.message || 'Approve failed');
        return;
      }

      await onRefreshMembers?.();
    } finally {
      setActingId(null);
    }
  };

  const rejectMember = async (memberId: string) => {
    try {
      setActingId(memberId);

      // ✅ m.id 格式可能是 "userId_businessId" 或純 "userId"
      const userId = memberId.includes('_') ? memberId.split('_')[0] : memberId;

      const { error } = await supabase
        .from('business_members')
        .delete()
        .eq('business_id', currentBusinessId)
        .eq('user_id', userId);

      if (error) {
        alert(error.message || 'Remove failed');
        return;
      }

      await onRefreshMembers?.();
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Header with Tabs */}
      <div className="border-b border-[#e9e9e7]">
        <h2 className="text-2xl font-bold text-[#37352f] mb-6">Operations</h2>
        <div className="flex space-x-6 pb-px overflow-x-auto">
          {['overview', 'sales', 'staff', 'menu', 'insights'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-3 text-sm font-semibold capitalize transition-colors border-b-2 ${activeTab === tab
                ? 'border-[#37352f] text-[#37352f]'
                : 'border-transparent text-[#9b9a97] hover:text-[#37352f]'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Revenue', value: `$${totalRevenue.toFixed(0)}` },
              { label: 'Labor Cost', value: `$${totalLaborCost.toFixed(0)}`, sub: `${laborPercent.toFixed(1)}%` },
              { label: 'Est. COGS', value: `$${totalCOGS.toFixed(0)}` },
              { label: 'Prime Cost', value: `$${primeCost.toFixed(0)}`, sub: `${primePercent.toFixed(1)}%` },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white p-5 rounded-lg border border-[#e9e9e7] shadow-sm">
                <p className="text-xs font-medium text-[#787774] mb-3">{kpi.label}</p>
                <p className="text-2xl font-bold text-[#37352f]">{kpi.value}</p>
                {kpi.sub && <p className="text-sm text-[#9b9a97] mt-1">{kpi.sub}</p>}
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg border border-[#e9e9e7] shadow-sm h-80">
            <h3 className="text-sm font-semibold text-[#787774] mb-6">Financial Overview</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart
                data={[
                  { name: 'Revenue', amount: totalRevenue },
                  { name: 'Labor', amount: totalLaborCost },
                  { name: 'COGS', amount: totalCOGS },
                  { name: 'Margin', amount: grossMargin },
                ]}
              >
                <XAxis dataKey="name" stroke="#787774" fontSize={12} tickLine={false} axisLine={false} fontWeight={500} />
                <YAxis
                  stroke="#787774"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `$${val}`}
                  fontWeight={500}
                />
                <Tooltip
                  cursor={{ fill: '#f7f6f3' }}
                  contentStyle={{ border: '1px solid #e9e9e7', boxShadow: 'none', borderRadius: '8px' }}
                />
                <Bar dataKey="amount" fill="#37352f" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SALES TAB */}
      {activeTab === 'sales' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center p-8 bg-background rounded-xl border border-border">
            <div>
              <h3 className="text-lg font-bold text-primary">Revenue Recognition</h3>
              <p className="text-secondary text-sm mt-1">Scan POS receipts to record sales.</p>
            </div>
            <button
              onClick={onOpenScanner}
              className="bg-primary text-white px-6 py-3 rounded-lg text-sm font-bold tracking-wide hover:bg-black transition-colors flex items-center shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Scan Receipt
            </button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left">
              <thead className="bg-background text-secondary uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.map(receipt => (
                  <tr key={receipt.id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-primary font-medium text-sm">{receipt.date}</td>
                    <td className="px-6 py-4 text-secondary text-sm font-mono">{receipt.time}</td>
                    <td className="px-6 py-4 text-secondary text-sm">{receipt.items.length} items</td>
                    <td className="px-6 py-4 text-right font-bold text-primary text-sm">${receipt.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sales.length === 0 && <p className="p-12 text-center text-secondary text-sm">No sales recorded yet.</p>}
          </div>
        </div>
      )}

      {/* STAFF TAB */}
      {activeTab === 'staff' && (
        <div className="space-y-8">
          <div className="flex justify-end">
            <button
              onClick={() => onRefreshMembers?.()}
              className="px-4 py-2 rounded-lg bg-white border border-border text-primary font-bold text-sm hover:bg-background flex items-center"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>

          {pendingStaff.length > 0 ? (
            <div className="bg-white p-8 rounded-xl border border-border">
              <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6">
                Pending Join Requests ({pendingStaff.length})
              </h3>

              <div className="space-y-3">
                {pendingStaff.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="min-w-0">
                      <div className="font-bold text-primary truncate">{m.name || 'Staff'}</div>
                      <div className="text-xs text-secondary truncate">{m.email || m.id}</div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => approveMember(m.id)}
                        disabled={actingId === m.id}
                        className="px-4 py-2 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accentHover flex items-center disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </button>

                      <button
                        onClick={() => rejectMember(m.id)}
                        disabled={actingId === m.id}
                        className="px-4 py-2 rounded-lg bg-white border border-border text-primary font-bold text-sm hover:bg-background flex items-center disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-border">
              <p className="text-secondary text-sm">No pending join requests.</p>
            </div>
          )}

          {/* Active Staff Members */}
          {activeStaff.length > 0 && (
            <div className="bg-white p-8 rounded-xl border border-border">
              <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6">
                Active Staff ({activeStaff.length})
              </h3>

              <div className="space-y-3">
                {activeStaff.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-background transition-colors">
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        {(m.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-primary truncate">{m.name || 'Staff'}</div>
                        <div className="text-xs text-secondary truncate">{m.email || m.role || 'No email'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to remove ${m.name || 'this staff member'} from this store?`)) {
                          rejectMember(m.id);
                        }
                      }}
                      disabled={actingId === m.id}
                      className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 flex items-center disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <StaffScheduleTable
            staff={activeStaff}
            shifts={shifts}
            businessId={currentBusinessId}
            onUpdateShift={handleUpdateShift}
            onAddStaff={() => {
              setEditingShift(null);
              setIsShiftModalOpen(true);
            }}
            onEditShift={handleEditShift}
            onDeleteShift={onDeleteShift}
          />

          <AddShiftModal
            isOpen={isShiftModalOpen}
            onClose={() => setIsShiftModalOpen(false)}
            onSave={handleShiftSave}
            onDelete={onDeleteShift}
            staff={activeStaff}
            initialShift={editingShift}
          />

          {/* ✅ Staff Calendar - 周/月/年视图，支持添加笔记和导出 Excel */}
          <StaffCalendar businessId={currentBusinessId} />
        </div>
      )}

      {/* MENU TAB */}
      {activeTab === 'menu' && (
        <MenuManager
          menu={menu}
          inventory={inventory}
          onAddMenuItem={onAddMenuItem}
          onDeleteMenuItem={onDeleteMenuItem}
          onUpdateMenuItem={onUpdateMenuItem}
        />
      )}

      {/* INSIGHTS TAB */}
      {activeTab === 'insights' && (
        <div className="space-y-8">
          <div className="bg-background p-10 rounded-xl border border-border">
            <h2 className="text-2xl font-bold mb-3 text-primary tracking-tight">AI Operations Advisor</h2>
            <p className="text-secondary mb-8 text-base">Analyze trends and receive strategic advice based on your data.</p>
            <button
              onClick={handleGenerateInsights}
              disabled={loadingInsights}
              className="px-6 py-3 bg-accent text-white font-bold rounded-lg hover:bg-accentHover transition-colors flex items-center disabled:opacity-50 shadow-sm text-sm"
            >
              {loadingInsights ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Lightbulb className="w-5 h-5 mr-2" />}
              Generate Insights
            </button>
          </div>

          {insights && (
            <div className="bg-white p-10 rounded-xl border border-border shadow-sm">
              <div className="prose prose-slate max-w-none text-primary">
                {insights.split('\n').map((line, i) => (
                  <p key={i} className="mb-4 leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantDashboard;
