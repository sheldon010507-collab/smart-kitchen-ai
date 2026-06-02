/**
 * StaffDashboard Component
 * 
 * Single store overview for staff members
 * Shows inventory overview, menu manager, and prep list
 * 
 * Extracted from App.tsx
 */

import React from 'react';
import { Store } from 'lucide-react';
import StaffInventoryOverview from '../../components/StaffInventoryOverview';
import { MenuManager } from '../menu';
import PrepList from '../../components/PrepList';
import { InventoryItem, MenuItem, PrepTask, User, Business } from '../../types';
import { StaffBrainActivity, TelegramLinkManager } from '../brain';

interface StaffDashboardProps {
    user: User;
    activeBusiness: Business | null;
    inventory: InventoryItem[];
    menu: MenuItem[];
    tasks: PrepTask[];
    onAddMenuItem: (item: any) => void;
    onDeleteMenuItem: (id: string) => void;
    onUpdateMenuItem: (item: any) => void;
    onAddTask: (text: string) => void;
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onOpenJoinStore: () => void;
}

export function StaffDashboard({
    user,
    activeBusiness,
    inventory,
    menu,
    tasks,
    onAddMenuItem,
    onDeleteMenuItem,
    onUpdateMenuItem,
    onAddTask,
    onToggleTask,
    onDeleteTask,
    onOpenJoinStore,
}: StaffDashboardProps) {

    return (
        <div className="space-y-16 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 border-b border-border pb-6 md:pb-8">
                <div>
                    <h2 className="text-2xl md:text-4xl font-bold text-primary tracking-tight">{user.name}</h2>
                    <p className="text-secondary mt-2 md:mt-3 text-base md:text-lg flex flex-wrap items-center gap-2">
                        {activeBusiness?.name || 'No Store Selected'}
                        {activeBusiness && (
                            <span className="text-xs bg-accent text-white px-2 py-1 rounded border border-border font-bold">
                                STAFF
                            </span>
                        )}
                    </p>
                </div>
            </header>

            <div className="space-y-8">
                {activeBusiness ? (
                    <>
                        <StaffInventoryOverview inventory={inventory} />

                        <StaffBrainActivity businessId={activeBusiness.id} />

                        <TelegramLinkManager />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <MenuManager
                                    menu={menu}
                                    inventory={inventory}
                                    onAddMenuItem={onAddMenuItem}
                                    onDeleteMenuItem={onDeleteMenuItem}
                                    onUpdateMenuItem={onUpdateMenuItem}
                                    isStaff={true}
                                />
                            </div>

                            <div className="h-[600px]">
                                <PrepList
                                    tasks={tasks}
                                    currentUser={user}
                                    onAddTask={onAddTask}
                                    onToggleTask={onToggleTask}
                                    onDeleteTask={onDeleteTask}
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
                            onClick={onOpenJoinStore}
                            className="px-6 py-3 bg-accent text-white rounded-lg font-bold shadow-sm hover:bg-accentHover"
                        >
                            Add Store Code
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StaffDashboard;
