-- 重命名 scheduled_tasks 表为 tasks
ALTER TABLE scheduled_tasks RENAME TO tasks;

-- 添加新字段 autoRun (布尔值，默认 true)
ALTER TABLE tasks ADD COLUMN auto_run BOOLEAN DEFAULT TRUE;

-- 添加新字段 scheduleRule (字符串，可为空)
ALTER TABLE tasks ADD COLUMN schedule_rule VARCHAR(255);

-- 迁移数据：从 scheduleType/cronExpr/intervalSeconds 合并为 scheduleRule
UPDATE tasks
SET schedule_rule = CASE
    WHEN schedule_type = 'cron' THEN 'cron:' || cron_expr
    WHEN schedule_type = 'interval' THEN 'interval:' || interval_seconds::text
    ELSE NULL
END;

-- 删除旧字段
ALTER TABLE tasks DROP COLUMN schedule_type;
ALTER TABLE tasks DROP COLUMN cron_expr;
ALTER TABLE tasks DROP COLUMN interval_seconds;
ALTER TABLE tasks DROP COLUMN enabled;

-- 更新序列名称（如果有的话）
-- ALTER SEQUENCE scheduled_tasks_id_seq RENAME TO tasks_id_seq;
