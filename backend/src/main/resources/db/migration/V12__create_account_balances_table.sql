-- 改造 accounts 表支持多货币
-- 创建 account_balances 表存储多货币余额

-- 创建账户余额表
CREATE TABLE IF NOT EXISTS account_balances (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, currency)
);

-- 为 accounts 表添加机构名称字段（可选，用于按机构分组显示）
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS institution_name VARCHAR(100);

-- 迁移现有数据：把 accounts 表的 balance 迁移到 account_balances
INSERT INTO account_balances (account_id, currency, balance, created_at, updated_at)
SELECT id, 'CNY', balance, created_at, updated_at
FROM accounts
WHERE NOT deleted
ON CONFLICT (account_id, currency) DO NOTHING;

-- 添加索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_account_balances_account_id ON account_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_currency ON account_balances(currency);
