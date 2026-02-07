-- V25__rebuild_multi_currency_balances.sql
-- 从交易历史重建所有币种的余额记录

-- 从 postings 表和交易历史中计算每个账户的每种货币的实际余额
-- 并插入到 fund_account_balances 表中

INSERT INTO fund_account_balances (account_id, currency, balance, created_at, updated_at)
WITH account_transactions AS (
    -- 获取所有涉及账户的交易，包括 from_account 和 to_account
    SELECT
        COALESCE(t.from_account_id, t.to_account_id) as account_id,
        t.currency,
        SUM(
            CASE
                WHEN t.from_account_id IS NOT NULL THEN -t.amount  -- 支出
                ELSE t.amount  -- 收入
            END
        ) as balance_change
    FROM transactions t
    WHERE t.is_active = true
      AND (t.from_account_id IS NOT NULL OR t.to_account_id IS NOT NULL)
      AND t.currency IS NOT NULL
    GROUP BY
        COALESCE(t.from_account_id, t.to_account_id),
        t.currency
    HAVING SUM(
        CASE
            WHEN t.from_account_id IS NOT NULL THEN -t.amount
            ELSE t.amount
        END
    ) != 0
)
SELECT
    at.account_id,
    at.currency,
    at.balance_change as balance,
    fa.created_at,
    fa.updated_at
FROM account_transactions at
INNER JOIN fund_accounts fa ON fa.id = at.account_id
WHERE NOT EXISTS (
    -- 避免重复插入
    SELECT 1
    FROM fund_account_balances fab
    WHERE fab.account_id = at.account_id
      AND fab.currency = at.currency
);
