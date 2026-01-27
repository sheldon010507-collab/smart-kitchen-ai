/**
 * Custom Hook: useManagerBusinessAutoRecovery
 * 
 * 自动检测并修复Manager注册时因Email确认流程导致的店铺未创建问题
 * 
 * 使用场景:
 * - Manager通过Email确认后首次登录
 * - localStorage中有pending_business_name但数据库没有对应的business
 * 
 * 功能:
 * 1. 检测Manager是否有active business
 * 2. 如果没有，检查pending_business_name
 * 3. 自动创建business + business_members关系
 * 4. 设置为当前active business
 */

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useBusiness } from '../lib/BusinessContext';

interface AutoRecoveryResult {
    isRecovering: boolean;
    recoveryError: string | null;
    recoveredBusinessId: string | null;
}

export function useManagerBusinessAutoRecovery(user: User | null): AutoRecoveryResult {
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryError, setRecoveryError] = useState<string | null>(null);
    const [recoveredBusinessId, setRecoveredBusinessId] = useState<string | null>(null);
    const { setCurrentBusinessId } = useBusiness();

    useEffect(() => {
        // 只对Manager角色执行
        if (!user || user.user_metadata?.role !== 'Manager') {
            return;
        }

        const attemptAutoRecovery = async () => {
            try {
                setIsRecovering(true);
                setRecoveryError(null);

                console.log('[Auto Recovery] Checking Manager business status...');

                // 1. 检查Manager是否已有business
                const { data: existingMembership, error: checkError } = await supabase
                    .from('business_members')
                    .select('business_id, businesses(id, name)')
                    .eq('user_id', user.id)
                    .eq('role', 'owner')
                    .maybeSingle();

                if (checkError) {
                    console.error('[Auto Recovery] Check failed:', checkError);
                    setRecoveryError(checkError.message);
                    return;
                }

                if (existingMembership) {
                    console.log('[Auto Recovery] Business already exists:', existingMembership);
                    return; // 已有business，无需恢复
                }

                // 2. 检查localStorage中的pending_business_name
                const pendingName = localStorage.getItem('pending_business_name')
                    || sessionStorage.getItem('pending_business_name');

                if (!pendingName) {
                    console.log('[Auto Recovery] No pending business name found');
                    return;
                }

                console.log(`[Auto Recovery] Found pending business: "${pendingName}". Creating now...`);

                // 3. 生成invite code
                const inviteCode = generateInviteCode();

                // 4. 创建Business
                const { data: newBusiness, error: bizError } = await supabase
                    .from('businesses')
                    .insert({
                        owner_id: user.id,
                        name: pendingName.trim(),
                        invite_code: inviteCode,
                    })
                    .select()
                    .single();

                if (bizError || !newBusiness) {
                    console.error('[Auto Recovery] Failed to create business:', bizError);
                    setRecoveryError(bizError?.message || 'Failed to create business');
                    return;
                }

                console.log('[Auto Recovery] Business created:', newBusiness);

                // 5. 创建owner membership
                const { error: memberError } = await supabase
                    .from('business_members')
                    .insert({
                        business_id: newBusiness.id,
                        user_id: user.id,
                        role: 'owner',
                        status: 'active',
                    });

                if (memberError) {
                    console.error('[Auto Recovery] Failed to create membership:', memberError);
                    setRecoveryError(memberError.message);
                    return;
                }

                // 6. 清理pending keys
                localStorage.removeItem('pending_business_name');
                sessionStorage.removeItem('pending_business_name');

                // 7. 设置为active business
                setCurrentBusinessId(newBusiness.id);
                setRecoveredBusinessId(newBusiness.id);

                console.log(`[Auto Recovery] ✅ Success! Business "${pendingName}" created and activated.`);

                // 8. 通知用户
                alert(`🎉 Welcome! Your restaurant "${pendingName}" has been created successfully.\n\nInvite Code: ${inviteCode}\nShare this code with your staff to let them join.`);

            } catch (err: any) {
                console.error('[Auto Recovery] Unexpected error:', err);
                setRecoveryError(err?.message || 'Unexpected error during recovery');
            } finally {
                setIsRecovering(false);
            }
        };

        attemptAutoRecovery();
    }, [user, setCurrentBusinessId]);

    return {
        isRecovering,
        recoveryError,
        recoveredBusinessId,
    };
}

/**
 * 生成8位随机Invite Code
 * 格式: A3F9X2H1 (大写字母+数字)
 */
function generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
