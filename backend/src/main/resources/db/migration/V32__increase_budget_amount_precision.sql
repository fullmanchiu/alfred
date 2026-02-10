-- 增加预算金额字段精度，支持更大的预算值
-- 原: DECIMAL(10, 2) 最大约 1亿
-- 新: DECIMAL(15, 2) 最大约 100万亿

ALTER TABLE budgets
ALTER COLUMN amount TYPE DECIMAL(15, 2);