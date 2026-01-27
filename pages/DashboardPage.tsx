import React, { useState } from 'react';
import { useBusiness } from '../lib/BusinessContext';
import { useInventoryContext } from '../lib/InventoryContext';
import { useDashboardData } from '../hooks/useDashboardData';
// RestaurantDashboard deprecated - replaced by OperationsPage
import { MasterDashboard } from '../features/dashboard/MasterDashboard';
import { StaffDashboard } from '../features/dashboard/StaffDashboard';
import ChefView from '../components/ChefView';
import { useAuthContext } from '../lib/AuthContext';
import { useShoppingListSummary } from '../features/shopping-list';
import { ViewState, Business } from '../types';
import StoreModal from '../components/StoreModal';
import { JoinStoreModal } from '../components/modals/JoinStoreModal';
import TemplateOnboardingModal from '../components/modals/TemplateOnboardingModal';
import { ChefHat } from 'lucide-react';
import { OperationsPage } from '../features/operations';

import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';

export const DashboardPage = () => {
    const { activeBusiness, currentBusinessId, isMasterView,
        setCurrentBusinessId, businesses, createBusiness, updateBusiness, deleteBusiness, joinBusinessByCode } = useBusiness();
    const { user } = useAuthContext();
    const location = useLocation();
    const navigate = useNavigate();

    // Get onOpenScanner from outlet context (passed from App.tsx)
    const outletContext = useOutletContext<{ onOpenScanner?: (mode: 'receipt' | 'fridge') => void }>();
    const onOpenScanner = outletContext?.onOpenScanner || (() => console.warn('Scanner not available'));

    // Data Hook (Shifts, Menu, Tasks, Staff)
    const {
        shifts, setShifts,
        menu, setMenu,
        prepTasks, setPrepTasks,
        staff, setStaff,
        refreshDashboard
    } = useDashboardData(currentBusinessId);

    // Inventory Context
    const { inventory } = useInventoryContext();

    // Shopping List Summary (For Master Dashboard)
    const { summaries: shoppingListSummaries, loading: shoppingListLoading } = useShoppingListSummary(
        user?.role === 'Manager' && isMasterView ? user?.id : null
    );

    // Modal State
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [isJoinStoreModalOpen, setIsJoinStoreModalOpen] = useState(false);
    const [joinStoreCode, setJoinStoreCode] = useState('');
    const [joinStoreNameAlias, setJoinStoreNameAlias] = useState('');
    const [showTemplateOnboarding, setShowTemplateOnboarding] = useState(false);

    // Effect: Check query params for actions
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('join') === 'true') {
            setIsJoinStoreModalOpen(true);
            // Clear param
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, navigate]);

    // Handlers
    const handleOpenCreateStore = () => {
        setEditingBusiness(null);
        setIsStoreModalOpen(true);
    };

    const handleOpenEditStore = (biz: Business) => {
        setEditingBusiness(biz);
        setIsStoreModalOpen(true);
    };

    const handleSaveStore = async (businessData: Partial<Business>) => {
        if (!user) return;
        if (businessData.id) {
            const success = await updateBusiness(businessData);
            if (success) setIsStoreModalOpen(false);
        } else {
            const newBiz = await createBusiness(businessData.name || 'New Store', user.id);
            if (newBiz) {
                setIsStoreModalOpen(false);
                // Check if it is the first store to show onboarding
                if (businesses.length === 0) {
                    setShowTemplateOnboarding(true);
                }
                setCurrentBusinessId(newBiz.id);
            }
        }
    };

    const handleDeleteStore = async (businessId: string) => {
        const success = await deleteBusiness(businessId);
        if (success) setIsStoreModalOpen(false);
    };

    const handleJoinStoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        const result = await joinBusinessByCode(joinStoreCode, user);
        if (result.success) {
            setIsJoinStoreModalOpen(false);
            setJoinStoreCode('');
            alert('Recursively joined store! Wait for approval.'); // Or simpler notification
        } else {
            alert(result.error || 'Failed to join store');
        }
    };

    // Dashboard Items Handlers
    const handleAddShift = (shift: any) => {
        setShifts(prev => {
            const exists = prev.find(s => s.id === shift.id);
            if (exists) return prev.map(s => s.id === shift.id ? shift : s);
            return [...prev, shift];
        });
    };

    const handleDeleteShift = (id: string) => {
        setShifts(prev => prev.filter(s => s.id !== id));
    };

    const handleAddMenuItem = (item: any) => {
        setMenu(prev => [...prev, item]);
    };

    const handleDeleteMenuItem = (id: string) => {
        setMenu(prev => prev.filter(m => m.id !== id));
    };

    const handleUpdateMenuItem = (item: any) => {
        setMenu(prev => prev.map(m => m.id === item.id ? item : m));
    };

    const handleAddTask = (text: string) => {
        if (!currentBusinessId || !user) return;
        const newTask = {
            id: Date.now().toString(),
            businessId: currentBusinessId,
            taskText: text,
            completed: false,
            createdBy: user.id,
            taskDate: new Date().toISOString().split('T')[0],
            priority: 1,
            createdAt: new Date().toISOString()
        };
        setPrepTasks(prev => [...prev, newTask]);
    }

    // Derived values
    const filteredInventory = currentBusinessId
        ? inventory.filter(i => i.businessId === currentBusinessId)
        : inventory;

    const renderContent = () => {
        if (!user) return <div>Loading...</div>;

        // --- CHEF VIEW (Routed) ---
        // Check path FIRST to allow Managers to see Chef View
        if (location.pathname.includes('/chef') || window.location.hash.includes('chef')) {
            if (isMasterView && user.user_metadata?.role === 'Manager') {
                return (
                    <div className="flex flex-col items-center justify-center h-96 animate-in fade-in duration-500">
                        <ChefHat className="w-16 h-16 text-border mb-6" />
                        <h3 className="text-xl font-bold text-primary mb-2">AI Chef Needs a Kitchen</h3>
                        <p className="text-secondary text-lg mb-6">Select a store to access the AI Chef.</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                );
            }
            return <ChefView inventory={filteredInventory} menu={menu} />;
        }

        // --- MANAGER VIEW ---
        if (user.user_metadata?.role === 'Manager') {
            if (isMasterView) {
                return (
                    <MasterDashboard
                        businesses={businesses}
                        inventory={inventory}
                        shoppingListSummaries={shoppingListSummaries}
                        shoppingListLoading={shoppingListLoading}
                        onSelectBusiness={setCurrentBusinessId}
                        onCreateStore={handleOpenCreateStore}
                        onEditStore={handleOpenEditStore}
                        setView={() => { }}
                    />
                );
            }
            if (currentBusinessId && activeBusiness) {
                // ✨ New: Use redesigned OperationsPage instead of old RestaurantDashboard
                return <OperationsPage />;
            }
        }

        // --- STAFF VIEW ---
        if (user.user_metadata?.role === 'Staff') {
            return (
                <StaffDashboard
                    user={user}
                    activeBusiness={activeBusiness || null}
                    inventory={filteredInventory}
                    menu={menu}
                    tasks={prepTasks}
                    onAddMenuItem={handleAddMenuItem}
                    onDeleteMenuItem={handleDeleteMenuItem}
                    onUpdateMenuItem={handleUpdateMenuItem}
                    onAddTask={handleAddTask}
                    onToggleTask={(id) => setPrepTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))}
                    onDeleteTask={(id) => setPrepTasks(prev => prev.filter(t => t.id !== id))}
                    onOpenJoinStore={() => setIsJoinStoreModalOpen(true)}
                />
            );
        }
        return <div>Dashboard Loading...</div>;
    };

    return (
        <>
            {renderContent()}

            {/* Modals */}
            <StoreModal
                isOpen={isStoreModalOpen}
                onClose={() => setIsStoreModalOpen(false)}
                onSave={handleSaveStore}
                onDelete={handleDeleteStore}
                initialBusiness={editingBusiness}
                ownerId={user?.id || ''}
                isFirstStore={businesses.length === 0}
                onFirstStoreCreated={() => setShowTemplateOnboarding(true)}
            />

            <JoinStoreModal
                isOpen={isJoinStoreModalOpen}
                onClose={() => setIsJoinStoreModalOpen(false)}
                joinStoreCode={joinStoreCode}
                setJoinStoreCode={setJoinStoreCode}
                joinStoreNameAlias={joinStoreNameAlias}
                setJoinStoreNameAlias={setJoinStoreNameAlias}
                onSubmit={handleJoinStoreSubmit}
            />

            {showTemplateOnboarding && (
                <TemplateOnboardingModal
                    onClose={() => setShowTemplateOnboarding(false)}
                    onBrowseTemplates={() => {
                        console.log('Browse templates'); // TODO: Implement template browsing
                        setShowTemplateOnboarding(false);
                    }}
                    onStartFresh={() => {
                        setShowTemplateOnboarding(false);
                    }}
                />
            )}
        </>
    );
};
