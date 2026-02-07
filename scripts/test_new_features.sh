#!/bin/bash

# 测试新功能：预算使用统计和最近活动

echo "==================================="
echo "测试新功能：预算使用统计 + 最近活动"
echo "==================================="

# 1. 登录获取 token
echo ""
echo "1. 登录测试账号..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test003","password":"test003"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ 登录成功"
echo "Token: ${TOKEN:0:20}..."

# 2. 测试预算使用统计
echo ""
echo "2. 测试预算使用统计 API..."
echo "GET /api/v1/budgets/usage"
echo ""

BUDGET_USAGE=$(curl -s -X GET http://localhost:8080/api/v1/budgets/usage \
  -H "Authorization: Bearer $TOKEN")

echo "响应："
echo "$BUDGET_USAGE" | python3 -m json.tool 2>/dev/null || echo "$BUDGET_USAGE"

# 检查响应
if echo "$BUDGET_USAGE" | grep -q "budgetId"; then
  echo ""
  echo "✅ 预算使用统计 API 正常"
else
  echo ""
  echo "⚠️ 预算使用统计 API 可能无数据或异常"
fi

# 3. 测试最近活动
echo ""
echo "==================================="
echo "3. 测试最近活动 API..."
echo "GET /api/v1/dashboard/recent-activities?limit=10"
echo ""

RECENT_ACTIVITIES=$(curl -s -X GET "http://localhost:8080/api/v1/dashboard/recent-activities?limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "响应："
echo "$RECENT_ACTIVITIES" | python3 -m json.tool 2>/dev/null || echo "$RECENT_ACTIVITIES"

# 检查响应
if echo "$RECENT_ACTIVITIES" | grep -q "id"; then
  echo ""
  echo "✅ 最近活动 API 正常"

  # 统计各类型活动数量
  TRANSACTION_COUNT=$(echo "$RECENT_ACTIVITIES" | grep -o '"type":"transaction"' | wc -l | tr -d ' ')
  CYCLING_COUNT=$(echo "$RECENT_ACTIVITIES" | grep -o '"type":"cycling"' | wc -l | tr -d ' ')
  HEALTH_COUNT=$(echo "$RECENT_ACTIVITIES" | grep -o '"type":"health"' | wc -l | tr -d ' ')

  echo ""
  echo "活动统计："
  echo "  - 交易记录: $TRANSACTION_COUNT 条"
  echo "  - 骑行活动: $CYCLING_COUNT 条"
  echo "  - 健康记录: $HEALTH_COUNT 条"
else
  echo ""
  echo "⚠️ 最近活动 API 可能无数据或异常"
fi

echo ""
echo "==================================="
echo "测试完成"
echo "==================================="
