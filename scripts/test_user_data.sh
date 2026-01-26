#!/bin/bash

# 用户数据管理API测试脚本
# 测试 /api/v1/user-data 端点

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
echo -e "${YELLOW}用户数据管理API测试${NC}"
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

# 测试 1: 获取当前分类列表
echo -e "${YELLOW}测试 1: 获取当前分类列表${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
CATEGORIES=$(curl -s "$API_URL/categories" \
    -H "Authorization: Bearer $TOKEN")
CATEGORY_COUNT=$(echo "$CATEGORIES" | grep -o '"id":[0-9]*' | wc -l | tr -d ' ')
if [ "$CATEGORY_COUNT" -gt 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过（当前分类数: $CATEGORY_COUNT）${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
fi

# 测试 2: 恢复系统分类
echo -e "\n${YELLOW}测试 2: 恢复被软删除的系统分类${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X POST "$API_URL/user-data/restore-system-categories" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"success":true'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    RESTORED=$(echo "$RESPONSE" | grep -o '"restored":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ 测试通过（恢复分类数: $RESTORED）${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 500
fi

# 测试 3: 同步系统分类（版本控制）
echo -e "\n${YELLOW}测试 3: 同步系统分类（版本控制）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X POST "$API_URL/categories/sync-system" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"success":true' || echo "$RESPONSE" | grep -q '"message"'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 500
fi

# 测试 4: 强制同步系统分类
echo -e "\n${YELLOW}测试 4: 强制同步系统分类（忽略版本号）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X POST "$API_URL/user-data/force-sync-categories" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"success":true'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    SYNCED=$(echo "$RESPONSE" | grep -o '"synced":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ 测试通过（同步分类数: $SYNCED）${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 500
fi

# 测试 5: 未认证访问（应该失败）
echo -e "\n${YELLOW}测试 5: 未认证访问（预期失败）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/user-data/restore-system-categories")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ 测试失败 (HTTP $HTTP_CODE)${NC}"
fi

# 测试 6: 重置分类（删除并重新初始化）
echo -e "\n${YELLOW}测试 6: 重置分类（删除并重新初始化）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X POST "$API_URL/user-data/reset-categories" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"success":true'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TOTAL=$(echo "$RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ 测试通过（初始化分类数: $TOTAL）${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 500
fi

# 测试 7: 验证重置后分类数量
echo -e "\n${YELLOW}测试 7: 验证重置后分类数量${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
CATEGORIES_AFTER=$(curl -s "$API_URL/categories" \
    -H "Authorization: Bearer $TOKEN")
CATEGORY_COUNT_AFTER=$(echo "$CATEGORIES_AFTER" | grep -o '"id":[0-9]*' | wc -l | tr -d ' ')
if [ "$CATEGORY_COUNT_AFTER" -gt 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过（当前分类数: $CATEGORY_COUNT_AFTER）${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
fi

# 测试 8: 验证响应时间
echo -e "\n${YELLOW}测试 8: 验证响应时间${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
START_TIME=$(date +%s%N)
curl -s -X POST "$API_URL/user-data/force-sync-categories" \
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
