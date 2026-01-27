/**
 * OperationsPage
 * 
 * 主入口：整合所有 Operations 功能
 * - 使用 OperationsLayout 进行 Tab 导航
 * - 声明式Tab配置
 */

import React from 'react';
import { OperationsLayout } from './components/OperationsLayout';
import { OverviewTab } from './components/overview/OverviewTab';
import { StaffTab } from './components/staff/StaffTab';
import { MenuTab } from './components/menu/MenuTab';
import { InsightsTab } from './components/insights/InsightsTab';

export const OperationsPage: React.FC = () => {
    const tabs = [
        { id: 'overview', label: 'Overview', component: OverviewTab },
        { id: 'staff', label: 'Staff', component: StaffTab },
        { id: 'menu', label: 'Menu', component: MenuTab },
        { id: 'insights', label: 'Insights', component: InsightsTab },
    ];

    return <OperationsLayout tabs={tabs} />;
};
