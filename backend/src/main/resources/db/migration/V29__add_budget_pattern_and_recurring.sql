-- 添加预算的pattern和isRecurring字段
-- 用于支持工作日/周末模式过滤和循环预算功能

-- 添加pattern字段（默认值'all'表示所有日期都生效）
ALTER TABLE budgets ADD COLUMN pattern VARCHAR(50) DEFAULT 'all';

-- 添加is_recurring字段（默认值true表示自动循环）
ALTER TABLE budgets ADD COLUMN is_recurring BOOLEAN DEFAULT true;

-- 添加注释
COMMENT ON COLUMN budgets.pattern IS '预算生效模式：all=所有日期, workday=仅工作日, weekend=仅周末';
COMMENT ON COLUMN budgets.is_recurring IS '是否自动循环（如每月1号重置）';
