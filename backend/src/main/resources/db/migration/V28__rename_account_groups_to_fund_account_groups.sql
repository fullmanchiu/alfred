-- V28__rename_account_groups_to_fund_account_groups.sql
-- 重命名 account_groups 表为 fund_account_groups，明确表示这是金融账户组

-- =====================================================
-- 第一部分：删除外键约束
-- =====================================================

-- 删除 currency_accounts 表的外键约束
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_currency_accounts_account_group'
        AND table_name = 'currency_accounts'
    ) THEN
        ALTER TABLE currency_accounts DROP CONSTRAINT fk_currency_accounts_account_group;
    END IF;
END $$;

-- =====================================================
-- 第二部分：重命名表
-- =====================================================

ALTER TABLE account_groups RENAME TO fund_account_groups;

-- =====================================================
-- 第三部分：重新创建外键约束
-- =====================================================

-- 重新创建 currency_accounts 表的外键约束
ALTER TABLE currency_accounts
ADD CONSTRAINT fk_currency_accounts_fund_account_group
FOREIGN KEY (account_group_id) REFERENCES fund_account_groups(id) ON DELETE CASCADE;

-- =====================================================
-- 第四部分：更新索引名称（如果需要）
-- =====================================================

-- 索引会自动重命名，无需手动处理

-- =====================================================
-- 第五部分：添加注释
-- =====================================================

COMMENT ON TABLE fund_account_groups IS '金融账户组表（原 account_groups）';
