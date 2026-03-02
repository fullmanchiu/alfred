#!/bin/bash
# 测试单股票K线同步任务
BASE_URL="http://localhost:8080"

echo "=== 测试单股票K线同步任务 ==="

# 1. 登录获取token
echo -e "\n1. 登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test003","password":"test003"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo "Token: ${TOKEN:0:20}..."

# 2. 创建单股票K线同步任务
echo -e "\n2. 创建单股票K线同步任务..."
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/tasks/schedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试平安银行K线同步",
    "taskType": "sync_klines",
    "scheduleType": "cron",
    "cronExpr": "0 9 * * *",
    "autoRun": false,
    "params": "{\"stock_code\":\"000001\",\"days\":30}"
  }')

echo $TASK_RESPONSE | jq '.'
TASK_ID=$(echo $TASK_RESPONSE | jq -r '.data.task.id')
echo "任务ID: $TASK_ID"

# 3. 获取任务列表
echo -e "\n3. 获取任务列表..."
curl -s -X GET "$BASE_URL/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.tasks[] | select(.taskType == "sync_klines")'

# 4. 手动执行任务
echo -e "\n4. 手动执行任务..."
EXECUTE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/tasks/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"taskName\": \"测试平安银行K线同步\",
    \"taskType\": \"sync_klines\",
    \"params\": \"{\\\"stock_code\\\":\\\"000001\\\",\\\"days\\\":30}\"
  }")

echo $EXECUTE_RESPONSE | jq '.'

# 5. 等待几秒后查看执行记录
echo -e "\n5. 等待5秒后查看执行记录..."
sleep 5

curl -s -X GET "$BASE_URL/api/v1/tasks/executions?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.executions[] | {taskName, status, result}'

# 6. 检查K线数据是否保存成功
echo -e "\n6. 检查股票000001的K线数据..."
curl -s -X GET "$BASE_URL/api/v1/stocks/000001/klines?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== 测试完成 ==="
