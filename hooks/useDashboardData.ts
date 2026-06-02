import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Shift, MenuItem, PrepTask } from '../types';

export function useDashboardData(businessId: string | null) {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = useCallback(async () => {
        if (!businessId) return;
        setLoading(true);

        try {
            // Load Shifts
            const { data: shiftData, error: shiftErr } = await supabase
                .from('shifts')
                .select('*')
                .eq('business_id', businessId)
                .order('shift_date', { ascending: false });

            if (shiftErr) throw shiftErr;

            if (shiftData) {
                const mappedShifts: Shift[] = shiftData.map((s: any) => ({
                    id: s.id,
                    businessId: s.business_id,
                    userId: s.user_id || 'unknown',
                    shiftDate: s.shift_date || new Date().toISOString().split('T')[0],
                    createdAt: s.created_at || new Date().toISOString(),
                    status: s.status,
                    // Optional fields
                    scheduledStart: s.scheduled_start,
                    scheduledEnd: s.scheduled_end,
                    actualStart: s.actual_start,
                    actualEnd: s.actual_end,
                    hourlyRate: s.hourly_rate,
                    totalHours: s.total_hours,
                    totalCost: s.total_cost,
                    notes: s.notes
                }));
                setShifts(mappedShifts);
            }


            // Load Menu (using service to get ingredients)
            // const { data: menuData, error: menuErr } = await supabase... replaced by service
            try {
                // We need to check if menuService is available here, or just fetch natively if circular dep is issue
                // Given useDashboardData is a generic hook, maybe better to keep it simple or use the service?
                // Using service here introduces dependency on features/menu.
                // But we need ingredients.
                // Let's use the service dynamic import or just standard import if path allows.
                // Actually, let's keep it simple and just fetch simple items here, BUT useOperationsData needs ingredients.
                // Problem: useOperationsData relies on this 'menu' state.
                // Solution: Update this hook to use menuService.fetchMenu

                // For now, let's assume direct import is fine.
                // We need to import menuService at top of file.
                // OR we just replicate the fetch logic here to ensure it's "dashboard data".
                // But menuService exists. Let's use it.

                // Dynamic import to avoid cycles if any? No, let's try direct.
                // Since I can't add import easily with this tool without separate call, I will do a raw fetch upgrade here.

                const { data: items, error: itemsErr } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('sort_order', { ascending: true });

                if (itemsErr) throw itemsErr;

                if (items) {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    const itemIds = items.map(i => i.id).filter(id => uuidRegex.test(id));

                    let ingredients: any[] = [];
                    if (itemIds.length > 0) {
                        const { data: ingData, error: ingErr } = await supabase
                            .from('menu_ingredients')
                            .select('*')
                            .in('menu_item_id', itemIds);

                        if (!ingErr && ingData) {
                            ingredients = ingData;
                        }
                    }

                    const mappedMenu = items.map((m: any) => ({
                        id: m.id,
                        businessId: m.business_id,
                        name: m.name,
                        sellingPrice: m.selling_price || 0,
                        isActive: m.is_active ?? true,
                        sortOrder: m.sort_order || 0,
                        createdAt: m.created_at || new Date().toISOString(),
                        updatedAt: m.updated_at || new Date().toISOString(),
                        description: m.description,
                        estimatedCost: m.estimated_cost,
                        category: m.category,
                        imageUrl: m.image_url,
                        ingredients: ingredients ? ingredients.filter((ing: any) => ing.menu_item_id === m.id).map((ing: any) => ({
                            id: ing.id,
                            menuItemId: ing.menu_item_id,
                            inventoryItemId: ing.inventory_item_id,
                            quantityUsed: ing.quantity_used,
                            unitUsed: ing.unit_used,
                            costSnapshot: ing.cost_per_unit || 0,
                            ingredientName: '' // would need join to get name, but UI might use inventory lookup
                        })) : []
                    }));
                    setMenu(mappedMenu);
                }
            } catch (menuErr) {
                console.error("Error loading menu:", menuErr);
            }


            // Load Prep Tasks
            const { data: taskData, error: taskErr } = await supabase
                .from('prep_tasks')
                .select('*')
                .eq('business_id', businessId)
                .eq('completed', false)
                .order('task_date', { ascending: true });

            if (taskErr) throw taskErr;

            if (taskData) {
                const mappedTasks: PrepTask[] = taskData.map((t: any) => ({
                    id: t.id,
                    businessId: t.business_id,
                    taskText: t.task_text,
                    completed: t.completed,
                    taskDate: t.task_date,
                    priority: t.priority,
                    createdAt: t.created_at,
                    // Optional
                    assignedTo: t.assigned_to,
                    completedAt: t.completed_at,
                    completedBy: t.completed_by,
                    createdBy: t.created_by
                }));
                setPrepTasks(mappedTasks);
            }


            // Load Staff - directly from business_members (no FK to auth.users)
            const { data: memberData, error: memberErr } = await supabase
                .from('business_members')
                .select('*')
                .eq('business_id', businessId);

            if (memberErr) {
                console.warn('Error fetching members:', memberErr);
            } else if (memberData) {
                const mappedStaff = memberData.map((m: any) => ({
                    id: m.user_id,
                    businessId: m.business_id,
                    name: 'Staff Member',  // Name must be fetched separately if needed
                    email: '',
                    role: m.role || 'staff',
                    status: m.status,
                    hourlyRate: 0
                }));
                setStaff(mappedStaff);
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        shifts,
        setShifts,
        menu,
        setMenu,
        prepTasks,
        setPrepTasks,
        staff,
        setStaff,
        loading,
        refreshDashboard: loadData
    };
}
