/**
 * OperationsLayout Component
 * 
 * 布局组件，负责：
 * - Tab 导航
 * - 渲染当前激活的 Tab
 */

import React, { useState } from 'react';

interface Tab {
    id: string;
    label: string;
    component: React.ComponentType;
}

interface OperationsLayoutProps {
    tabs: Tab[];
    defaultTab?: string;
}

export const OperationsLayout: React.FC<OperationsLayoutProps> = ({
    tabs,
    defaultTab = tabs[0]?.id
}) => {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const CurrentTabComponent = tabs.find(t => t.id === activeTab)?.component;

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Header with Tabs */}
            <div className="border-b border-[#e9e9e7]">
                <h2 className="text-2xl font-bold text-[#37352f] mb-6">Operations</h2>
                <div className="flex space-x-6 pb-px overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 text-sm font-semibold capitalize transition-colors border-b-2 ${activeTab === tab.id
                                    ? 'border-[#37352f] text-[#37352f]'
                                    : 'border-transparent text-[#9b9a97] hover:text-[#37352f]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {CurrentTabComponent && <CurrentTabComponent />}
        </div>
    );
};
