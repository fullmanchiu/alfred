#!/bin/bash

# 账户历史API测试脚本

BASE_URL="http://localhost:8080/api/v1"

echo "=== 账户历史API测试 ==="
echo ""

# 步骤1: 登录获取token
echo "1. 登录获取token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test003","password":"test003"}')

echo "登录响应: $LOGIN_RESPONSE"

# 提取token（兼容两种响应格式）
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ 登录失败：无法获取token"
    echo ""
    echo "尝试使用测试账号 lance..."
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"username":"lance","password":"lance123"}')
    echo "登录响应: $LOGIN_RESPONSE"
    TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // .token // empty')

    if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
        echo "❌ 所有登录尝试失败"
        exit 1
    fi
fi

echo "✅ 登录成功，token: ${TOKEN:0:20}..."
echo ""

# 步骤2: 获取账户列表
echo "2. 获取账户列表..."
ACCOUNTS_RESPONSE=$(curl -s -X GET "$BASE_URL/accounts" \
  -H "Authorization: Bearer $TOKEN")

echo "账户列表响应: $ACCOUNTS_RESPONSE" | head -c 500
echo ""

# 提取第一个账户ID（兼容两种响应格式）
ACCOUNT_ID=$(echo $ACCOUNTS_RESPONSE | jq -r '.data[0].id // .accounts[0].id // empty')

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" = "null" ]; then
    echo "❌ 未找到账户"
    exit 1
fi

echo "✅ 找到账户ID: $ACCOUNT_ID"
echo ""

# 步骤3: 测试账户历史API（修复后的方法）
echo "3. 测试账户历史API (GET /api/v1/accounts/$ACCOUNT_ID/history)..."
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/accounts/$ACCOUNT_ID/history?page=0&size=10" \
  -H "Authorization: Bearer $TOKEN")

echo "历史记录响应:"
echo "$HISTORY_RESPONSE" | jq '.'
echo ""

# 检查响应状态（Spring Data Page格式）
# 正常的Page响应包含 content, pageable, totalElements 等字段
HAS_CONTENT=$(echo $HISTORY_RESPONSE | jq -r 'has("content") // false')

if [ "$HAS_CONTENT" = "true" ]; then
    echo "✅ API调用成功"
    TOTAL=$(echo $HISTORY_RESPONSE | jq -r '.totalElements // 0')
    echo "   历史记录总数: $TOTAL"

    if [ "$TOTAL" -gt "0" ]; then
        echo ""
        echo "   前3条记录:"
        echo "$HISTORY_RESPONSE" | jq '.content[:3] | map({
            id: .id,
            type: .type,
            amount: .amount,
            currency: .currency,
            isInflow: .isInflow,
            transactionDate: .transactionDate
        })'
    fi
else
    echo "❌ API调用失败"
    echo "$HISTORY_RESPONSE"
fi

echo ""
echo "=== 测试完成 ==="
