/**
 * OverviewTab Component
 * 
 * 概览页面，显示：
 * - 劳动成本统计
 * - 快速统计网格（员工、班次、菜单）
 */

import React from 'react';
import { useOperationsData } from '../../hooks/useOperationsData';
import { WastageCard } from '../wastage/WastageCard';
import PrepList from '../../../../components/PrepList';
import { useAuthContext } from '../../../../lib/AuthContext';

export const OverviewTab: React.FC = () => {
    const { user } = useAuthContext();
    const { stats, prepTasks, handleAddPrepTask, handleDeletePrepTask } = useOperationsData();

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Labor Cost */}
                <div className="bg-white p-6 rounded-lg border border-[#e9e9e7] shadow-sm">
                    <p className="text-xs font-medium text-[#787774] mb-3">Labor Cost</p>
                    <p className="text-3xl font-bold text-[#37352f]">${stats.totalLaborCost.toFixed(0)}</p>
                    <p className="text-sm text-[#9b9a97] mt-2">Total labor cost from shifts</p>
                </div>

                {/* Inventory Value */}
                <div className="bg-white p-6 rounded-lg border border-[#e9e9e7] shadow-sm">
                    <p className="text-xs font-medium text-[#787774] mb-3">Inventory Value</p>
                    <p className="text-3xl font-bold text-[#37352f]">${(stats.totalInventoryValue || 0).toFixed(0)}</p>
                    <p className="text-sm text-[#9b9a97] mt-2">Total estimated value of stock</p>
                </div>

                {/* Food Cost % */}
                <div className="bg-white p-6 rounded-lg border border-[#e9e9e7] shadow-sm">
                    <p className="text-xs font-medium text-[#787774] mb-3">Avg. Food Cost</p>
                    <p className="text-3xl font-bold text-[#37352f]">{((stats.avgFoodCost || 0) * 100).toFixed(1)}%</p>
                    <p className="text-sm text-[#9b9a97] mt-2">Target: &lt;30%</p>
                </div>

                {/* Wastage */}
                <WastageCard
                    totalWastage={stats.totalWastage}
                    wastageRate={stats.wastageRate}
                    recordCount={0}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Stats Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-[#e9e9e7]">
                        <p className="text-xs font-medium text-[#787774] mb-2">Staff Members</p>
                        <p className="text-2xl font-bold text-[#37352f]">{stats.staffCount}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-[#e9e9e7]">
                        <p className="text-xs font-medium text-[#787774] mb-2">Active Shifts</p>
                        <p className="text-2xl font-bold text-[#37352f]">{stats.activeShifts}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-[#e9e9e7]">
                        <p className="text-xs font-medium text-[#787774] mb-2">Menu Items</p>
                        <p className="text-2xl font-bold text-[#37352f]">{stats.menuItems}</p>
                    </div>
                </div>

                <div className="h-[360px]">
                    <PrepList
                        tasks={prepTasks}
                        currentUser={user || undefined}
                        onAddTask={handleAddPrepTask}
                        onToggleTask={handleDeletePrepTask}
                        onDeleteTask={handleDeletePrepTask}
                    />
                </div>
            </div>

            {/* Info Message */}
            <div className="bg-[#f7f6f3] p-4 rounded-lg border border-[#e9e9e7]">
                <p className="text-sm text-[#787774]">
                    💡 <strong>Store Operations Dashboard</strong> - Track labor costs, manage staff, and monitor operations.
                </p>
            </div>
        </div>
    );
};
