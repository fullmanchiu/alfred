-- 修改预算表唯一约束，支持同一分类设置多个周期的预算
-- 原约束：UNIQUE (user_id, category_id, is_active)
-- 新约束：UNIQUE (user_id, category_id, period, is_active)

-- 删除旧约束
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_id_is_active_key;

-- 添加新约束（包含period）
ALTER TABLE budgets ADD CONSTRAINT budgets_user_category_period_active_key UNIQUE (user_id, category_id, period, is_active);