-- 添加历史K线数据字段到stock_klines表
ALTER TABLE stock_klines
ADD COLUMN pre_close NUMERIC(10, 2),      -- 昨收价
ADD COLUMN turn_rate NUMERIC(10, 4),       -- 换手率 (%)
ADD COLUMN pct_change NUMERIC(10, 4);      -- 涨跌幅 (%)
