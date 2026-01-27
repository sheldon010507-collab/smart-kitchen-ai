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
                .order('start_time', { ascending: false });

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

            // Load Menu
            const { data: menuData, error: menuErr } = await supabase
                .from('menu_items')
                .select('*')
                .eq('business_id', businessId);

            if (menuErr) throw menuErr;

            if (menuData) {
                const mappedMenu: MenuItem[] = menuData.map((m: any) => ({
                    id: m.id,
                    businessId: m.business_id,
                    name: m.name,
                    sellingPrice: m.selling_price || 0,
                    isActive: m.is_active ?? true,
                    sortOrder: m.sort_order || 0,
                    createdAt: m.created_at || new Date().toISOString(),
                    updatedAt: m.updated_at || new Date().toISOString(),
                    // Optional
                    description: m.description,
                    estimatedCost: m.estimated_cost,
                    category: m.category,
                    imageUrl: m.image_url,
                }));
                setMenu(mappedMenu);
            }

            // Load Prep Tasks
            const { data: taskData, error: taskErr } = await supabase
                .from('prep_tasks')
                .select('*')
                .eq('business_id', businessId)
                .order('priority', { ascending: false });

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

            // Load Staff
            const { data: memberData, error: memberErr } = await supabase
                .from('business_members')
                .select(`
            *,
            user:users ( id, name, email, role )
        `)
                .eq('business_id', businessId);

            if (memberErr) {
                console.warn('Error fetching members:', memberErr);
            } else if (memberData) {
                const mappedStaff = memberData.map((m: any) => ({
                    id: m.user?.id || m.user_id,
                    businessId: m.business_id,
                    name: m.user?.name || 'Unknown',
                    email: m.user?.email,
                    role: m.role || 'Staff',
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
