#!/bin/bash
# WebSocket 端到端测试脚本
# 测试统一 WebSocket 架构的功能

BASE_URL="http://localhost:8080"
AUTH_TOKEN=""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 1. 登录获取 token
log_info "1. 登录测试账号..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test003","password":"test003"}')

AUTH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$AUTH_TOKEN" ]; then
    log_error "登录失败"
    echo $LOGIN_RESPONSE
    exit 1
fi

log_info "登录成功，token: ${AUTH_TOKEN:0:20}..."

# 2. 检查 WebSocket 连接状态
log_info "2. 检查 WebSocket 连接状态..."
WS_STATUS=$(curl -s "$BASE_URL/api/v1/system/websocket-status" \
  -H "Authorization: Bearer $AUTH_TOKEN")

echo $WS_STATUS | python3 -m json.tool 2>/dev/null || echo $WS_STATUS

PYTHON_CONNECTED=$(echo $WS_STATUS | grep -o '"connected":[^,]*' | head -1 | cut -d':' -f2)

if [ "$PYTHON_CONNECTED" = "true" ]; then
    log_info "✓ Python WebSocket 已连接"
else
    log_error "✗ Python WebSocket 未连接"
fi

# 3. 创建测试任务
log_info "3. 创建测试任务..."
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/tasks" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WebSocket测试任务",
    "taskType": "hello",
    "scheduleType": "manual",
    "autoRun": false,
    "params": "{\"name\": \"World\"}"
  }')

TASK_ID=$(echo $TASK_RESPONSE | grep -o '"taskId":[0-9]*' | cut -d':' -f2)

if [ -n "$TASK_ID" ]; then
    log_info "✓ 任务创建成功，ID: $TASK_ID"
else
    log_error "✗ 任务创建失败"
    echo $TASK_RESPONSE
fi

# 4. 立即执行任务（通过 WebSocket 通讯）
log_info "4. 立即执行任务..."
EXECUTE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/tasks/execute" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "WebSocket测试",
    "taskType": "hello",
    "params": "{\"name\": \"WebSocket\"}"
  }')

echo $EXECUTE_RESPONSE | python3 -m json.tool 2>/dev/null || echo $EXECUTE_RESPONSE

EXECUTION_ID=$(echo $EXECUTE_RESPONSE | grep -o '"executionId":"[^"]*' | cut -d'"' -f4)

if [ -n "$EXECUTION_ID" ]; then
    log_info "✓ 任务已提交执行，executionId: $EXECUTION_ID"
else
    log_error "✗ 任务执行失败"
fi

# 5. 等待并查询执行状态
log_info "5. 查询任务执行状态..."
sleep 3

if [ -n "$EXECUTION_ID" ]; then
    STATUS_RESPONSE=$(curl -s "$BASE_URL/api/v1/tasks/executions/$EXECUTION_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN")

    echo $STATUS_RESPONSE | python3 -m json.tool 2>/dev/null || echo $STATUS_RESPONSE

    STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*' | cut -d':' -f2)
    log_info "任务状态: $STATUS"
fi

# 6. 清理测试数据
log_info "6. 清理测试数据..."
if [ -n "$TASK_ID" ]; then
    DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/v1/tasks/$TASK_ID" \
      -H "Authorization: Bearer $AUTH_TOKEN")
    log_info "✓ 测试任务已删除"
fi

log_info "测试完成！"
