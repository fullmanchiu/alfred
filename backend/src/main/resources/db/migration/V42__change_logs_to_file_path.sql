-- 修改日志字段为文件路径
ALTER TABLE task_executions ALTER COLUMN logs TYPE VARCHAR(500);
ALTER TABLE task_executions RENAME COLUMN logs TO log_file_path;
COMMENT ON COLUMN task_executions.log_file_path IS '日志文件路径（相对于日志目录）';
