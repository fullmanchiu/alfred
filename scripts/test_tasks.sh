#!/bin/bash

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "项目根目录: $PROJECT_ROOT"
echo "后端目录: $BACKEND_DIR"

echo "========================================"
echo "任务管理 API 测试脚本"
echo "========================================"

# 1. 登录
echo ""
echo "[1] 登录中..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test003","password":"test003"}' | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "登录失败"
  exit 1
fi

echo "登录成功，Token: ${TOKEN:0:30}..."

# 2. 创建定时任务
echo ""
echo "[2] 创建定时任务..."
TASK_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_sync_task",
    "taskType": "python_function",
    "scheduleType": "interval",
    "intervalSeconds": 300,
    "enabled": true,
    "params": "{\"module\": \"sync\", \"function\": \"sync_transactions\"}"
  }')

echo "$TASK_RESPONSE" | jq '.'
TASK_SUCCESS=$(echo "$TASK_RESPONSE" | jq -r '.success')

if [ "$TASK_SUCCESS" != "true" ]; then
  echo "创建任务失败"
  exit 1
fi

echo "任务创建成功"

# 3. 获取所有任务
echo ""
echo "[3] 获取所有任务..."
TASKS_RESPONSE=$(curl -s -X GET http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN")

echo "$TASKS_RESPONSE" | jq '.'
TASK_COUNT=$(echo "$TASKS_RESPONSE" | jq -r '.data.tasks | length')
echo "任务总数: $TASK_COUNT"

# 4. 获取启用的任务
echo ""
echo "[4] 获取启用的任务..."
ENABLED_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/v1/tasks/enabled" \
  -H "Authorization: Bearer $TOKEN")

echo "$ENABLED_RESPONSE" | jq '.'
ENABLED_COUNT=$(echo "$ENABLED_RESPONSE" | jq -r '.data.tasks | length')
echo "启用的任务数: $ENABLED_COUNT"

# 5. 创建执行记录
echo ""
echo "[5] 创建执行记录..."
EXECUTION_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/tasks/executions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "test_sync_task",
    "taskType": "python_function",
    "params": "{\"test\": true}"
  }')

echo "$EXECUTION_RESPONSE" | jq '.'
EXECUTION_ID=$(echo "$EXECUTION_RESPONSE" | jq -r '.data.execution.id')
echo "执行记录ID: $EXECUTION_ID"

# 6. 更新执行状态为 RUNNING
echo ""
echo "[6] 更新执行状态为 RUNNING..."
UPDATE_RUNNING_RESPONSE=$(curl -s -X PUT "http://localhost:8080/api/v1/tasks/executions/${EXECUTION_ID}/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "RUNNING"
  }')

echo "$UPDATE_RUNNING_RESPONSE" | jq '.'

# 7. 更新执行状态为 COMPLETED
echo ""
echo "[7] 更新执行状态为 COMPLETED..."
UPDATE_COMPLETED_RESPONSE=$(curl -s -X PUT "http://localhost:8080/api/v1/tasks/executions/${EXECUTION_ID}/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "result": "{\"synced_count\": 10, \"duration_ms\": 1234}"
  }')

echo "$UPDATE_COMPLETED_RESPONSE" | jq '.'

# 8. 获取执行记录状态
echo ""
echo "[8] 获取执行记录状态..."
STATUS_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/v1/tasks/executions/${EXECUTION_ID}" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | jq '.'

# 9. 获取执行历史
echo ""
echo "[9] 获取任务执行历史..."
HISTORY_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/v1/tasks/executions?taskName=test_sync_task&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$HISTORY_RESPONSE" | jq '.'
EXECUTION_COUNT=$(echo "$HISTORY_RESPONSE" | jq -r '.data.executions | length')
echo "执行记录数: $EXECUTION_COUNT"

# 10. 测试失败状态更新
echo ""
echo "[10] 创建新的执行记录并测试失败状态..."
FAILED_EXEC_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/tasks/executions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "test_sync_task",
    "taskType": "python_function"
  }')

FAILED_EXEC_ID=$(echo "$FAILED_EXEC_RESPONSE" | jq -r '.data.execution.id')

FAILED_STATUS_RESPONSE=$(curl -s -X PUT "http://localhost:8080/api/v1/tasks/executions/${FAILED_EXEC_ID}/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "FAILED",
    "error": "连接超时: 无法访问外部服务"
  }')

echo "$FAILED_STATUS_RESPONSE" | jq '.'

# 11. 禁用任务
echo ""
echo "[11] 禁用任务..."
DISABLE_RESPONSE=$(curl -s -X PUT "http://localhost:8080/api/v1/tasks/1/toggle?enabled=false" \
  -H "Authorization: Bearer $TOKEN")

echo "$DISABLE_RESPONSE" | jq '.'

# 12. 重新启用任务
echo ""
echo "[12] 重新启用任务..."
ENABLE_RESPONSE=$(curl -s -X PUT "http://localhost:8080/api/v1/tasks/1/toggle?enabled=true" \
  -H "Authorization: Bearer $TOKEN")

echo "$ENABLE_RESPONSE" | jq '.'

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"
