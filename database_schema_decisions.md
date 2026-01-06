# 📦 数据库架构决策文档

**版本**: v2.0 (Final)  
**日期**: 2026-01-06  
**状态**: 已审批

---

## 1. 背景与目标

### 1.1 当前架构

```typescript
// types.ts - 现状
interface Business {
  customCategories: string[];  // 简单字符串数组
  customLocations: string[];
}

interface InventoryItem {
  category: string;  // 直接存储分类名称字符串
  location: string;
}
```

**问题**:
- 无法支持分类层级（父子关系）
- 删除/重命名分类时需手动更新所有商品
- 无数据完整性约束

### 1.2 目标架构

建立规范化的分类/位置管理系统，支持：
- 层级结构（父子分类）
- 外键约束
- 自动同步（向后兼容旧代码）

---

## 2. 核心决策矩阵

| 决策点 | 推荐选项 | 风险等级 | 备注 |
|--------|---------|---------|------|
| 删除分类策略 | 移到 "Unassigned" | 🟢 低 | 数据安全优先 |
| 重复分类处理 | 自动重命名 | 🟢 低 | 数据零丢失 |
| 触发器自动创建 | 允许自动创建 | 🟡 中 | 向后兼容 |
| 唯一约束设计 | 简单全局唯一 | 🟢 低 | MVP 适用 |
| 冲突处理策略 | 静默修复 + 日志 | 🟢 低 | 不中断业务 |

---

## 3. 决策详情

### 3.1 删除分类 → 移到 "Unassigned"

**用户体验流程**:
```
1. 用户点击删除 "Vegetables"
2. 系统弹窗提示：该分类下有 50 个商品将移动到 "Unassigned"
3. 确认后删除
4. 商品自动移到 "Unassigned"
5. InventoryView 显示提示："💡 您有 50 个未分类商品"
```

### 3.2 重复分类 → 自动重命名

**迁移结果**:
```
输入: ['Produce', 'Produce', 'Dairy']
输出:
  - 'Produce'      ← 第一个保留原名
  - 'Produce (2)'  ← 第二个自动加编号
  - 'Dairy'
```

### 3.3 触发器自动创建 → 允许 + 标记

**行为**:
- 旧代码插入 `category = '海鲜'`（新分类）
- 触发器自动创建分类，标记 `auto_created = true`
- UI 提示用户整理自动创建的分类

### 3.4 唯一约束 → 简单全局唯一

**设计决策**:
```sql
-- ✅ 采用：同一业务下分类名全局唯一（不区分层级）
CREATE UNIQUE INDEX idx_categories_business_name 
  ON categories(business_id, name);

-- ❌ 不采用：复杂的部分唯一索引（容易与触发器冲突）
```

**理由**：小餐厅不需要同名子分类（如 Produce > Fresh, Seafood > Fresh），`Fresh Produce` 和 `Fresh Seafood` 足够用。

### 3.5 数据冲突 → 静默修复 + 日志

**设计决策**:
```sql
-- ✅ 采用：以 category_id 为准，静默修复字符串
IF cat_name != NEW.category THEN
  NEW.category := cat_name;
  RAISE NOTICE 'Auto-corrected: "%" -> "%"', OLD.category, cat_name;
END IF;

-- ❌ 不采用：直接抛出异常（会中断业务）
```

---

## 4. 数据库表设计

### 4.1 新建表：categories

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_leaf BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  auto_created BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 简单全局唯一（推荐）
CREATE UNIQUE INDEX idx_categories_business_name 
  ON categories(business_id, name);

