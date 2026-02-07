-- V26__add_unique_constraint_and_common_currencies.sql
-- 给所有银行账户添加7种通用币种，并添加唯一约束
-- 这是错误的做法，每个账户应该只保留用户选择的币种

-- 1. 添加唯一约束
ALTER TABLE fund_account_balances
ADD CONSTRAINT uq_fund_account_balances_account_currency
UNIQUE (account_id, currency);

-- 2. 给所有银行账户添加7种通用币种（CNY, HKD, USD, EUR, GBP, JPY, AUD）
INSERT INTO fund_account_balances (account_id, currency, balance, created_at, updated_at)
SELECT
    fa.id as account_id,
    c.currency_code as currency,
    0 as balance,
    fa.created_at,
    fa.updated_at
FROM fund_accounts fa
CROSS JOIN (VALUES ('CNY'), ('HKD'), ('USD'), ('EUR'), ('GBP'), ('JPY'), ('AUD')) AS c(currency_code)
WHERE fa.account_type = 'bank'
  AND fa.deleted = false
  AND fa.currency != c.currency_code  -- 排除主货币（主货币已有余额记录）
  AND NOT EXISTS (
    -- 避免重复插入
    SELECT 1
    FROM fund_account_balances fab
    WHERE fab.account_id = fa.id
      AND fab.currency = c.currency_code
  );
