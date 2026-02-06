-- V13__add_account_details.sql
-- 为 accounts 表添加账户详细信息字段

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS fps_id VARCHAR(50);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS swift_code VARCHAR(20);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS iban VARCHAR(50);

-- 添加注释
COMMENT ON COLUMN accounts.fps_id IS '香港转数快FPS ID';
COMMENT ON COLUMN accounts.swift_code IS '国际汇款SWIFT代码';
COMMENT ON COLUMN accounts.iban IS '欧洲银行账户IBAN';
