-- 股票分析相关表

-- 股票基本信息表
CREATE TABLE IF NOT EXISTS stock_info (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,  -- 股票代码 (如: 600000)
    name VARCHAR(100) NOT NULL,         -- 股票名称
    market VARCHAR(20),                  -- 市场 (SH/SZ)
    industry VARCHAR(100),               -- 行业
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户自选股表
CREATE TABLE IF NOT EXISTS user_stocks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id BIGINT NOT NULL REFERENCES stock_info(id) ON DELETE CASCADE,
    note TEXT,                          -- 备注
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stock_id)
);

-- 历史K线数据表
CREATE TABLE IF NOT EXISTS stock_klines (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL REFERENCES stock_info(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    open DECIMAL(10, 2) NOT NULL,
    high DECIMAL(10, 2) NOT NULL,
    low DECIMAL(10, 2) NOT NULL,
    close DECIMAL(10, 2) NOT NULL,
    volume BIGINT NOT NULL,
    amount DECIMAL(20, 2),               -- 成交额
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_id, trade_date)
);

-- 技术指标缓存表
CREATE TABLE IF NOT EXISTS stock_indicators (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL REFERENCES stock_info(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    ma5 DECIMAL(10, 2),
    ma10 DECIMAL(10, 2),
    ma20 DECIMAL(10, 2),
    ma60 DECIMAL(10, 2),
    macd DECIMAL(10, 4),
    macd_signal DECIMAL(10, 4),
    macd_hist DECIMAL(10, 4),
    rsi DECIMAL(8, 4),
    kdj_k DECIMAL(8, 4),
    kdj_d DECIMAL(8, 4),
    kdj_j DECIMAL(8, 4),
    boll_upper DECIMAL(10, 2),
    boll_middle DECIMAL(10, 2),
    boll_lower DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_id, trade_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_stock_klines_date ON stock_klines(stock_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_indicators_date ON stock_indicators(stock_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_stocks_user ON user_stocks(user_id);

-- 插入一些示例股票
INSERT INTO stock_info (code, name, market) VALUES
    ('600000', '浦发银行', 'SH'),
    ('600036', '招商银行', 'SH'),
    ('000001', '平安银行', 'SZ')
ON CONFLICT (code) DO NOTHING;

-- 注释
COMMENT ON TABLE stock_klines IS '历史K线数据 - 由Python定时任务每天收盘后更新';
COMMENT ON TABLE stock_indicators IS '技术指标缓存 - 缓存1小时，由Python计算';
COMMENT ON TABLE user_stocks IS '用户自选股';
