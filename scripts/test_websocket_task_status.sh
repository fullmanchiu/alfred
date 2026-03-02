#!/bin/bash

# WebSocket 状态推送测试脚本
# 测试任务状态通过 WebSocket 实时推送到前端

BASE_URL="http://localhost:8080/api/v1"
TOKEN=""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== WebSocket 状态推送测试 ===${NC}\n"

# 1. 登录获取 token
echo -e "${YELLOW}1. 登录系统...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test003","password":"test003"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}登录失败${NC}"
  exit 1
fi

echo -e "${GREEN}登录成功${NC}\n"

# 2. 创建测试任务
echo -e "${YELLOW}2. 创建测试任务...${NC}"
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ws_test_hello",
    "taskType": "hello",
    "scheduleType": "cron",
    "cronExpr": "0 * * * * *",
    "enabled": true,
    "params": {"name": "WebSocket测试"}
  }')

TASK_ID=$(echo $TASK_RESPONSE | jq -r '.data.id')
echo -e "${GREEN}任务创建成功，ID: $TASK_ID${NC}\n"

# 3. 立即执行任务
echo -e "${YELLOW}3. 立即执行任务...${NC}"
curl -s -X POST "$BASE_URL/tasks/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "ws_test_hello",
    "taskType": "hello",
    "params": {"name": "WebSocket实时推送测试"}
  }'

echo -e "\n${GREEN}任务已提交执行${NC}\n"

# 4. 等待 3 秒让任务执行完成
echo -e "${YELLOW}4. 等待任务执行...${NC}"
sleep 3

# 5. 获取执行历史
echo -e "${YELLOW}5. 获取执行历史...${NC}"
EXECUTIONS=$(curl -s -X GET "$BASE_URL/tasks/ws_test_hello/executions?limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo $EXECUTIONS | jq '.data.executions[] | {id, taskName, status, result, error, createdAt}'

# 6. 清理测试任务
echo -e "\n${YELLOW}6. 清理测试任务...${NC}"
curl -s -X DELETE "$BASE_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n${GREEN}测试完成${NC}"
echo -e "${YELLOW}注意：请检查前端页面是否收到实时状态更新通知${NC}"