-- 索引
CREATE INDEX idx_categories_business ON categories(business_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_auto_created ON categories(business_id, auto_created);
```

### 4.2 新建表：locations

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'Dry' CHECK (type IN ('Dry', 'Fridge', 'Freezer')),
  level INTEGER DEFAULT 1,
  auto_created BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, name)
);

CREATE INDEX idx_locations_business ON locations(business_id);
CREATE INDEX idx_locations_parent ON locations(parent_id);
```

### 4.3 修改表：inventory_items

```sql
ALTER TABLE inventory_items 
ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_location ON inventory_items(location_id);
```

---

## 5. 触发器设计

### 5.1 统一分类同步触发器

> **设计要点**：
> - 合并为单个触发器，避免执行顺序冲突
> - 以 `category_id` 为优先，静默修复不一致
> - 自动创建新分类，标记 `auto_created = true`

```sql
CREATE OR REPLACE FUNCTION unified_category_sync()
RETURNS TRIGGER AS $$
DECLARE 
  cat_id UUID;
  cat_name TEXT;
  unassigned_id UUID;
  category_id_changed BOOLEAN;
  category_changed BOOLEAN;
BEGIN
  -- 获取 Unassigned 分类 ID
  SELECT id INTO unassigned_id
  FROM categories
  WHERE business_id = NEW.business_id AND name = 'Unassigned';
  
  -- 如果 Unassigned 不存在，自动创建
  IF unassigned_id IS NULL THEN
    INSERT INTO categories (business_id, name, is_leaf, auto_created)
    VALUES (NEW.business_id, 'Unassigned', true, false)
    RETURNING id INTO unassigned_id;
  END IF;

  -- 检测字段变化
  IF TG_OP = 'INSERT' THEN
    category_id_changed := (NEW.category_id IS NOT NULL);
    category_changed := (NEW.category IS NOT NULL AND NEW.category != '');
  ELSE
    category_id_changed := (NEW.category_id IS DISTINCT FROM OLD.category_id);
    category_changed := (NEW.category IS DISTINCT FROM OLD.category);
  END IF;

  -- 场景 1: 两个字段都变了（一致性检查）
  IF category_id_changed AND category_changed THEN
    SELECT name INTO cat_name FROM categories WHERE id = NEW.category_id;
    
    IF cat_name IS NULL THEN
      -- category_id 无效，回退到字符串逻辑
      category_id_changed := false;
    ELSIF cat_name != NEW.category THEN
      -- 不一致：以 category_id 为准，静默修复
      NEW.category := cat_name;
      RAISE NOTICE '[unified_category_sync] Auto-corrected category: "%" -> "%"', 
        COALESCE(OLD.category, ''), cat_name;
    END IF;
    
    IF category_id_changed THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 场景 2: 只改了 category_id
  IF category_id_changed THEN
    SELECT name INTO cat_name FROM categories WHERE id = NEW.category_id;
    IF cat_name IS NOT NULL THEN
      NEW.category := cat_name;
    ELSE
      -- 无效的 category_id，分配到 Unassigned
      NEW.category_id := unassigned_id;
      NEW.category := 'Unassigned';
    END IF;
    RETURN NEW;
  END IF;

  -- 场景 3: 只改了 category 字符串
  IF category_changed THEN
    SELECT id INTO cat_id 
    FROM categories
    WHERE business_id = NEW.business_id AND name = NEW.category;
    
    IF cat_id IS NULL THEN
      -- 自动创建新分类
      INSERT INTO categories (business_id, name, is_leaf, auto_created)
      VALUES (NEW.business_id, NEW.category, true, true)
      RETURNING id INTO cat_id;
      
      RAISE NOTICE '[unified_category_sync] Auto-created category: "%"', NEW.category;
    END IF;
    
    NEW.category_id := cat_id;
    RETURN NEW;
  END IF;

  -- 场景 4: 都为空 → 分配到 Unassigned
  IF NEW.category_id IS NULL AND (NEW.category IS NULL OR NEW.category = '') THEN
    NEW.category_id := unassigned_id;
    NEW.category := 'Unassigned';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unified_category_sync_trigger
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION unified_category_sync();
```

### 5.2 统一位置同步触发器

```sql
CREATE OR REPLACE FUNCTION unified_location_sync()
RETURNS TRIGGER AS $$
DECLARE 
  loc_id UUID;
  loc_name TEXT;
  default_loc_id UUID;
  location_id_changed BOOLEAN;
  location_changed BOOLEAN;
BEGIN
  -- 获取默认位置 ID
  SELECT id INTO default_loc_id
  FROM locations
  WHERE business_id = NEW.business_id AND name = 'Default Storage';
  
  IF default_loc_id IS NULL THEN
    INSERT INTO locations (business_id, name, type, auto_created)
    VALUES (NEW.business_id, 'Default Storage', 'Dry', false)
    RETURNING id INTO default_loc_id;
  END IF;

  -- 检测字段变化
  IF TG_OP = 'INSERT' THEN
    location_id_changed := (NEW.location_id IS NOT NULL);
    location_changed := (NEW.location IS NOT NULL AND NEW.location != '');
  ELSE
    location_id_changed := (NEW.location_id IS DISTINCT FROM OLD.location_id);
    location_changed := (NEW.location IS DISTINCT FROM OLD.location);
  END IF;

  -- 场景 1: 两个字段都变了
  IF location_id_changed AND location_changed THEN
    SELECT name INTO loc_name FROM locations WHERE id = NEW.location_id;
    
    IF loc_name IS NULL THEN
      location_id_changed := false;
    ELSIF loc_name != NEW.location THEN
      NEW.location := loc_name;
    END IF;
    
    IF location_id_changed THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 场景 2: 只改了 location_id
  IF location_id_changed THEN
    SELECT name INTO loc_name FROM locations WHERE id = NEW.location_id;
    IF loc_name IS NOT NULL THEN
      NEW.location := loc_name;
    ELSE
      NEW.location_id := default_loc_id;
      NEW.location := 'Default Storage';
    END IF;
    RETURN NEW;
  END IF;

  -- 场景 3: 只改了 location 字符串
  IF location_changed THEN
    SELECT id INTO loc_id 
    FROM locations
    WHERE business_id = NEW.business_id AND name = NEW.location;
    
    IF loc_id IS NULL THEN
      INSERT INTO locations (business_id, name, type, auto_created)
      VALUES (
        NEW.business_id, 
        NEW.location, 
        CASE 
          WHEN NEW.location ILIKE '%fridge%' OR NEW.location ILIKE '%冷藏%' THEN 'Fridge'
          WHEN NEW.location ILIKE '%freezer%' OR NEW.location ILIKE '%冷冻%' THEN 'Freezer'
          ELSE 'Dry'
        END,
        true
      )
      RETURNING id INTO loc_id;
    END IF;
    
    NEW.location_id := loc_id;
    RETURN NEW;
  END IF;

  -- 场景 4: 都为空
  IF NEW.location_id IS NULL AND (NEW.location IS NULL OR NEW.location = '') THEN
    NEW.location_id := default_loc_id;
    NEW.location := 'Default Storage';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unified_location_sync_trigger
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION unified_location_sync();
```

### 5.3 分类重命名级联更新

```sql
CREATE OR REPLACE FUNCTION cascade_category_rename()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name != OLD.name THEN
    UPDATE inventory_items 
    SET category = NEW.name 
    WHERE category_id = NEW.id;
    
    RAISE NOTICE '[cascade_category_rename] Updated items: category "%" -> "%"', 
      OLD.name, NEW.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cascade_category_rename_trigger
  AFTER UPDATE OF name ON categories
  FOR EACH ROW
  EXECUTE FUNCTION cascade_category_rename();
```

### 5.4 删除分类时重新分配

```sql
CREATE OR REPLACE FUNCTION reassign_to_unassigned()
RETURNS TRIGGER AS $$
DECLARE
  unassigned_id UUID;
  affected_count INTEGER;
BEGIN
  -- 不能删除 Unassigned 本身
  IF OLD.name = 'Unassigned' THEN
    RAISE EXCEPTION 'Cannot delete the Unassigned category';
  END IF;

  SELECT id INTO unassigned_id
  FROM categories
  WHERE business_id = OLD.business_id AND name = 'Unassigned';
  
  IF unassigned_id IS NULL THEN
    INSERT INTO categories (business_id, name, is_leaf, auto_created)
    VALUES (OLD.business_id, 'Unassigned', true, false)
    RETURNING id INTO unassigned_id;
  END IF;
  
  UPDATE inventory_items 
  SET category_id = unassigned_id, category = 'Unassigned'
  WHERE category_id = OLD.id;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  IF affected_count > 0 THEN
    RAISE NOTICE '[reassign_to_unassigned] Moved % items to Unassigned', affected_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reassign_before_category_delete
  BEFORE DELETE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION reassign_to_unassigned();
```

### 5.5 新商户自动创建默认分类

```sql
CREATE OR REPLACE FUNCTION create_defaults_for_business()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (business_id, name, is_leaf, auto_created)
  VALUES (NEW.id, 'Unassigned', true, false);
  
  INSERT INTO locations (business_id, name, type, auto_created)
  VALUES (NEW.id, 'Default Storage', 'Dry', false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_defaults_for_business
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION create_defaults_for_business();
```

---

## 6. 数据迁移脚本

### 6.1 完整迁移（带事务保护）

```sql
-- ============================================
-- 迁移脚本 v2.0
-- 使用单个事务，失败自动回滚
-- ============================================

BEGIN;

-- Phase 1: 创建表结构
-- （运行上述 CREATE TABLE 语句）

-- Phase 2: 迁移现有分类数据（处理重复）
DO $$
DECLARE
  biz RECORD;
  cat TEXT;
  cat_array TEXT[];
  occurrence_map JSONB;
  final_name TEXT;
  current_count INTEGER;
  total_categories INTEGER := 0;
  total_locations INTEGER := 0;
BEGIN
  FOR biz IN SELECT * FROM businesses LOOP
    cat_array := biz.custom_categories;
    occurrence_map := '{}'::jsonb;
    
    IF cat_array IS NOT NULL THEN
      FOREACH cat IN ARRAY cat_array LOOP
        IF cat IS NOT NULL AND cat != '' THEN
          current_count := COALESCE((occurrence_map->>cat)::INTEGER, 0) + 1;
          occurrence_map := jsonb_set(occurrence_map, ARRAY[cat], to_jsonb(current_count));
          
          IF current_count = 1 THEN
            final_name := cat;
          ELSE
            final_name := cat || ' (' || current_count::TEXT || ')';
          END IF;
          
          INSERT INTO categories (business_id, name, is_leaf, auto_created)
          VALUES (biz.id, final_name, true, false)
          ON CONFLICT (business_id, name) DO UPDATE SET updated_at = NOW();
          
          total_categories := total_categories + 1;
        END IF;
      END LOOP;
    END IF;
    
    -- 确保有 Unassigned
    INSERT INTO categories (business_id, name, is_leaf, auto_created)
    VALUES (biz.id, 'Unassigned', true, false)
    ON CONFLICT (business_id, name) DO NOTHING;
  END LOOP;
  
  -- 迁移 locations
  FOR biz IN SELECT * FROM businesses LOOP
    IF biz.custom_locations IS NOT NULL THEN
      FOREACH cat IN ARRAY biz.custom_locations LOOP
        IF cat IS NOT NULL AND cat != '' THEN
          INSERT INTO locations (business_id, name, type, auto_created)
          VALUES (
            biz.id, 
            cat,
            CASE 
              WHEN cat ILIKE '%fridge%' OR cat ILIKE '%冷藏%' THEN 'Fridge'
              WHEN cat ILIKE '%freezer%' OR cat ILIKE '%冷冻%' THEN 'Freezer'
              ELSE 'Dry'
            END,
            false
          )
          ON CONFLICT (business_id, name) DO NOTHING;
          
          total_locations := total_locations + 1;
        END IF;
      END LOOP;
    END IF;
    
    -- 确保有默认位置
    INSERT INTO locations (business_id, name, type, auto_created)
    VALUES (biz.id, 'Default Storage', 'Dry', false)
    ON CONFLICT (business_id, name) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Phase 2 completed: % categories, % locations migrated', 
    total_categories, total_locations;
END $$;

-- Phase 3: 关联现有商品
DO $$
DECLARE
  updated_cat INTEGER;
  updated_loc INTEGER;
  unassigned_cat INTEGER;
BEGIN
  -- category → category_id
  UPDATE inventory_items ii
  SET category_id = (
    SELECT c.id FROM categories c
    WHERE c.business_id = ii.business_id 
    AND c.name = ii.category
    LIMIT 1
  )
  WHERE ii.category IS NOT NULL AND ii.category != '';
  
  GET DIAGNOSTICS updated_cat = ROW_COUNT;
  
  -- 未匹配的设为 Unassigned
  UPDATE inventory_items ii
  SET 
    category_id = (
      SELECT c.id FROM categories c
      WHERE c.business_id = ii.business_id 
      AND c.name = 'Unassigned'
      LIMIT 1
    ),
    category = 'Unassigned'
  WHERE category_id IS NULL;
  
  GET DIAGNOSTICS unassigned_cat = ROW_COUNT;
  
  -- location → location_id
  UPDATE inventory_items ii
  SET location_id = (
    SELECT l.id FROM locations l
    WHERE l.business_id = ii.business_id 
    AND l.name = ii.location
    LIMIT 1
  )
  WHERE ii.location IS NOT NULL AND ii.location != '';
  
  GET DIAGNOSTICS updated_loc = ROW_COUNT;
  
  RAISE NOTICE 'Phase 3 completed: % items linked to categories (% to Unassigned), % items linked to locations', 
    updated_cat, unassigned_cat, updated_loc;
END $$;

-- Phase 4: 启用 RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_access" ON categories 
FOR ALL USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
    UNION
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "locations_access" ON locations 
FOR ALL USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
    UNION
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

COMMIT;

-- 验证
SELECT 
  (SELECT COUNT(*) FROM categories) AS total_categories,
  (SELECT COUNT(*) FROM locations) AS total_locations,
  (SELECT COUNT(*) FROM inventory_items WHERE category_id IS NULL) AS orphan_items;
```

---

## 7. 前端类型更新

### 7.1 types.ts 修改

```typescript
// 新增类型
export interface Category {
  id: string;
  businessId: string;
  name: string;
  parentId?: string;
  isLeaf: boolean;
  autoCreated: boolean;
  createdAt: string;
}

export interface Location {
  id: string;
  businessId: string;
  name: string;
  parentId?: string;
  type: 'Dry' | 'Fridge' | 'Freezer';
  level: number;
  autoCreated: boolean;
}

// 修改 InventoryItem
export interface InventoryItem {
  id: string;
  businessId: string;
  name: string;
  quantity: string;
  quantityValue?: number;
  quantityUnit?: string;
  unitCost?: number;
  category: string;
  categoryId?: string;      // 新增
  location: string;
  locationId?: string;      // 新增
  expiryDate: string;
  addedDate: string;
  parLevel?: number;        // 新增（用于 Setup 向导）
}
```

---

## 8. 测试脚本

> **注意**：测试脚本可重复运行，自动清理数据

```sql
DO $$
DECLARE
  test_biz_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  test_user_id UUID := '11111111-2222-3333-4444-555555555555';
  cat_count INTEGER;
  item_category TEXT;
BEGIN
  -- ========== 清理残留数据 ==========
  DELETE FROM inventory_items WHERE business_id = test_biz_id;
  DELETE FROM categories WHERE business_id = test_biz_id;
  DELETE FROM locations WHERE business_id = test_biz_id;
  DELETE FROM businesses WHERE id = test_biz_id;
  
  -- ========== 创建测试业务 ==========
  INSERT INTO businesses (id, owner_id, name)
  VALUES (test_biz_id, test_user_id, 'Test Business');
  
  -- 验证：默认分类应该自动创建
  SELECT COUNT(*) INTO cat_count 
  FROM categories 
  WHERE business_id = test_biz_id AND name = 'Unassigned';
  
  IF cat_count != 1 THEN
    RAISE EXCEPTION 'Test SETUP Failed: Unassigned category not auto-created';
  END IF;
  RAISE NOTICE '✅ Test SETUP: Default categories created';
  
  -- ========== 测试 1: 触发器自动创建分类 ==========
  INSERT INTO inventory_items (id, business_id, name, category, location)
  VALUES (gen_random_uuid(), test_biz_id, 'Salmon', '海鲜', 'Fridge');
  
  SELECT COUNT(*) INTO cat_count 
  FROM categories 
  WHERE business_id = test_biz_id AND name = '海鲜' AND auto_created = true;
  
  IF cat_count != 1 THEN
    RAISE EXCEPTION 'Test 1 Failed: Category "海鲜" not auto-created';
  END IF;
  RAISE NOTICE '✅ Test 1: Trigger auto-created category';
  
  -- ========== 测试 2: 删除分类 → 商品移到 Unassigned ==========
  DELETE FROM categories 
  WHERE business_id = test_biz_id AND name = '海鲜';
  
  SELECT category INTO item_category 
  FROM inventory_items 
  WHERE business_id = test_biz_id AND name = 'Salmon';
  
  IF item_category != 'Unassigned' THEN
    RAISE EXCEPTION 'Test 2 Failed: Item not reassigned. Got: %', item_category;
  END IF;
  RAISE NOTICE '✅ Test 2: Items reassigned to Unassigned on delete';
  
  -- ========== 测试 3: 重命名分类级联更新 ==========
  INSERT INTO categories (business_id, name, is_leaf)
  VALUES (test_biz_id, 'Vegetables', true);
  
  INSERT INTO inventory_items (id, business_id, name, category)
  VALUES (gen_random_uuid(), test_biz_id, 'Tomato', 'Vegetables');
  
  UPDATE categories 
  SET name = 'Veggies' 
  WHERE business_id = test_biz_id AND name = 'Vegetables';
  
  SELECT category INTO item_category 
  FROM inventory_items 
  WHERE business_id = test_biz_id AND name = 'Tomato';
  
  IF item_category != 'Veggies' THEN
    RAISE EXCEPTION 'Test 3 Failed: Category not cascaded. Got: %', item_category;
  END IF;
  RAISE NOTICE '✅ Test 3: Category rename cascaded';
  
  -- ========== 清理 ==========
  DELETE FROM inventory_items WHERE business_id = test_biz_id;
  DELETE FROM categories WHERE business_id = test_biz_id;
  DELETE FROM locations WHERE business_id = test_biz_id;
  DELETE FROM businesses WHERE id = test_biz_id;
  
  RAISE NOTICE '✅ All tests passed!';
END $$;
```

---

## 9. 性能目标（现实）

| 场景 | 目标 | 备注 |
|------|------|------|
| 单条插入 | < 100ms | 含触发器开销 |
| 批量 1000 条 | < 20s | 使用预创建分类优化可达 5s |
| 迁移 10000 条 | < 5min | 分批执行 |

### 9.1 批量插入优化策略

```typescript
// 前端：预创建分类 + 批量插入
const bulkInsertOptimized = async (items: InventoryItem[]) => {
  // 1. 预创建所有分类（减少触发器查询）
  const categories = [...new Set(items.map(i => i.category))];
  const { data: catData } = await supabase
    .from('categories')
    .upsert(
      categories.map(name => ({ 
        business_id: bizId, 
        name, 
        is_leaf: true,
        auto_created: true 
      })),
      { onConflict: 'business_id,name' }
    )
    .select('id, name');
  
  const catMap = Object.fromEntries(catData.map(c => [c.name, c.id]));
  
  // 2. 批量插入（触发器检测到一致性，直接跳过）
  const payload = items.map(item => ({
    business_id: bizId,
    name: item.name,
    category_id: catMap[item.category],
    category: item.category,
    // ...其他字段
  }));
  
  await supabase.from('inventory_items').insert(payload);
};
```

---

## 10. 实施计划

| 阶段 | 内容 | 时间 | 风险 |
|------|------|------|------|
| Phase 1 | 创建表结构 + 迁移数据 | Day 1-2 | 🟢 低 |
| Phase 2 | 部署触发器（灰度 10%） | Day 3 | 🟡 中 |
| Phase 3 | 验证 + 全量发布 | Day 4-5 | 🟡 中 |
| Phase 4 | 开发 Setup 向导 | Week 2-4 | - |

### 10.1 回滚方案

```sql
-- 紧急回滚：禁用触发器，不删除数据
DROP TRIGGER IF EXISTS unified_category_sync_trigger ON inventory_items;
DROP TRIGGER IF EXISTS unified_location_sync_trigger ON inventory_items;
DROP TRIGGER IF EXISTS cascade_category_rename_trigger ON categories;
DROP TRIGGER IF EXISTS reassign_before_category_delete ON categories;
DROP TRIGGER IF EXISTS auto_create_defaults_for_business ON businesses;

-- 应用代码继续使用字符串字段，不受影响
```

---

## 11. 验证清单

### 11.1 功能验证

- [ ] 旧代码插入商品（使用 category 字符串）→ category_id 自动填充
- [ ] 新代码插入商品（使用 category_id）→ category 字符串自动填充
- [ ] 删除分类 → 商品自动移到 Unassigned
- [ ] 重命名分类 → 商品的 category 字符串自动更新
- [ ] 创建新商户 → 自动创建 Unassigned 和 Default Storage
- [ ] category 和 category_id 不一致 → 静默修复，不报错

### 11.2 边界情况

- [ ] 分类名包含特殊字符（引号、斜杠）
- [ ] 并发插入相同分类名
- [ ] 尝试删除 Unassigned 分类（应阻止）

---

## 12. 审批记录

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.0 | 2026-01-06 | 初稿 |
| v2.0 | 2026-01-06 | 整合代码审查反馈，修复 7 个关键问题 |
