#!/bin/bash

# 预算管理API测试脚本
# 测试 /api/v1/budgets 端点

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
echo -e "${YELLOW}预算管理API测试${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 1. 登录获取Token
echo -e "${YELLOW}步骤 1: 登录系统${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}登录失败，无法获取Token${NC}"
    exit 1
fi

echo -e "${GREEN}登录成功${NC}"
echo ""

# 清理所有预算（测试前清理）
echo -e "${YELLOW}清理测试数据...${NC}"
ALL_BUDGETS=$(curl -s "$API_URL/budgets" -H "Authorization: Bearer $TOKEN")
BUDGET_IDS=$(echo "$ALL_BUDGETS" | grep -o '"id":[0-9]*' | cut -d':' -f2)
for bid in $BUDGET_IDS; do
    curl -s -X DELETE "$API_URL/budgets/$bid" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
done
echo -e "${GREEN}清理完成${NC}"
echo ""

# ==================== 开始测试 ====================

# 测试 1: 获取预算列表
echo -e "${YELLOW}测试 1: 获取预算列表${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/budgets" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '\['; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 200
fi

# 测试 2: 按周期筛选预算（月度）
echo -e "\n${YELLOW}测试 2: 按周期筛选预算（monthly）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/budgets?period=monthly" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '\['; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 200
fi

# 测试 3: 创建月度预算
echo -e "\n${YELLOW}测试 3: 创建月度预算${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
CATEGORIES=$(curl -s "$API_URL/categories" -H "Authorization: Bearer $TOKEN")
CATEGORY_ID=$(echo "$CATEGORIES" | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)

if [ -n "$CATEGORY_ID" ]; then
    START_DATE="$(date -u +"%Y-%m-01")T00:00:00"
    END_DATE="$(date -u +"%Y-%m-28")T23:59:59"
    
    CREATE_RESPONSE=$(curl -s -X POST "$API_URL/budgets" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"categoryId\": $CATEGORY_ID,
            \"amount\": 5000.00,
            \"period\": \"monthly\",
            \"alertThreshold\": 80.0,
            \"startDate\": \"$START_DATE\",
            \"endDate\": \"$END_DATE\"
        }")

    if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
        BUDGET_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过（创建预算ID: $BUDGET_ID）${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "响应: $CREATE_RESPONSE"
    fi
else
    echo -e "${RED}✗ 测试失败（无法获取分类ID）${NC}"
fi

# 测试 4: 获取单个预算详情
echo -e "\n${YELLOW}测试 4: 获取预算详情${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -n "$BUDGET_ID" ]; then
    RESPONSE=$(curl -s "$API_URL/budgets/$BUDGET_ID" \
        -H "Authorization: Bearer $TOKEN")
    if echo "$RESPONSE" | grep -q '"id"'; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "响应: $RESPONSE"
    fi
else
    echo -e "${YELLOW}⊘ 跳过（无可用预算ID）${NC}"
fi

# 测试 5: 更新预算
echo -e "\n${YELLOW}测试 5: 更新预算${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -n "$BUDGET_ID" ] && [ -n "$CATEGORY_ID" ]; then
    UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/budgets/$BUDGET_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"categoryId\": $CATEGORY_ID,
            \"amount\": 6000.00,
            \"period\": \"monthly\",
            \"alertThreshold\": 85.0,
            \"startDate\": \"$START_DATE\",
            \"endDate\": \"$END_DATE\"
        }")

    if echo "$UPDATE_RESPONSE" | grep -q '"id"' && echo "$UPDATE_RESPONSE" | grep -q '6000'; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "响应: $UPDATE_RESPONSE"
    fi
else
    echo -e "${YELLOW}⊘ 跳过（无可用预算ID）${NC}"
fi

# 测试 6: 按分类筛选预算
echo -e "\n${YELLOW}测试 6: 按分类筛选预算${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -n "$CATEGORY_ID" ]; then
    RESPONSE=$(curl -s "$API_URL/budgets?categoryId=$CATEGORY_ID" \
        -H "Authorization: Bearer $TOKEN")
    if echo "$RESPONSE" | grep -q '\['; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "响应: $RESPONSE" | head -c 200
    fi
else
    echo -e "${YELLOW}⊘ 跳过（无可用分类ID）${NC}"
fi

# 测试 7: 未认证访问（应该失败）
echo -e "\n${YELLOW}测试 7: 未认证访问（预期失败）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/budgets")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ 测试失败 (HTTP $HTTP_CODE)${NC}"
fi

# 测试 8: 删除预算
echo -e "\n${YELLOW}测试 8: 删除预算${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -n "$BUDGET_ID" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/budgets/$BUDGET_ID" \
        -H "Authorization: Bearer $TOKEN")
    if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过 (HTTP $HTTP_CODE)${NC}"
        BUDGET_ID=""  # 标记为已删除
    else
        echo -e "${RED}✗ 测试失败 (HTTP $HTTP_CODE)${NC}"
    fi
else
    echo -e "${YELLOW}⊘ 跳过（无可用预算ID）${NC}"
fi

# 测试 9: 验证X-Total-Count头
echo -e "\n${YELLOW}测试 9: 验证X-Total-Count响应头${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
TOTAL_COUNT=$(curl -s -I "$API_URL/budgets" \
    -H "Authorization: Bearer $TOKEN" | grep -i "x-total-count" | cut -d' ' -f2 | tr -d '\r')
if [ -n "$TOTAL_COUNT" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过 (总数: $TOTAL_COUNT)${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
fi

# 测试 10: 创建年度预算
echo -e "\n${YELLOW}测试 10: 创建年度预算${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
CATEGORY_ID2=$(echo "$CATEGORIES" | grep -o '"id":[0-9]*' | cut -d':' -f2 | tail -1 | head -1)

if [ -n "$CATEGORY_ID2" ]; then
    START_DATE="$(date -u +"%Y-01-01")T00:00:00"
    END_DATE="$(date -u +"%Y-12-31")T23:59:59"
    
    CREATE_RESPONSE=$(curl -s -X POST "$API_URL/budgets" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"categoryId\": $CATEGORY_ID2,
            \"amount\": 50000.00,
            \"period\": \"yearly\",
            \"alertThreshold\": 90.0,
            \"startDate\": \"$START_DATE\",
            \"endDate\": \"$END_DATE\"
        }")

    if echo "$CREATE_RESPONSE" | grep -q '"id"' && echo "$CREATE_RESPONSE" | grep -q '"period":"yearly"'; then
        YEARLY_BUDGET_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过（年度预算ID: $YEARLY_BUDGET_ID）${NC}"
        # 清理测试数据
        curl -s -X DELETE "$API_URL/budgets/$YEARLY_BUDGET_ID" \
            -H "Authorization: Bearer $TOKEN" > /dev/null
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "响应: $CREATE_RESPONSE"
    fi
else
    echo -e "${YELLOW}⊘ 跳过（无可用分类ID）${NC}"
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
