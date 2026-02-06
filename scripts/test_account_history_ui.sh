#!/bin/bash

# 账户历史功能 UI 测试脚本
# 测试前端界面的历史记录功能

BASE_URL="http://localhost:8080"
USERNAME="test003"
PASSWORD="test003"

echo "========================================"
echo "账户历史功能 UI 测试"
echo "========================================"
echo ""

# 1. 登录获取 token
echo "1. 登录获取 token..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ 登录成功"
echo ""

# 2. 获取账户列表
echo "2. 获取账户列表..."
ACCOUNTS=$(curl -s "$BASE_URL/api/v1/accounts" \
  -H "Authorization: Bearer $TOKEN")

ACCOUNT_ID=$(echo "$ACCOUNTS" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$ACCOUNT_ID" ]; then
  echo "❌ 没有找到账户"
  exit 1
fi

echo "✅ 找到账户 ID: $ACCOUNT_ID"
echo ""

# 3. 测试获取账户历史（CNY）
echo "3. 测试获取账户历史（CNY）..."
HISTORY=$(curl -s "$BASE_URL/api/v1/accounts/$ACCOUNT_ID/history?currency=CNY&page=0&size=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$HISTORY" | head -50
echo ""

# 检查是否有历史记录
TOTAL_ELEMENTS=$(echo "$HISTORY" | grep -o '"totalElements":[0-9]*' | sed 's/"totalElements"://')

if [ "$TOTAL_ELEMENTS" -gt 0 ]; then
  echo "✅ 找到 $TOTAL_ELEMENTS 条历史记录"
else
  echo "ℹ️ 当前账户暂无历史记录（这是正常的，如果账户是新建的）"
fi

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"
echo ""
echo "前端验证步骤："
echo "1. 启动前端: cd frontend && npm run dev"
echo "2. 打开浏览器: http://localhost:3000"
echo "3. 登录账号: test003 / test003"
echo "4. 进入账户页面"
echo "5. 点击任意账户卡片的'...'按钮"
echo "6. 点击'历史记录'选项"
echo "7. 查看历史记录弹窗是否正常显示"
echo ""
