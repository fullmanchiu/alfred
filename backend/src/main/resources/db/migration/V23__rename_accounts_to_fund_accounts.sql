-- V23__rename_accounts_to_fund_accounts.sql
-- 重命名 accounts 表为 fund_accounts，避免与用户账户混淆

-- =====================================================
-- 第一部分：删除外键约束
-- =====================================================

-- 删除 transactions 表的外键约束
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_transactions_from_account'
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT fk_transactions_from_account;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_transactions_to_account'
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT fk_transactions_to_account;
    END IF;
END $$;

-- 删除 postings 表的外键约束
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_postings_user_account'
        AND table_name = 'postings'
    ) THEN
        ALTER TABLE postings DROP CONSTRAINT fk_postings_user_account;
    END IF;
END $$;

-- 删除 account_balances 表的外键约束
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_account_balances_account'
        AND table_name = 'account_balances'
    ) THEN
        ALTER TABLE account_balances DROP CONSTRAINT fk_account_balances_account;
    END IF;
END $$;

-- =====================================================
-- 第二部分：重命名表
-- =====================================================

ALTER TABLE accounts RENAME TO fund_accounts;
ALTER TABLE account_balances RENAME TO fund_account_balances;

-- =====================================================
-- 第三部分：重新创建外键约束
-- =====================================================

-- 重新创建 transactions 表的外键约束
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_from_account
FOREIGN KEY (from_account_id) REFERENCES fund_accounts(id) ON DELETE SET NULL;

ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_to_account
FOREIGN KEY (to_account_id) REFERENCES fund_accounts(id) ON DELETE SET NULL;

-- 重新创建 postings 表的外键约束
ALTER TABLE postings
ADD CONSTRAINT fk_postings_user_account
FOREIGN KEY (user_account_id) REFERENCES fund_accounts(id) ON DELETE CASCADE;

-- 重新创建 fund_account_balances 表的外键约束
ALTER TABLE fund_account_balances
ADD CONSTRAINT fk_fund_account_balances_account
FOREIGN KEY (account_id) REFERENCES fund_accounts(id) ON DELETE CASCADE;

-- =====================================================
-- 第四部分：添加注释
-- =====================================================

COMMENT ON TABLE fund_accounts IS '资金账户表（原 accounts）';
COMMENT ON TABLE fund_account_balances IS '资金账户余额表（原 account_balances）';
