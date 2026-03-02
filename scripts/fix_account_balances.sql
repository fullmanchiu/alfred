-- ============================================================================
-- 账户余额修复脚本
--
-- 功能：根据所有激活的交易记录重新计算账户余额
-- 用法：PGPASSWORD='xxx' psql -h host -p port -U user -d db -f fix_account_balances.sql
--
-- 交易类型对余额的影响：
--   income:    to_account +amount
--   expense:   from_account -amount
--   transfer:  from_account -amount, to_account +amount
--   loan_in:   to_account +amount
--   loan_out:  from_account -amount
--   repayment: from_account -amount
-- ============================================================================

BEGIN;

-- 1. 备份当前余额到临时表（用于对比）
DROP TABLE IF EXISTS balance_backup;
CREATE TEMP TABLE balance_backup AS
SELECT
    ab.id,
    ab.account_id,
    fa.name as account_name,
    ab.currency,
    ab.balance as old_balance,
    ab.updated_at
FROM fund_account_balances ab
JOIN fund_accounts fa ON ab.account_id = fa.id;

-- 2. 计算每个账户每种货币的正确余额
DROP TABLE IF EXISTS calculated_balances;
CREATE TEMP TABLE calculated_balances AS
WITH inflows AS (
    -- 收入和转入
    SELECT
        to_account_id AS account_id,
        currency,
        SUM(amount) AS total_inflow
    FROM transactions
    WHERE is_active = true
      AND to_account_id IS NOT NULL
      AND type IN ('income', 'transfer', 'loan_in')
    GROUP BY to_account_id, currency
),
outflows AS (
    -- 支出和转出
    SELECT
        from_account_id AS account_id,
        currency,
        SUM(amount) AS total_outflow
    FROM transactions
    WHERE is_active = true
      AND from_account_id IS NOT NULL
      AND type IN ('expense', 'transfer', 'loan_out', 'repayment')
    GROUP BY from_account_id, currency
),
balance_changes AS (
    -- 合并流入流出
    SELECT
        COALESCE(i.account_id, o.account_id) AS account_id,
        COALESCE(i.currency, o.currency) AS currency,
        COALESCE(i.total_inflow, 0) AS inflow,
        COALESCE(o.total_outflow, 0) AS outflow,
        COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0) AS net_change
    FROM inflows i
    FULL OUTER JOIN outflows o ON i.account_id = o.account_id AND i.currency = o.currency
)
SELECT
    account_id,
    currency,
    net_change AS calculated_balance
FROM balance_changes
WHERE account_id IS NOT NULL;

-- 3. 显示修复前后的对比
\echo '========== 余额修复对比 =========='
\echo ''
\echo '--- 账户 421 (ZA Card) ---'
SELECT
    cb.account_id,
    fa.name,
    cb.currency,
    COALESCE(bb.old_balance, 0) AS old_balance,
    cb.calculated_balance AS new_balance,
    cb.calculated_balance - COALESCE(bb.old_balance, 0) AS difference
FROM calculated_balances cb
JOIN fund_accounts fa ON cb.account_id = fa.id
LEFT JOIN balance_backup bb ON cb.account_id = bb.account_id AND cb.currency = bb.currency
WHERE cb.account_id = 421;

\echo ''
\echo '--- 账户 434 (微信钱包) ---'
SELECT
    cb.account_id,
    fa.name,
    cb.currency,
    COALESCE(bb.old_balance, 0) AS old_balance,
    cb.calculated_balance AS new_balance,
    cb.calculated_balance - COALESCE(bb.old_balance, 0) AS difference
FROM calculated_balances cb
JOIN fund_accounts fa ON cb.account_id = fa.id
LEFT JOIN balance_backup bb ON cb.account_id = bb.account_id AND cb.currency = bb.currency
WHERE cb.account_id = 434;

-- 4. 删除旧余额记录（只删除有新计算值的）
DELETE FROM fund_account_balances
WHERE (account_id, currency) IN (
    SELECT account_id, currency FROM calculated_balances
);

-- 5. 插入新的余额记录
INSERT INTO fund_account_balances (account_id, currency, balance, created_at, updated_at)
SELECT
    account_id,
    currency,
    calculated_balance,
    NOW(),
    NOW()
FROM calculated_balances;

-- 6. 更新 fund_accounts 表的主余额字段
UPDATE fund_accounts fa
SET balance = cb.calculated_balance,
    updated_at = NOW()
FROM calculated_balances cb
WHERE fa.id = cb.account_id
  AND fa.currency = cb.currency;

-- 7. 显示所有有变化的账户
\echo ''
\echo '========== 所有余额变化汇总 =========='
SELECT
    fa.user_id,
    u.username,
    cb.account_id,
    fa.name AS account_name,
    cb.currency,
    COALESCE(bb.old_balance, 0) AS old_balance,
    cb.calculated_balance AS new_balance,
    cb.calculated_balance - COALESCE(bb.old_balance, 0) AS difference
FROM calculated_balances cb
JOIN fund_accounts fa ON cb.account_id = fa.id
JOIN users u ON fa.user_id = u.id
LEFT JOIN balance_backup bb ON cb.account_id = bb.account_id AND cb.currency = bb.currency
ORDER BY fa.user_id, cb.account_id, cb.currency;

-- 8. 确认修复
\echo ''
\echo '========== 修复完成 =========='
\echo '如果确认无误，请执行 COMMIT;'
\echo '如果需要回滚，请执行 ROLLBACK;'
\echo ''
\echo '当前处于事务中，未提交。请检查上述输出后决定是否提交。'

-- 确认后提交
COMMIT;
