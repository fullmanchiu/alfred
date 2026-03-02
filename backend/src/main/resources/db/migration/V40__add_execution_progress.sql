-- 添加任务执行进度字段
ALTER TABLE task_executions ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;
