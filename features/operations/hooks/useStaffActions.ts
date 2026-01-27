/**
 * useStaffActions Hook
 * 
 * 封装所有员工管理相关的业务逻辑
 * - 批准员工加入
 * - 拒绝员工 / 移除员工
 * - 统一错误处理
 * - 加载状态管理
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export function useStaffActions(businessId: string | null, onSuccess?: () => void | Promise<void>) {
    const [actingId, setActingId] = useState<string | null>(null);

    const approveMember = useCallback(async (memberId: string) => {
        if (!businessId) return;

        setActingId(memberId);
        try {
            // 解析 memberId（可能是 "userId_businessId" 或純 "userId"）
            const userId = memberId.includes('_') ? memberId.split('_')[0] : memberId;

            const { error } = await supabase
                .from('business_members')
                .update({ status: 'active' })
                .eq('business_id', businessId)
                .eq('user_id', userId);

            if (error) throw error;

            await onSuccess?.();
        } catch (e) {
            alert((e as Error).message || 'Failed to approve member');
        } finally {
            setActingId(null);
        }
    }, [businessId, onSuccess]);

    const rejectMember = useCallback(async (memberId: string) => {
        if (!businessId) return;

        setActingId(memberId);
        try {
            const userId = memberId.includes('_') ? memberId.split('_')[0] : memberId;

            const { error } = await supabase
                .from('business_members')
                .delete()
                .eq('business_id', businessId)
                .eq('user_id', userId);

            if (error) throw error;

            await onSuccess?.();
        } catch (e) {
            alert((e as Error).message || 'Failed to remove member');
        } finally {
            setActingId(null);
        }
    }, [businessId, onSuccess]);

    return {
        approveMember,
        rejectMember,
        actingId,
    };
}
