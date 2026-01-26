#!/bin/bash

# 统计分析API测试脚本
# 测试 /api/v1/statistics 端点

API_URL="http://localhost:8080/api/v1"
USERNAME="test003"
PASSWORD="test003"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}统计分析API测试${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 1. 登录获取Token
echo -e "${YELLOW}步骤 1: 登录系统${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d':' -f2 | tr -d '"')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}登录失败，无法获取Token${NC}"
    exit 1
fi

echo -e "${GREEN}登录成功${NC}"
echo ""

# ==================== 开始测试 ====================

# 测试 1: 获取概览统计（无参数）
echo -e "${YELLOW}测试 1: 获取概览统计（无参数）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/statistics/overview" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"income_total"' && echo "$RESPONSE" | grep -q '"expense_total"'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
    echo "收入: $(echo "$RESPONSE" | grep -o '"income_total":[0-9.]*' | cut -d':' -f2)"
    echo "支出: $(echo "$RESPONSE" | grep -o '"expense_total":[0-9.]*' | cut -d':' -f2)"
    echo "净储蓄: $(echo "$RESPONSE" | grep -o '"net_savings":[-0-9.]*' | cut -d':' -f2)"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 500
fi

# 测试 2: 获取月度统计
echo -e "\n${YELLOW}测试 2: 获取月度统计（period=monthly）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/statistics/overview?period=monthly" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"income_total"' && echo "$RESPONSE" | grep -q '"expense_total"'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 500
fi

# 测试 3: 获取年度统计
echo -e "\n${YELLOW}测试 3: 获取年度统计（period=yearly）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/statistics/overview?period=yearly" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"income_total"' && echo "$RESPONSE" | grep -q '"expense_total"'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 500
fi

# 测试 4: 检查分类支出数据结构
echo -e "\n${YELLOW}测试 4: 检查分类支出数据结构${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/statistics/overview" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"category_breakdown"'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
    # 尝试提取分类数据
    CATEGORY_COUNT=$(echo "$RESPONSE" | grep -o '"category_id"' | wc -l | tr -d ' ')
    echo "分类数量: $CATEGORY_COUNT"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 500
fi

# 测试 5: 未认证访问（应该失败）
echo -e "\n${YELLOW}测试 5: 未认证访问（预期失败）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/statistics/overview")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ 测试失败 (HTTP $HTTP_CODE)${NC}"
fi

# 测试 6: 验证数据类型
echo -e "\n${YELLOW}测试 6: 验证数据类型${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/statistics/overview" \
    -H "Authorization: Bearer $TOKEN")
# 检查是否为数字类型
INCOME=$(echo "$RESPONSE" | grep -o '"income_total":[0-9.]*' | cut -d':' -f2)
if [ -n "$INCOME" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过（income_total为数字类型）${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
fi

# 测试 7: 验证响应时间
echo -e "\n${YELLOW}测试 7: 验证响应时间${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
START_TIME=$(date +%s%N)
curl -s "$API_URL/statistics/overview" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))
if [ $RESPONSE_TIME -lt 5000 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过（响应时间: ${RESPONSE_TIME}ms）${NC}"
else
    echo -e "${RED}✗ 测试失败（响应时间过长: ${RESPONSE_TIME}ms）${NC}"
fi

# ==================== 测试总结 ====================

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}测试总结${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}所有测试通过！${NC}"
    exit 0
else
    echo -e "\n${RED}部分测试失败${NC}"
    exit 1
fi
