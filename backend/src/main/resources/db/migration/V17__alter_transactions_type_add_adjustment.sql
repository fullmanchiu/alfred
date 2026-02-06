-- 添加 adjustment 类型到 transactions.type 约束
-- 先删除旧的约束
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;

-- 添加新的约束，包含 adjustment 类型
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('income', 'expense', 'transfer', 'loan_in', 'loan_out', 'repayment', 'adjustment'));
