-- 任务调度表
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    schedule_type VARCHAR(20) NOT NULL,
    cron_expr VARCHAR(100),
    interval_seconds INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    params JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_scheduled_tasks_name ON scheduled_tasks(name);

-- 任务执行记录表
CREATE TABLE IF NOT EXISTS task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB,
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_task_executions_task_name ON task_executions(task_name);
CREATE INDEX ix_task_executions_status ON task_executions(status);
CREATE INDEX ix_task_executions_created_at ON task_executions(created_at DESC);

-- 添加表注释
COMMENT ON TABLE scheduled_tasks IS '任务调度配置表';
COMMENT ON COLUMN scheduled_tasks.id IS '任务ID';
COMMENT ON COLUMN scheduled_tasks.name IS '任务名称（唯一）';
COMMENT ON COLUMN scheduled_tasks.task_type IS '任务类型：python_function, http_request, shell_command等';
COMMENT ON COLUMN scheduled_tasks.schedule_type IS '调度类型：cron（cron表达式）, interval（固定间隔）, once（一次性）';
COMMENT ON COLUMN scheduled_tasks.cron_expr IS 'Cron表达式（schedule_type=cron时使用）';
COMMENT ON COLUMN scheduled_tasks.interval_seconds IS '间隔秒数（schedule_type=interval时使用）';
COMMENT ON COLUMN scheduled_tasks.enabled IS '是否启用';
COMMENT ON COLUMN scheduled_tasks.params IS '任务参数（JSON格式）';

COMMENT ON TABLE task_executions IS '任务执行记录表';
COMMENT ON COLUMN task_executions.id IS '执行记录ID';
COMMENT ON COLUMN task_executions.task_name IS '任务名称';
COMMENT ON COLUMN task_executions.status IS '执行状态：pending, running, completed, failed';
COMMENT ON COLUMN task_executions.retry_count IS '已重试次数';
COMMENT ON COLUMN task_executions.max_retries IS '最大重试次数';
COMMENT ON COLUMN task_executions.started_at IS '开始执行时间';
COMMENT ON COLUMN task_executions.completed_at IS '完成时间';
COMMENT ON COLUMN task_executions.result IS '执行结果（JSON格式）';
COMMENT ON COLUMN task_executions.error IS '错误信息';
