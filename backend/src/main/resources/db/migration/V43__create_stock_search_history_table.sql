-- 股票搜索历史表
CREATE TABLE stock_search_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引
CREATE INDEX idx_stock_search_user_id ON stock_search_history(user_id);
CREATE INDEX idx_stock_search_user_created ON stock_search_history(user_id, created_at DESC);

-- 添加唯一约束（同一用户的同一关键词只保留一条记录）
CREATE UNIQUE INDEX idx_stock_search_user_keyword ON stock_search_history(user_id, keyword);
