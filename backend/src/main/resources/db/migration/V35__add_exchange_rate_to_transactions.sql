-- 为交易表添加汇率相关字段
ALTER TABLE transactions ADD COLUMN exchange_rate DECIMAL(10,6);
ALTER TABLE transactions ADD COLUMN cny_amount DECIMAL(12,2);

-- 添加字段注释
COMMENT ON COLUMN transactions.exchange_rate IS '记账时的汇率（1外币 = X CNY）';
COMMENT ON COLUMN transactions.cny_amount IS '交易金额的CNY等值（用于预算计算）';

-- 为现有CNY交易填充默认值
UPDATE transactions
SET exchange_rate = 1.0,
    cny_amount = amount
WHERE currency = 'CNY' AND exchange_rate IS NULL;

-- 为现有外币交易（如果有）填充默认值
-- 注意：这里使用临时汇率1.0，实际应该从历史汇率表获取
UPDATE transactions
SET exchange_rate = 1.0,
    cny_amount = amount
WHERE currency != 'CNY' AND exchange_rate IS NULL;

-- 设置字段为非空（在填充数据后）
-- ALTER TABLE transactions ALTER COLUMN exchange_rate SET NOT NULL;
-- ALTER TABLE transactions ALTER COLUMN cny_amount SET NOT NULL;
