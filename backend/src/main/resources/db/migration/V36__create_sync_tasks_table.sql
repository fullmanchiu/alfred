-- 创建股票数据同步任务表
CREATE TABLE IF NOT EXISTS sync_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_code VARCHAR(20) NOT NULL,
    task_name VARCHAR(100),
    task_type VARCHAR(20) NOT NULL DEFAULT 'kline',
    sync_interval INTEGER NOT NULL DEFAULT 1440,
    status VARCHAR(20) NOT NULL DEFAULT 'stopped',
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(20),
    last_sync_records INTEGER DEFAULT 0,
    last_error TEXT,
    total_records INTEGER DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stock_code, task_type)
);

-- 添加索引
CREATE INDEX idx_sync_tasks_user_id ON sync_tasks(user_id);
CREATE INDEX idx_sync_tasks_stock_code ON sync_tasks(stock_code);
CREATE INDEX idx_sync_tasks_status ON sync_tasks(status);

COMMENT ON TABLE sync_tasks IS '股票数据同步任务配置表';
COMMENT ON COLUMN sync_tasks.id IS '任务ID';
COMMENT ON COLUMN sync_tasks.user_id IS '用户ID';
COMMENT ON COLUMN sync_tasks.stock_code IS '股票代码';
COMMENT ON COLUMN sync_tasks.task_name IS '任务名称';
COMMENT ON COLUMN sync_tasks.task_type IS '任务类型: kline(K线数据), indicator(技术指标)';
COMMENT ON COLUMN sync_tasks.sync_interval IS '同步间隔(分钟)，默认1440分钟(1天)';
COMMENT ON COLUMN sync_tasks.status IS '任务状态: running(运行中), stopped(已停止), paused(已暂停), error(错误)';
COMMENT ON COLUMN sync_tasks.last_sync_at IS '最后同步时间';
COMMENT ON COLUMN sync_tasks.last_sync_status IS '最后同步状态: success, failed';
COMMENT ON COLUMN sync_tasks.last_sync_records IS '最后一次同步的记录数';
COMMENT ON COLUMN sync_tasks.last_error IS '最后一次错误信息';
COMMENT ON COLUMN sync_tasks.total_records IS '累计同步记录数';
COMMENT ON COLUMN sync_tasks.enabled IS '是否启用';
COMMENT ON COLUMN sync_tasks.created_at IS '创建时间';
COMMENT ON COLUMN sync_tasks.updated_at IS '更新时间';
