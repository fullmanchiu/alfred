-- 添加日志字段到任务执行记录表
ALTER TABLE task_executions ADD COLUMN logs TEXT DEFAULT NULL;
COMMENT ON COLUMN task_executions.logs IS '任务执行日志（JSON 数组格式）';
