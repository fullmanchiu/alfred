#!/bin/bash
# 测试 Java API 客户端
#
# 前提条件：
# 1. Java 后端已启动 (http://localhost:8080)
# 2. Python 环境已配置

set -e

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PY_SERVICE="$PROJECT_ROOT/py-service"

echo -e "${GREEN}=== 测试 Java API 客户端 ===${NC}"
echo ""

# 检查 Java 后端是否运行
echo -e "${YELLOW}1. 检查 Java 后端状态...${NC}"
HEALTH_CHECK=$(curl -s http://localhost:8080/actuator/health 2>/dev/null || echo "error")
if [[ "$HEALTH_CHECK" == "error" ]]; then
    echo -e "${RED}Java 后端未运行，请先启动后端服务${NC}"
    echo "  cd backend && ./gradlew bootRun"
    exit 1
fi
echo -e "${GREEN}Java 后端运行正常${NC}"
echo ""

# 运行 Python 测试
echo -e "${YELLOW}2. 运行 Python 客户端测试...${NC}"
cd "$PY_SERVICE"

# 创建临时测试脚本
cat > /tmp/test_java_client.py << 'EOF'
#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/qiuliang/code/alfred/py-service')

from java_client import java_client
from dto.task import ScheduledTaskDTO, TaskType, ScheduleType
import json

print("=== Java API 客户端测试 ===\n")

# 1. 健康检查
print("1. 健康检查...")
if java_client.health_check():
    print("  ✓ Java 后端健康\n")
else:
    print("  ✗ Java 后端不可用")
    sys.exit(1)

# 2. 获取所有任务
print("2. 获取所有任务...")
tasks = java_client.get_all_scheduled_tasks()
print(f"  找到 {len(tasks)} 个任务")
for task in tasks:
    print(f"    - {task['name']} ({task['taskType']}) enabled={task['enabled']}")

# 3. 创建测试任务
print("\n3. 创建测试任务...")
test_task_dto = ScheduledTaskDTO(
    name="测试任务 - Python客户端",
    taskType=TaskType.SYNC_KLINES,
    scheduleType=ScheduleType.CRON,
    cronExpr="0 0 * * *",
    enabled=False,
    params=json.dumps({"stock_code": "000001", "days": 30})
)

created_task = java_client.create_scheduled_task(test_task_dto.to_request())
if created_task:
    print(f"  ✓ 任务创建成功: id={created_task['id']}")
    task_id = created_task['id']
else:
    print("  ✗ 任务创建失败")
    sys.exit(1)

# 4. 获取单个任务（通过再次获取所有任务）
print("\n4. 验证任务已创建...")
tasks_after = java_client.get_all_scheduled_tasks()
found = any(t['id'] == task_id for t in tasks_after)
if found:
    print(f"  ✓ 任务 {task_id} 已在列表中")
else:
    print(f"  ✗ 未找到任务 {task_id}")

# 5. 创建执行记录
print("\n5. 创建执行记录...")
execution = java_client.create_execution(
    task_name="测试任务 - Python客户端",
    task_type=TaskType.SYNC_KLINES,
    params={"stock_code": "000001", "days": 30}
)
if execution:
    print(f"  ✓ 执行记录创建成功: id={execution['id']}")
    execution_id = execution['id']
else:
    print("  ✗ 执行记录创建失败")
    sys.exit(1)

# 6. 更新执行状态
print("\n6. 更新执行状态...")
updated = java_client.update_execution_status(
    execution_id=execution_id,
    status="running"
)
if updated:
    print(f"  ✓ 状态更新为 running")
else:
    print("  ✗ 状态更新失败")

# 7. 完成执行
print("\n7. 完成执行...")
completed = java_client.update_execution_status(
    execution_id=execution_id,
    status="completed",
    result={"records_count": 100, "total_fetched": 100}
)
if completed:
    print(f"  ✓ 状态更新为 completed")
else:
    print("  ✗ 完成状态更新失败")

# 8. 获取执行历史
print("\n8. 获取执行历史...")
history = java_client.get_execution_history("测试任务 - Python客户端", limit=5)
print(f"  找到 {len(history)} 条执行记录")

# 9. 启用任务
print("\n9. 启用任务...")
enabled_task = java_client.toggle_task(task_id, True)
if enabled_task:
    print(f"  ✓ 任务已启用")
else:
    print("  ✗ 任务启用失败")

# 10. 禁用任务
print("\n10. 禁用任务...")
disabled_task = java_client.toggle_task(task_id, False)
if disabled_task:
    print(f"  ✓ 任务已禁用")
else:
    print("  ✗ 任务禁用失败")

# 11. 获取启用的任务
print("\n11. 获取启用的任务...")
enabled_tasks = java_client.get_enabled_scheduled_tasks()
print(f"  找到 {len(enabled_tasks)} 个启用的任务")

# 12. 清理：删除测试任务
print("\n12. 清理测试数据...")
deleted = java_client.delete_task(task_id)
if deleted:
    print(f"  ✓ 测试任务已删除")
else:
    print(f"  ✗ 测试任务删除失败")

print("\n=== 所有测试完成 ===")
EOF

# 运行测试
python3 /tmp/test_java_client.py

echo ""
echo -e "${GREEN}=== 测试完成 ===${NC}"
