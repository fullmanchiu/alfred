#!/bin/bash

# Alfred 多货币账户系统 API 测试脚本
# 测试多货币账户的创建、查询、货币添加等功能

set -e  # 遇到错误立即退出

API_URL="http://localhost:8080/api/v1"
USERNAME="test003"
PASSWORD="test003"

echo "=========================================="
echo "Alfred 多货币账户系统 API 测试"
echo "=========================================="

# 1. 登录获取 Token
echo -e "\n[测试1] 登录获取 Token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$USERNAME\",
        \"password\": \"$PASSWORD\"
    }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ "$TOKEN" == "" ] || [ -z "$TOKEN" ]; then
    echo "❌ 登录失败"
    echo $LOGIN_RESPONSE | jq '.'
    exit 1
fi

echo "✅ 登录成功，Token: ${TOKEN:0:20}..."

# 2. 创建机构（中银香港）
echo -e "\n[测试2] 创建机构（中银香港）..."
curl -s -X POST "$API_URL/multi-currency-accounts/institutions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "中银香港",
        "type": "bank",
        "icon": "🏦",
        "color": "#E31C23"
    }' | jq '.'

# 3. 创建机构（汇丰HK）
echo -e "\n[测试3] 创建机构（汇丰HK）..."
HSBC_RESPONSE=$(curl -s -X POST "$API_URL/multi-currency-accounts/institutions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "汇丰HK",
        "type": "bank",
        "icon": "🏦",
        "color": "#FFFFFF"
    }')

echo $HSBC_RESPONSE | jq '.'
HSBC_ID=$(echo $HSBC_RESPONSE | jq -r '.id')

# 4. 获取所有账户（初始状态）
echo -e "\n[测试4] 获取所有账户（初始状态）..."
echo -e "\n[测试2] 获取所有账户..."
curl -s "$API_URL/multi-currency-accounts" \
    -H "Authorization: Bearer $TOKEN" | jq '.'

# 5. 创建多货币账户（中银香港 - 外汇宝）
echo -e "\n[测试5] 创建多货币账户（中银香港 - 外汇宝）..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/multi-currency-accounts/account-groups" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "institutionId": 1,
        "name": "外汇宝",
        "description": "多货币储蓄账户",
        "isDefault": false,
        "currencies": [
            {"currency": "CNY", "initialBalance": 10000},
            {"currency": "HKD", "initialBalance": 5000},
            {"currency": "USD", "initialBalance": 1000}
        ]
    }')

echo $CREATE_RESPONSE | jq '.'
ACCOUNT_GROUP_ID=$(echo $CREATE_RESPONSE | jq -r '.id')

# 6. 为账户添加新货币（EUR）
echo -e "\n[测试6] 为账户添加 EUR 货币..."
curl -s -X POST "$API_URL/multi-currency-accounts/account-groups/$ACCOUNT_GROUP_ID/currencies" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "currency": "EUR",
        "initialBalance": 500
    }' | jq '.'

# 7. 获取账户详情
echo -e "\n[测试7] 获取账户详情..."
curl -s "$API_URL/multi-currency-accounts/account-groups/$ACCOUNT_GROUP_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.'

# 8. 按货币筛选账户（CNY）
echo -e "\n[测试8] 筛选 CNY 货币账户..."
curl -s "$API_URL/multi-currency-accounts?currency=CNY" \
    -H "Authorization: Bearer $TOKEN" | jq '.'

# 9. 按货币筛选账户（HKD）
echo -e "\n[测试9] 筛选 HKD 货币账户..."
curl -s "$API_URL/multi-currency-accounts?currency=HKD" \
    -H "Authorization: Bearer $TOKEN" | jq '.'

# 10. 按货币筛选账户（USD）
echo -e "\n[测试10] 筛选 USD 货币账户..."
curl -s "$API_URL/multi-currency-accounts?currency=USD" \
    -H "Authorization: Bearer $TOKEN" | jq '.'

# 11. 创建另一个多货币账户（汇丰HK - One综合账户）
echo -e "\n[测试11] 创建多货币账户（汇丰HK - One综合账户）..."
curl -s -X POST "$API_URL/multi-currency-accounts/account-groups" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "institutionId": 1,
        "name": "One综合账户",
        "description": "汇丰One综合账户",
        "isDefault": false,
        "currencies": [
            {"currency": "HKD", "initialBalance": 3000},
            {"currency": "USD", "initialBalance": 2000},
            {"currency": "CNY", "initialBalance": 3500}
        ]
    }' | jq '.'

# 12. 获取所有账户（最终状态）
echo -e "\n[测试12] 获取所有账户（最终状态）..."
curl -s "$API_URL/multi-currency-accounts" \
    -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=========================================="
echo "✅ 所有测试完成！"
echo "=========================================="
