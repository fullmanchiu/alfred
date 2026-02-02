-- 插入测试股票数据
-- 注意：这是仅用于测试的示例数据，生产环境应由Python定时任务填充

-- 插入股票信息
INSERT INTO stock_info (code, name, market, industry) VALUES
('000001', '平安银行', 'sz', '银行'),
('000002', '万科A', 'sz', '房地产'),
('600000', '浦发银行', 'sh', '银行'),
('600036', '招商银行', 'sh', '银行')
ON CONFLICT (code) DO NOTHING;

-- 插入K线数据（最近5天）
INSERT INTO stock_klines (stock_id, trade_date, open, high, low, close, volume, amount)
SELECT
    s.id,
    (CURRENT_DATE - INTERVAL '1 day')::DATE,
    10.50,
    10.80,
    10.40,
    10.70,
    1000000,
    10700000.00
FROM stock_info s
WHERE s.code = '000001'
ON CONFLICT (stock_id, trade_date) DO NOTHING;

-- 插入技术指标
INSERT INTO stock_indicators (stock_id, trade_date, ma5, ma10, ma20, macd, rsi)
SELECT
    s.id,
    (CURRENT_DATE - INTERVAL '1 day')::DATE,
    10.60,
    10.55,
    10.50,
    0.05,
    55.5
FROM stock_info s
WHERE s.code = '000001'
ON CONFLICT (stock_id, trade_date) DO NOTHING;
