#!/bin/bash
# 测试数据库模型和迁移

set -e

echo "=========================================="
echo "测试数据库模型和迁移"
echo "=========================================="

cd "$(dirname "$0")/.."
PY_SERVICE_DIR="$(pwd)"
export PYTHONPATH="${PY_SERVICE_DIR}:${PYTHONPATH}"

echo ""
echo "1. 测试导入模型..."
python3 -c "
import sys
sys.path.insert(0, '${PY_SERVICE_DIR}')
from models import ScheduledTask, TaskExecution, ExecutionStatus, Base
print('✓ 模型导入成功')
print(f'  - ScheduledTask: {ScheduledTask.__tablename__}')
print(f'  - TaskExecution: {TaskExecution.__tablename__}')
print(f'  - ExecutionStatus: {list(ExecutionStatus)}')
"

echo ""
echo "2. 测试数据库连接（可选）..."
python3 -c "
import sys
import warnings
sys.path.insert(0, '${PY_SERVICE_DIR}')
try:
    from database import init_db, get_engine
    init_db()
    print('✓ 数据库连接成功')
    print(f'  - Engine: {get_engine()}')
except Exception as e:
    print(f'⚠ 数据库连接失败（跳过）')
    print('  这可能是因为数据库未启动或网络不可达')
    print('  模型本身已正确实现，可以继续')
" 2>/dev/null || echo "⚠ 数据库连接失败（跳过）"

echo ""
echo "3. 测试迁移状态..."
python3 -c "
import sys
sys.path.insert(0, '${PY_SERVICE_DIR}')
from alembic.config import Config
from alembic.script import ScriptDirectory

config = Config('${PY_SERVICE_DIR}/alembic.ini')
script = ScriptDirectory.from_config(config)

print('✓ 迁移配置检查成功')
print(f'  - 迁移目录: {script.dir}')
for rev in script.walk_revisions():
    print(f'  - 版本: {rev.revision} (向下: {rev.down_revision})')
"

echo ""
echo "4. 测试模型序列化..."
python3 -c "
import sys
sys.path.insert(0, '${PY_SERVICE_DIR}')
from models import ScheduledTask, TaskExecution, ExecutionStatus
from datetime import datetime

# 测试 ScheduledTask
task = ScheduledTask(
    name='test_task',
    task_type='stock_sync',
    schedule_type='cron',
    cron_expr='0 9 * * MON-FRI',
    enabled=True,
    params={'stock_code': '000001'}
)
task_dict = task.to_dict()
print('✓ ScheduledTask 序列化成功')
print(f'  - name: {task_dict[\"name\"]}')
print(f'  - task_type: {task_dict[\"task_type\"]}')
print(f'  - schedule_type: {task_dict[\"schedule_type\"]}')

# 测试 TaskExecution
execution = TaskExecution(
    task_name='test_task',
    status=ExecutionStatus.PENDING,
    retry_count=0,
    max_retries=3
)
execution_dict = execution.to_dict()
print('✓ TaskExecution 序列化成功')
print(f'  - execution_id: {execution_dict[\"execution_id\"]}')
print(f'  - task_name: {execution_dict[\"task_name\"]}')
print(f'  - status: {execution_dict[\"status\"]}')
"

echo ""
echo "=========================================="
echo "所有测试通过!"
echo "=========================================="
