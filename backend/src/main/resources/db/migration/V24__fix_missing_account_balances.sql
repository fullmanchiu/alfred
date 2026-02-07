-- V24__fix_missing_account_balances.sql
-- 为没有余额记录的账户创建初始余额记录

INSERT INTO fund_account_balances (account_id, currency, balance, created_at, updated_at)
SELECT
    id,
    currency,
    balance,
    created_at,
    updated_at
FROM fund_accounts
WHERE deleted = false
  AND balance IS NOT NULL
  AND id NOT IN (
    SELECT account_id
    FROM fund_account_balances
  );
