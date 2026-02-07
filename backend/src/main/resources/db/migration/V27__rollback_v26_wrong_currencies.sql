-- V27__rollback_v26_wrong_currencies.sql
-- 完整回滚V26错误添加的通用币种
-- V26错误地给所有银行账户添加了7个币种(CNY,HKD,USD,EUR,GBP,JPY,AUD)
-- 但实际上每个账户应该只有用户在创建/编辑时勾选的币种

-- 1. 删除V26添加的唯一约束（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_fund_account_balances_account_currency'
    ) THEN
        ALTER TABLE fund_account_balances DROP CONSTRAINT uq_fund_account_balances_account_currency;
    END IF;
END $$;

-- 2. 删除V26错误添加的所有币种记录
-- V26给银行账户添加了除主货币外的6个币种，全部删除
DELETE FROM fund_account_balances
WHERE account_id IN (
    SELECT id FROM fund_accounts WHERE account_type = 'bank' AND deleted = false
)
AND currency IN ('CNY', 'HKD', 'USD', 'EUR', 'GBP', 'JPY', 'AUD')
AND balance = 0  -- 只删除余额为0的，保留有真实交易的余额
AND created_at >= '2026-02-08 00:00:00';  -- 只删除V26之后创建的

-- 注意：这个回滚是不完整的
-- - 只删除了余额为0的币种记录
-- - 如果账户在某币种上有余额，该币种记录会被保留
-- - 正确的做法是通过前端界面手动编辑每个账户，设置正确的币种
