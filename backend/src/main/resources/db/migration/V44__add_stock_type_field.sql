-- 添加证券类型字段到 stock_info 表
-- type: 1=股票, 2=指数, 5=ETF

ALTER TABLE stock_info ADD COLUMN type VARCHAR(10);

-- 添加注释
COMMENT ON COLUMN stock_info.type IS '证券类型: 1=股票, 2=指数, 5=ETF';

-- 创建索引提高查询性能
CREATE INDEX idx_stock_info_type ON stock_info(type);
