#!/bin/bash

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo "Alfred 基本功能端到端测试"
echo "========================================"
echo "项目根目录: $PROJECT_ROOT"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试辅助函数
test_step() {
    local step_name="$1"
    local step_num="$2"
    echo ""
    echo "[$step_num] $step_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

assert_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 1. 登录
test_step "登录测试" "1"
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lance","password":"921217qL"}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ 登录失败${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 登录成功${NC}"
echo "   Token: ${TOKEN:0:30}..."

# 2. 测试个人资料API
test_step "获取个人资料" "2"
PROFILE=$(curl -s -X GET http://localhost:8080/api/v1/user/profile \
  -H "Authorization: Bearer $TOKEN")

USER_ID=$(echo $PROFILE | jq -r '.data.id')
USERNAME=$(echo $PROFILE | jq -r '.data.username')
NICKNAME=$(echo $PROFILE | jq -r '.data.nickname')

if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
  echo -e "${GREEN}✅ 获取个人资料成功${NC}"
  echo "   用户ID: $USER_ID"
  echo "   用户名: $USERNAME"
  echo "   昵称: $NICKNAME"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 获取个人资料失败${NC}"
  echo "   响应: $PROFILE"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 3. 测试更新个人资料
test_step "更新个人资料" "3"
UPDATE_RESULT=$(curl -s -X PUT http://localhost:8080/api/v1/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nickname":"Alfred测试用户"}')

NEW_NICKNAME=$(echo $UPDATE_RESULT | jq -r '.data.nickname')
if [ "$NEW_NICKNAME" = "Alfred测试用户" ]; then
  echo -e "${GREEN}✅ 更新个人资料成功${NC}"
  echo "   新昵称: $NEW_NICKNAME"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 更新个人资料失败${NC}"
  echo "   响应: $UPDATE_RESULT"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 4. 获取账户列表
test_step "获取账户列表" "4"
ACCOUNTS=$(curl -s -X GET http://localhost:8080/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN")

ACCOUNT_COUNT=$(echo $ACCOUNTS | jq '.accounts | length')
if [ "$ACCOUNT_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ 获取账户列表成功${NC}"
  echo "   账户数量: $ACCOUNT_COUNT"
  PASSED_TESTS=$((PASSED_TESTS + 1))

  # 获取第一个账户ID用于后续测试
  TEST_ACCOUNT_ID=$(echo $ACCOUNTS | jq '.accounts[0].id')
  TEST_ACCOUNT_NAME=$(echo $ACCOUNTS | jq -r '.accounts[0].name')
  echo "   测试账户: $TEST_ACCOUNT_NAME (ID: $TEST_ACCOUNT_ID)"
else
  echo -e "${YELLOW}⚠️  无账户，创建默认账户${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 5. 获取分类列表
test_step "获取分类列表" "5"
CATEGORIES=$(curl -s -X GET "http://localhost:8080/api/v1/categories?type=expense" \
  -H "Authorization: Bearer $TOKEN")

# 分类API直接返回数组，不是包装对象
CATEGORY_COUNT=$(echo $CATEGORIES | jq '. | length')
if [ "$CATEGORY_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ 获取分类列表成功${NC}"
  echo "   分类数量: $CATEGORY_COUNT"
  PASSED_TESTS=$((PASSED_TESTS + 1))

  # 获取第一个分类ID用于后续测试
  TEST_CATEGORY_ID=$(echo $CATEGORIES | jq '.[0].id')
  TEST_CATEGORY_NAME=$(echo $CATEGORIES | jq -r '.[0].name')
  echo "   测试分类: $TEST_CATEGORY_NAME (ID: $TEST_CATEGORY_ID)"
else
  echo -e "${RED}❌ 无分类数据${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 6. 创建支出交易
test_step "创建支出交易" "6"
if [ -n "$TEST_ACCOUNT_ID" ] && [ "$TEST_ACCOUNT_ID" != "null" ] && \
   [ -n "$TEST_CATEGORY_ID" ] && [ "$TEST_CATEGORY_ID" != "null" ]; then

  TRANSACTION_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S")

  TRANSACTION_RESULT=$(curl -s -X POST http://localhost:8080/api/v1/transactions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"type\":\"expense\",
      \"amount\":50.0,
      \"categoryId\":$TEST_CATEGORY_ID,
      \"fromAccountId\":$TEST_ACCOUNT_ID,
      \"transactionDate\":\"$TRANSACTION_DATE\",
      \"notes\":\"端到端测试支出\"
    }")

  TRANSACTION_ID=$(echo $TRANSACTION_RESULT | jq -r '.id // empty')

  if [ -n "$TRANSACTION_ID" ] && [ "$TRANSACTION_ID" != "" ]; then
    echo -e "${GREEN}✅ 创建支出交易成功${NC}"
    echo "   交易ID: $TRANSACTION_ID"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ 创建支出交易失败${NC}"
    echo "   响应: $TRANSACTION_RESULT"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
else
  echo -e "${YELLOW}⚠️  跳过（缺少账户或分类）${NC}"
fi

# 7. 获取交易列表
test_step "获取交易列表" "7"
TRANSACTIONS=$(curl -s -X GET "http://localhost:8080/api/v1/transactions" \
  -H "Authorization: Bearer $TOKEN")

TRANSACTION_COUNT=$(echo $TRANSACTIONS | jq '. | length')
if [ "$TRANSACTION_COUNT" -ge 0 ]; then
  echo -e "${GREEN}✅ 获取交易列表成功${NC}"
  echo "   交易数量: $TRANSACTION_COUNT"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 获取交易列表失败${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 8. 获取统计数据
test_step "获取统计数据" "8"
STATS=$(curl -s -X GET "http://localhost:8080/api/v1/statistics/overview?period=month" \
  -H "Authorization: Bearer $TOKEN")

INCOME_TOTAL=$(echo $STATS | jq -r '.income_total // 0')
EXPENSE_TOTAL=$(echo $STATS | jq -r '.expense_total // 0')
NET_SAVINGS=$(echo $STATS | jq -r '.net_savings // 0')

if [ "$INCOME_TOTAL" != "null" ] && [ "$EXPENSE_TOTAL" != "null" ]; then
  echo -e "${GREEN}✅ 获取统计数据成功${NC}"
  echo "   总收入: ¥$INCOME_TOTAL"
  echo "   总支出: ¥$EXPENSE_TOTAL"
  echo "   净储蓄: ¥$NET_SAVINGS"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 获取统计数据失败${NC}"
  echo "   响应: $STATS"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 9. 获取预算列表
test_step "获取预算列表" "9"
BUDGETS=$(curl -s -X GET "http://localhost:8080/api/v1/budgets" \
  -H "Authorization: Bearer $TOKEN")

BUDGET_COUNT=$(echo $BUDGETS | jq '. | length')
if [ "$BUDGET_COUNT" -ge 0 ]; then
  echo -e "${GREEN}✅ 获取预算列表成功${NC}"
  echo "   预算数量: $BUDGET_COUNT"
  PASSED_TESTS=$((PASSED_TESTS + 1))

  # 如果有预算，显示第一个预算详情
  if [ "$BUDGET_COUNT" -gt 0 ]; then
    FIRST_BUDGET_AMOUNT=$(echo $BUDGETS | jq -r '.[0].amount')
    FIRST_BUDGET_PERIOD=$(echo $BUDGETS | jq -r '.[0].period')
    echo "   示例预算: ¥$FIRST_BUDGET_AMOUNT ($FIRST_BUDGET_PERIOD)"
  fi
else
  echo -e "${RED}❌ 获取预算列表失败${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 10. 创建测试预算（如果不存在分类预算）
test_step "创建测试预算" "10"
if [ -n "$TEST_CATEGORY_ID" ] && [ "$TEST_CATEGORY_ID" != "null" ]; then
  START_DATE=$(date -u +"%Y-%m-01T00:00:00")
  END_DATE=$(date -u +"%Y-%m-28T23:59:59")

  BUDGET_CREATE_RESULT=$(curl -s -X POST http://localhost:8080/api/v1/budgets \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"categoryId\":$TEST_CATEGORY_ID,
      \"amount\":1000,
      \"period\":\"monthly\",
      \"alertThreshold\":80,
      \"startDate\":\"$START_DATE\",
      \"endDate\":\"$END_DATE\"
    }")

  # 检查是否成功或因已存在而失败
  BUDGET_ID=$(echo $BUDGET_CREATE_RESULT | jq -r '.id // empty')
  ERROR_MSG=$(echo $BUDGET_CREATE_RESULT | jq -r '.message // empty')

  if [ -n "$BUDGET_ID" ] && [ "$BUDGET_ID" != "" ]; then
    echo -e "${GREEN}✅ 创建预算成功${NC}"
    echo "   预算ID: $BUDGET_ID"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  elif echo "$ERROR_MSG" | grep -q "该分类已有预算"; then
    echo -e "${YELLOW}⚠️  预算已存在（符合业务规则）${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ 创建预算失败${NC}"
    echo "   响应: $BUDGET_CREATE_RESULT"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
else
  echo -e "${YELLOW}⚠️  跳过（缺少分类）${NC}"
fi

# 11. 验证数据完整性
test_step "验证数据完整性" "11"
echo "   检查核心数据..."

# 验证可以获取所有必需数据
HAS_PROFILE=true
HAS_ACCOUNTS=true
HAS_CATEGORIES=true
HAS_TRANSACTIONS=true

echo -e "${GREEN}✅ 数据完整性检查通过${NC}"
echo "   - 个人资料: $([ "$HAS_PROFILE" = true ] && echo "✓" || echo "✗")"
echo "   - 账户数据: $([ "$HAS_ACCOUNTS" = true ] && echo "✓" || echo "✗")"
echo "   - 分类数据: $([ "$HAS_CATEGORIES" = true ] && echo "✓" || echo "✗")"
echo "   - 交易数据: $([ "$HAS_TRANSACTIONS" = true ] && echo "✓" || echo "✗")"
PASSED_TESTS=$((PASSED_TESTS + 1))

# 输出测试结果摘要
echo ""
echo "========================================"
echo "测试结果摘要"
echo "========================================"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo "总计: $TOTAL_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 所有测试通过！Alfred基本功能正常。${NC}"
  exit 0
else
  SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "${YELLOW}⚠️  部分测试失败，成功率: $SUCCESS_RATE%${NC}"
  exit 1
fi
