-- 移除预算表的pattern和is_recurring字段
-- 原因：简化预算模型，pattern功能未被使用，is_recurring功能未实现

-- 删除字段（PostgreSQL会自动删除相关索引）
ALTER TABLE budgets DROP COLUMN IF EXISTS pattern;
ALTER TABLE budgets DROP COLUMN IF EXISTS is_recurring;
