#!/bin/bash

# 交易管理API测试脚本
# 测试 /api/v1/transactions 端点

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
echo -e "${YELLOW}交易管理API测试${NC}"
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

# ==================== 开始测试 ====================

# 测试 1: 获取交易列表
echo -e "${YELLOW}测试 1: 获取交易列表${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/transactions" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '\[' || echo "$RESPONSE" | grep -q '"type"'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 200
fi

# 测试 2: 按类型筛选交易（收入）
echo -e "\n${YELLOW}测试 2: 按类型筛选交易（income）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/transactions?type=income" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"type":"income"' || echo "$RESPONSE" | grep -q '\['; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 200
fi

# 测试 3: 按类型筛选交易（支出）
echo -e "\n${YELLOW}测试 3: 按类型筛选交易（expense）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/transactions?type=expense" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '"type":"expense"' || echo "$RESPONSE" | grep -q '\['; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 200
fi

# 测试 4: 创建交易
echo -e "\n${YELLOW}测试 4: 创建交易${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
# 先获取账户ID和分类ID
ACCOUNTS=$(curl -s "$API_URL/accounts" -H "Authorization: Bearer $TOKEN")
CATEGORIES=$(curl -s "$API_URL/categories" -H "Authorization: Bearer $TOKEN")

ACCOUNT_ID=$(echo "$ACCOUNTS" | sed -n 's/.*"id":\([0-9]*\).*"name":"[^"]*".*/\1/p' | head -1)
CATEGORY_ID=$(echo "$CATEGORIES" | sed -n 's/.*"id":\([0-9]*\).*"type":"expense".*/\1/p' | head -1)

if [ -n "$ACCOUNT_ID" ] && [ -n "$CATEGORY_ID" ]; then
    CREATE_RESPONSE=$(curl -s -X POST "$API_URL/transactions" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"expense\",
            \"amount\": 99.99,
            \"fromAccountId\": $ACCOUNT_ID,
            \"categoryId\": $CATEGORY_ID,
            \"notes\": \"测试交易\",
            \"transactionDate\": \"$(date -u +"%Y-%m-%dT%H:%M:%S")\"
        }")

    if echo "$CREATE_RESPONSE" | grep -q '"id"' && echo "$CREATE_RESPONSE" | grep -q '"amount"'; then
        TRANSACTION_ID=$(echo "$CREATE_RESPONSE" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过（创建交易ID: $TRANSACTION_ID）${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "响应: $CREATE_RESPONSE"
    fi
else
    echo -e "${RED}✗ 测试失败（无法获取账户或分类ID）${NC}"
fi

# 测试 5: 获取单个交易详情
echo -e "\n${YELLOW}测试 5: 获取交易详情${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -n "$TRANSACTION_ID" ]; then
    RESPONSE=$(curl -s "$API_URL/transactions/$TRANSACTION_ID" \
        -H "Authorization: Bearer $TOKEN")
    if echo "$RESPONSE" | grep -q '"id":' && echo "$RESPONSE" | grep -q '"amount"'; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "响应: $RESPONSE"
    fi
else
    echo -e "${YELLOW}⊘ 跳过（无可用交易ID）${NC}"
fi

# 测试 6: 更新交易
echo -e "\n${YELLOW}测试 6: 更新交易${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -n "$TRANSACTION_ID" ] && [ -n "$ACCOUNT_ID" ] && [ -n "$CATEGORY_ID" ]; then
    UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/transactions/$TRANSACTION_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"expense\",
            \"amount\": 199.99,
            \"fromAccountId\": $ACCOUNT_ID,
            \"categoryId\": $CATEGORY_ID,
            \"notes\": \"更新后的测试交易\",
            \"transactionDate\": \"$(date -u +"%Y-%m-%dT%H:%M:%S")\"
        }")

    if echo "$UPDATE_RESPONSE" | grep -q '"amount":"199.99"' || echo "$UPDATE_RESPONSE" | grep -q '"amount":199.99'; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "响应: $UPDATE_RESPONSE"
    fi
else
    echo -e "${YELLOW}⊘ 跳过（无可用交易ID）${NC}"
fi

# 测试 7: 按金额范围筛选
echo -e "\n${YELLOW}测试 7: 按金额范围筛选（minAmount=100）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "$API_URL/transactions?minAmount=100" \
    -H "Authorization: Bearer $TOKEN")
if echo "$RESPONSE" | grep -q '\['; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $RESPONSE" | head -c 200
fi

# 测试 8: 未认证访问（应该失败）
echo -e "\n${YELLOW}测试 8: 未认证访问（预期失败）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/transactions")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ 测试失败 (HTTP $HTTP_CODE)${NC}"
fi

# 测试 9: 删除交易
echo -e "\n${YELLOW}测试 9: 删除交易${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -n "$TRANSACTION_ID" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/transactions/$TRANSACTION_ID" \
        -H "Authorization: Bearer $TOKEN")
    if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过 (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}✗ 测试失败 (HTTP $HTTP_CODE)${NC}"
    fi
else
    echo -e "${YELLOW}⊘ 跳过（无可用交易ID）${NC}"
fi

# 测试 10: 验证X-Total-Count头
echo -e "\n${YELLOW}测试 10: 验证X-Total-Count响应头${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
TOTAL_COUNT=$(curl -s -I "$API_URL/transactions" \
    -H "Authorization: Bearer $TOKEN" | grep -i "x-total-count" | cut -d' ' -f2 | tr -d '\r')
if [ -n "$TOTAL_COUNT" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过 (总数: $TOTAL_COUNT)${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
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
