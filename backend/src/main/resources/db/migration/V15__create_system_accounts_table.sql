-- System Accounts 表：系统科目账户（主要是权益类）
CREATE TABLE system_accounts (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- 'EQUITY', 'INCOME', 'EXPENSE'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化权益类账户数据
INSERT INTO system_accounts (code, name, account_type, description) VALUES
('EQUITY_INITIAL', '初始投入', 'EQUITY', '创建账户时的初始余额'),
('EQUITY_ADD', '追加投入', 'EQUITY', '通过余额校准增加的资金'),
('EQUITY_WITHDRAW', '撤回投入', 'EQUITY', '通过余额校准减少的资金');
