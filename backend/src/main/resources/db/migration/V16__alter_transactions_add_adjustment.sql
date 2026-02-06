-- 为 Transactions 表添加余额校准相关字段
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS adjustment_type VARCHAR(20);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- 添加注释
COMMENT ON COLUMN transactions.adjustment_type IS 'adjustment - 用于余额校准';
COMMENT ON COLUMN transactions.adjustment_reason IS '余额校准的原因说明';
