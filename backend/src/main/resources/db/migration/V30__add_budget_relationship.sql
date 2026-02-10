-- 添加预算关联字段
ALTER TABLE budgets
ADD COLUMN parent_budget_id BIGINT,
ADD COLUMN is_derived BOOLEAN DEFAULT FALSE;

-- 添加外键约束
ALTER TABLE budgets
ADD CONSTRAINT fk_budget_parent
FOREIGN KEY (parent_budget_id) REFERENCES budgets(id) ON DELETE CASCADE;

-- 添加索引
CREATE INDEX idx_budget_parent ON budgets(parent_budget_id);
CREATE INDEX idx_budget_user_parent ON budgets(user_id, parent_budget_id, is_active);