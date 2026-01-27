/**
 * StaffTab Component
 * 
 * 员工管理页面，包含：
 * - 待审核员工请求
 * - 活跃员工列表
 * - 排班表
 */

import React, { useState } from 'react';
import { RefreshCcw, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useOperationsData } from '../../hooks/useOperationsData';
import { useStaffActions } from '../../hooks/useStaffActions';
import StaffScheduleTable from '../../../../components/StaffScheduleTable';
import AddShiftModal from '../../../../components/AddShiftModal';
import { StaffCalendar } from '../../../../components/StaffCalendar';
import { Shift } from '../../../../types';

export const StaffTab: React.FC = () => {
    const {
        pendingStaff,
        activeStaff,
        shifts,
        currentBusinessId,
        refreshDashboard,
        setShifts
    } = useOperationsData();

    const { approveMember, rejectMember, actingId } = useStaffActions(
        currentBusinessId,
        refreshDashboard
    );

    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);

    const handleShiftSave = (shift: Shift) => {
        setShifts(prev => {
            const exists = prev.find(s => s.id === shift.id);
            if (exists) return prev.map(s => s.id === shift.id ? shift : s);
            return [...prev, shift];
        });
        setIsShiftModalOpen(false);
        setEditingShift(null);
    };

    const handleEditShift = (shift: Shift) => {
        setEditingShift(shift);
        setIsShiftModalOpen(true);
    };

    const handleDeleteShift = (id: string) => {
        setShifts(prev => prev.filter(s => s.id !== id));
    };

    return (
        <div className="space-y-8">
            {/* Refresh Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => refreshDashboard()}
                    className="px-4 py-2 rounded-lg bg-white border border-border text-primary font-bold text-sm hover:bg-background flex items-center"
                >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Refresh
                </button>
            </div>

            {/* Pending Requests */}
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

            {/* Active Staff */}
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

            {/* Schedule Table */}
            <StaffScheduleTable
                staff={activeStaff}
                shifts={shifts}
                businessId={currentBusinessId || ''}
                onUpdateShift={handleShiftSave}
                onAddStaff={() => {
                    setEditingShift(null);
                    setIsShiftModalOpen(true);
                }}
                onEditShift={handleEditShift}
                onDeleteShift={handleDeleteShift}
            />

            {/* Add Shift Modal */}
            <AddShiftModal
                isOpen={isShiftModalOpen}
                onClose={() => setIsShiftModalOpen(false)}
                onSave={handleShiftSave}
                onDelete={handleDeleteShift}
                staff={activeStaff}
                initialShift={editingShift}
            />

            {/* Staff Calendar */}
            {currentBusinessId && <StaffCalendar businessId={currentBusinessId} />}
        </div>
    );
};
