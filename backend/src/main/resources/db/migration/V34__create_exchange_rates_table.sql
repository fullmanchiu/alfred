-- 创建汇率表
CREATE TABLE exchange_rates (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    from_currency VARCHAR(3) NOT NULL,  -- USD, HKD, EUR, JPY 等
    to_currency VARCHAR(3) NOT NULL,    -- 目前固定为 CNY
    rate DECIMAL(10,6) NOT NULL,        -- 1 from_currency = X CNY
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, from_currency, to_currency)
);

-- 创建索引
CREATE INDEX idx_exchange_rates_date ON exchange_rates(date);
CREATE INDEX idx_exchange_rates_currency ON exchange_rates(from_currency, to_currency);

-- 添加注释
COMMENT ON TABLE exchange_rates IS '汇率表：存储外汇牌价数据';
COMMENT ON COLUMN exchange_rates.date IS '汇率生效日期';
COMMENT ON COLUMN exchange_rates.from_currency IS '原始币种（ISO 4217标准）';
COMMENT ON COLUMN exchange_rates.to_currency IS '目标币种（ISO 4217标准）';
COMMENT ON COLUMN exchange_rates.rate IS '汇率：1 from_currency = X to_currency';
COMMENT ON COLUMN exchange_rates.created_at IS '创建时间';
COMMENT ON COLUMN exchange_rates.updated_at IS '更新时间';
