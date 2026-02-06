-- V10__create_multi_currency_tables.sql
-- Alfred 多货币账户系统 - 数据库迁移脚本
-- 创建三层结构：金融机构 → 账户组 → 货币账户

-- =====================================================
-- 第一部分：创建新表
-- =====================================================

-- 1. 创建金融机构表
CREATE TABLE IF NOT EXISTS institutions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    country_code VARCHAR(3) DEFAULT 'CN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_institutions_user_id ON institutions(user_id);
CREATE INDEX IF NOT EXISTS idx_institutions_type ON institutions(type);
CREATE INDEX IF NOT EXISTS idx_institutions_is_active ON institutions(is_active);

-- 2. 创建账户组表
CREATE TABLE IF NOT EXISTS account_groups (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    institution_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100),
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_account_groups_user_id ON account_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_account_groups_institution_id ON account_groups(institution_id);
CREATE INDEX IF NOT EXISTS idx_account_groups_is_active ON account_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_account_groups_is_default ON account_groups(is_default);

-- 3. 创建货币账户表
CREATE TABLE IF NOT EXISTS currency_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    account_group_id BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_currency_accounts_user_id ON currency_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_currency_accounts_account_group_id ON currency_accounts(account_group_id);
CREATE INDEX IF NOT EXISTS idx_currency_accounts_currency ON currency_accounts(currency);
CREATE INDEX IF NOT EXISTS idx_currency_accounts_is_active ON currency_accounts(is_active);

-- =====================================================
-- 第二部分：为 transactions 表增加 currency 字段
-- =====================================================

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'CNY';

CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
