/**
 * Predict Reorder Quantity - 優化版
 * 
 * 改進點：
 * 1. 30 天回溯（更反映近期趨勢）
 * 2. 單位對應最小訂購量
 * 3. 易腐物品限制
 * 4. 降低緩衝係數
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// 配置常量
// ============================================================

const LOOKBACK_DAYS = 30;           // 回溯天數
const SAFETY_BUFFER = 1.1;          // 10% 安全緩衝
const STOCK_BUFFER = 1.2;           // 20% 庫存緩衝
const PERISHABLE_MAX_DAYS = 14;     // 易腐物品最多補 2 週用量

// 單位對應的最小訂購量
const MIN_ORDER_BY_UNIT: Record<string, number> = {
    'pcs': 1,
    'box': 1,
    'bag': 1,
    'bottle': 1,
    'dozen': 1,
    'kg': 0.5,
    'g': 100,
    'L': 0.5,
    'ml': 250,
    'lb': 0.5,
    'oz': 4,
};

// 易腐物品類別
const PERISHABLE_CATEGORIES = [
    'Dairy',
    'Produce',
    'Meat',
    'Seafood',
    'Fresh',
];

// ============================================================
// 輔助函數
// ============================================================

/**
 * 四捨五入到合理數值
 */
function roundToNiceNumber(quantity: number, unit: string): number {
    return Math.ceil(quantity);
}

/**
 * 判斷是否為易腐物品
 */
function isPerishable(category?: string | null): boolean {
    if (!category) return false;
    return PERISHABLE_CATEGORIES.some(c =>
        category.toLowerCase().includes(c.toLowerCase())
    );
}

// ============================================================
// 主要函數
// ============================================================

/**
 * 預測補貨數量
 * 
 * @param supabase - Supabase 客戶端
 * @param businessId - 商家 ID
 * @param itemName - 物品名稱
 * @param unit - 單位（用於確定最小訂購量）
 * @param category - 類別（用於判斷是否易腐）
 */
export async function predictReorderQuantity(
    supabase: SupabaseClient,
    businessId: string,
    itemName: string,
    unit: string = 'pcs',
    category?: string | null
): Promise<number> {
    const minOrder = MIN_ORDER_BY_UNIT[unit.toLowerCase()] || 1;

    try {
        // 計算回溯日期
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - LOOKBACK_DAYS);
        const lookbackDateStr = lookbackDate.toISOString();

        // 查詢歷史購買記錄
        const { data, error } = await supabase
            .from('shopping_list')
            .select('quantity_needed, purchased_at')
            .eq('business_id', businessId)
            .ilike('item_name', itemName)
            .eq('status', 'purchased')
            .gte('purchased_at', lookbackDateStr)
            .order('purchased_at', { ascending: false })
            .limit(10);

        if (error || !data || data.length === 0) {
            // 無歷史數據，返回最小訂購量
            return minOrder;
        }

        // 計算平均每次購買量
        const total = data.reduce((sum, r) => sum + (r.quantity_needed || 0), 0);
        const avgPerPurchase = total / data.length;

        // 計算購買頻率（天/次）
        const firstDate = new Date(data[data.length - 1].purchased_at);
        const lastDate = new Date(data[0].purchased_at);
        const daysBetween = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        const purchaseFrequency = daysBetween / data.length;

        // 預測：一週用量 + 10% 緩衝
        const avgDailyUsage = avgPerPurchase / purchaseFrequency;
        let predicted = avgDailyUsage * 7 * SAFETY_BUFFER;

        // 易腐物品限制
        if (isPerishable(category)) {
            const maxPerishable = avgDailyUsage * PERISHABLE_MAX_DAYS;
            predicted = Math.min(predicted, maxPerishable);
        }

        // 應用最小訂購量
        predicted = Math.max(predicted, minOrder);

        // 四捨五入
        const result = roundToNiceNumber(predicted, unit);

        console.log(`[predictReorderQuantity] ${itemName}: avg=${avgPerPurchase.toFixed(1)}, freq=${purchaseFrequency.toFixed(1)}d, predicted=${result}`);

        return result;
    } catch (err) {
        console.error('[predictReorderQuantity] Error:', err);
        return minOrder;
    }
}

/**
 * 計算最終補貨數量
 * 
 * 邏輯：max(歷史預測, 庫存缺口)
 */
export function calculateReorderQuantity(
    predictedNeed: number,
    currentStock: number,
    minStockLevel: number,
    unit: string,
    category?: string | null
): number {
    const minOrder = MIN_ORDER_BY_UNIT[unit.toLowerCase()] || 1;

    // 目標庫存 = min_stock_level × 1.2
    const targetStock = minStockLevel * STOCK_BUFFER;
    const stockGap = Math.max(0, targetStock - currentStock);

    // 取較大值
    let quantity = Math.max(predictedNeed, stockGap);

    // 應用最小訂購量
    quantity = Math.max(quantity, minOrder);

    // 四捨五入
    return roundToNiceNumber(quantity, unit);
}

/**
 * 批量預測
 */
export async function predictReorderQuantityBatch(
    supabase: SupabaseClient,
    businessId: string,
    items: Array<{ name: string; unit: string; category?: string | null }>
): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    // 並行處理（最多 5 個）
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const predictions = await Promise.all(
            batch.map(item =>
                predictReorderQuantity(supabase, businessId, item.name, item.unit, item.category)
            )
        );
        batch.forEach((item, idx) => results.set(item.name, predictions[idx]));
    }

    return results;
}
