-- 用户图表配置表
-- User Chart Configuration Table

CREATE TABLE IF NOT EXISTS user_chart_config (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    config TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_user_chart_config_user_id ON user_chart_config(user_id);

-- 添加注释
COMMENT ON TABLE user_chart_config IS '用户图表配置表';
COMMENT ON COLUMN user_chart_config.id IS '主键ID';
COMMENT ON COLUMN user_chart_config.user_id IS '用户ID';
COMMENT ON COLUMN user_chart_config.config IS '图表配置（JSON格式）';
COMMENT ON COLUMN user_chart_config.updated_at IS '更新时间';
COMMENT ON COLUMN user_chart_config.created_at IS '创建时间';
