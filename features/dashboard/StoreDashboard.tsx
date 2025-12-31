/**
 * StoreDashboard Component (Manager View)
 * 
 * Single store overview for managers
 * Shows inventory breakdown and prep list
 * 
 * Extracted from App.tsx
 */

import React from 'react';
import { ScanLine, Store } from 'lucide-react';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import PrepList from '../../components/PrepList';
import { InventoryItem, PrepTask, User, Business } from '../../types';

const COLORS = ['#475569', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9'];

interface StoreDashboardProps {
    user: User;
    activeBusiness: Business;
    inventory: InventoryItem[];
    tasks: PrepTask[];
    onAddTask: (text: string) => void;
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onOpenScanner: (mode: 'receipt' | 'fridge' | 'sales') => void;
}



export function StoreDashboard({
    user,
    activeBusiness,
    inventory,
    tasks,
    onAddTask,
    onToggleTask,
    onDeleteTask,
    onOpenScanner,
}: StoreDashboardProps) {

    return (
        <div className="space-y-16 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 border-b border-border pb-6 md:pb-8">
                <div>
                    <h2 className="text-2xl md:text-4xl font-bold text-primary tracking-tight">{user.name}</h2>
                    <p className="text-secondary mt-2 md:mt-3 text-base md:text-lg flex flex-wrap items-center gap-2">
                        {activeBusiness.name}
                        <span className="text-xs bg-background text-secondary px-2 py-1 rounded border border-border font-mono">
                            {activeBusiness.joinCode}
                        </span>
                    </p>
                </div>

                <div className="grid grid-cols-2 md:flex md:space-x-4 gap-2 md:gap-0 w-full md:w-auto">
                    <button
                        onClick={() => onOpenScanner('receipt')}
                        className="flex items-center justify-center px-3 md:px-6 py-2.5 md:py-3 bg-white text-primary border border-border rounded-lg shadow-sm hover:bg-background text-sm font-semibold transition-colors"
                    >
                        <ScanLine className="w-4 md:w-5 h-4 md:h-5 mr-1.5 md:mr-2" />
                        <span className="hidden sm:inline">Scan </span>Invoice
                    </button>
                    <button
                        onClick={() => onOpenScanner('fridge')}
                        className="flex items-center justify-center px-3 md:px-6 py-2.5 md:py-3 bg-accent text-white rounded-lg shadow-sm hover:bg-accentHover text-sm font-semibold transition-colors"
                    >
                        <ScanLine className="w-4 md:w-5 h-4 md:h-5 mr-1.5 md:mr-2" />
                        <span className="hidden sm:inline">Scan </span>Fridge
                    </button>
                </div>
            </header>

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
                                            inventory.forEach(i => (data[i.category] = (data[i.category] || 0) + 1));
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
                        tasks={tasks}
                        currentUser={user}
                        onAddTask={onAddTask}
                        onToggleTask={onToggleTask}
                        onDeleteTask={onDeleteTask}
                    />
                </div>
            </div>
        </div>
    );
}

export default StoreDashboard;
