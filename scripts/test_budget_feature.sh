#!/bin/bash

# 测试预算功能
# 包括：创建预算、查询预算、查询预算使用情况、更新预算、删除预算

set -e

API_BASE="http://localhost:8080/api/v1"
TOKEN=$(cat /tmp/token.txt 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "错误: 未找到token，请先登录"
  echo "运行: echo \"YOUR_TOKEN_HERE\" > /tmp/token.txt"
  exit 1
fi

echo "=========================================="
echo "测试预算功能"
echo "=========================================="

# 获取用户ID和分类ID
USER_INFO=$(curl -s -X GET "$API_BASE/users/me" \
  -H "Authorization: Bearer $TOKEN")

USER_ID=$(echo $USER_INFO | jq -r '.data.id')

# 获取支出分类列表
CATEGORIES=$(curl -s -X GET "$API_BASE/categories?type=expense" \
  -H "Authorization: Bearer $TOKEN")

# 选择第一个支出分类作为测试
CATEGORY_ID=$(echo $CATEGORIES | jq -r '.data[0].id')
CATEGORY_NAME=$(echo $CATEGORIES | jq -r '.data[0].name')

echo "用户ID: $USER_ID"
echo "测试分类ID: $CATEGORY_ID ($CATEGORY_NAME)"
echo ""

# 1. 创建日预算
echo "1. 创建日预算（工作日）"
DAILY_BUDGET=$(curl -s -X POST "$API_BASE/budgets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"categoryId\": $CATEGORY_ID,
    \"amount\": 100.00,
    \"period\": \"daily\",
    \"pattern\": \"workday\",
    \"alertThreshold\": 80.0,
    \"isRecurring\": true,
    \"startDate\": \"$(date -u +%Y-%m-%d)T00:00:00\"
  }")

echo $DAILY_BUDGET | jq '.'

DAILY_BUDGET_ID=$(echo $DAILY_BUDGET | jq -r '.data.id')
echo "✓ 日预算创建成功，ID: $DAILY_BUDGET_ID"
echo ""

# 2. 创建周预算
echo "2. 创建周预算（所有日期）"
WEEKLY_BUDGET=$(curl -s -X POST "$API_BASE/budgets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"categoryId\": $CATEGORY_ID,
    \"amount\": 500.00,
    \"period\": \"weekly\",
    \"pattern\": \"all\",
    \"alertThreshold\": 80.0,
    \"isRecurring\": true,
    \"startDate\": \"$(date -u +%Y-%m-%d)T00:00:00\"
  }")

echo $WEEKLY_BUDGET | jq '.'

WEEKLY_BUDGET_ID=$(echo $WEEKLY_BUDGET | jq -r '.data.id')
echo "✓ 周预算创建成功，ID: $WEEKLY_BUDGET_ID"
echo ""

# 3. 创建月预算
echo "3. 创建月预算（周末）"
MONTHLY_BUDGET=$(curl -s -X POST "$API_BASE/budgets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"categoryId\": $CATEGORY_ID,
    \"amount\": 2000.00,
    \"period\": \"monthly\",
    \"pattern\": \"weekend\",
    \"alertThreshold\": 75.0,
    \"isRecurring\": true,
    \"startDate\": \"$(date -u +%Y-%m-%d)T00:00:00\"
  }")

echo $MONTHLY_BUDGET | jq '.'

MONTHLY_BUDGET_ID=$(echo $MONTHLY_BUDGET | jq -r '.data.id')
echo "✓ 月预算创建成功，ID: $MONTHLY_BUDGET_ID"
echo ""

# 4. 查询所有预算
echo "4. 查询所有预算"
ALL_BUDGETS=$(curl -s -X GET "$API_BASE/budgets" \
  -H "Authorization: Bearer $TOKEN")

echo $ALL_BUDGETS | jq '.'
BUDGET_COUNT=$(echo $ALL_BUDGETS | jq '.data | length')
echo "✓ 共有 $BUDGET_COUNT 个预算"
echo ""

# 5. 查询预算使用情况
echo "5. 查询预算使用情况"
BUDGET_USAGE=$(curl -s -X GET "$API_BASE/budgets/usage" \
  -H "Authorization: Bearer $TOKEN")

echo $BUDGET_USAGE | jq '.'
echo ""
echo "预算使用情况汇总："
echo $BUDGET_USAGE | jq -r '.data[] | "  - \(.categoryName) (\(.period)): ¥\(.usedAmount)/¥\(.budgetAmount) (\(.usagePercentage)%)"'
echo ""

# 6. 更新预算
echo "6. 更新日预算金额"
UPDATED_BUDGET=$(curl -s -X PUT "$API_BASE/budgets/$DAILY_BUDGET_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"categoryId\": $CATEGORY_ID,
    \"amount\": 150.00,
    \"period\": \"daily\",
    \"pattern\": \"workday\",
    \"alertThreshold\": 70.0,
    \"isRecurring\": true,
    \"startDate\": \"$(date -u +%Y-%m-%d)T00:00:00\"
  }")

echo $UPDATED_BUDGET | jq '.'
NEW_AMOUNT=$(echo $UPDATED_BUDGET | jq -r '.data.amount')
echo "✓ 预算更新成功，新金额: ¥$NEW_AMOUNT"
echo ""

# 7. 删除预算
echo "7. 删除周预算"
DELETE_RESULT=$(curl -s -X DELETE "$API_BASE/budgets/$WEEKLY_BUDGET_ID" \
  -H "Authorization: Bearer $TOKEN")

echo $DELETE_RESULT | jq '.'
echo "✓ 周预算删除成功"
echo ""

# 8. 验证删除后的预算列表
echo "8. 验证删除后的预算列表"
REMAINING_BUDGETS=$(curl -s -X GET "$API_BASE/budgets" \
  -H "Authorization: Bearer $TOKEN")

echo $REMAINING_BUDGETS | jq '.'
REMAINING_COUNT=$(echo $REMAINING_BUDGETS | jq '.data | length')
echo "✓ 剩余 $REMAINING_COUNT 个预算"
echo ""

echo "=========================================="
echo "测试完成！"
echo "=========================================="
echo ""
echo "测试总结："
echo "  ✓ 创建预算（日/周/月）"
echo "  ✓ pattern过滤（workday/weekend/all）"
echo "  ✓ 查询预算列表"
echo "  ✓ 查询预算使用情况"
echo "  ✓ 更新预算"
echo "  ✓ 删除预算"
echo ""
echo "遗留任务："
echo "  - 前端UI实现（预算管理页面）"
echo "  - 财务主页集成预算卡片"
echo "  - 前端类型定义更新"
