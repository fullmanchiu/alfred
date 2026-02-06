-- 修复 postings 表：使用分离字段来正确引用 user 和 system accounts
-- 这是关系型数据库处理多态关联的标准方式

-- 步骤1: 删除旧的外键约束
ALTER TABLE postings DROP CONSTRAINT IF EXISTS fk_postings_account;
ALTER TABLE postings DROP CONSTRAINT IF EXISTS fk_postings_transaction;

-- 步骤2: 删除旧的触发器
DROP TRIGGER IF EXISTS trg_check_double_entry_balance ON postings;
DROP FUNCTION IF EXISTS check_double_entry_balance();

-- 步骤3: 删除旧的 check constraint（account_type 不再需要）
ALTER TABLE postings DROP CONSTRAINT IF EXISTS chk_account_type;

-- 步骤4: 添加新字段
ALTER TABLE postings
  ADD COLUMN user_account_id BIGINT,
  ADD COLUMN system_account_id BIGINT;

-- 步骤5: 迁移现有数据（如果有的话）
UPDATE postings
SET user_account_id = account_id
WHERE account_type = 'user';

UPDATE postings
SET system_account_id = account_id
WHERE account_type = 'system';

-- 步骤6: 删除旧字段
ALTER TABLE postings DROP COLUMN account_id;
ALTER TABLE postings DROP COLUMN account_type;

-- 步骤7: 添加外键约束
ALTER TABLE postings
  ADD CONSTRAINT fk_postings_transaction
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;

ALTER TABLE postings
  ADD CONSTRAINT fk_postings_user_account
    FOREIGN KEY (user_account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE postings
  ADD CONSTRAINT fk_postings_system_account
    FOREIGN KEY (system_account_id) REFERENCES system_accounts(id) ON DELETE CASCADE;

-- 步骤8: 添加约束确保只有一个账户字段非空
ALTER TABLE postings
  ADD CONSTRAINT chk_one_account
    CHECK (
      (user_account_id IS NOT NULL AND system_account_id IS NULL) OR
      (user_account_id IS NULL AND system_account_id IS NOT NULL)
    );

-- 步骤9: 重新创建借贷平衡检查触发器
CREATE OR REPLACE FUNCTION check_double_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    debit_sum DECIMAL(15,2);
    credit_sum DECIMAL(15,2);
    posting_count INTEGER;
BEGIN
    -- 计算该交易的 posting 数量
    SELECT COUNT(*) INTO posting_count
    FROM postings
    WHERE transaction_id = NEW.transaction_id;

    -- 只有当 posting 数量 >= 2 时才检查
    IF posting_count >= 2 THEN
        SELECT COALESCE(SUM(amount), 0) INTO debit_sum
        FROM postings
        WHERE transaction_id = NEW.transaction_id AND entry_type = 'DEBIT';

        SELECT COALESCE(SUM(amount), 0) INTO credit_sum
        FROM postings
        WHERE transaction_id = NEW.transaction_id AND entry_type = 'CREDIT';

        IF debit_sum != credit_sum THEN
            RAISE EXCEPTION 'Double entry balance violated for transaction %: debits (%) must equal credits (%)',
                NEW.transaction_id, debit_sum, credit_sum;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_double_entry_balance
    AFTER INSERT OR UPDATE ON postings
    FOR EACH ROW
    EXECUTE FUNCTION check_double_entry_balance();

