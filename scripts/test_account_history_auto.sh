#!/bin/bash

# 账户历史功能自动化测试脚本
# 自动登录并运行所有测试

set -e

BASE_URL="http://localhost:8080/api/v1"
USERNAME="test003"
PASSWORD="test003"

echo "=== 账户历史功能自动化测试 ==="
echo ""

# 1. 登录获取 token
echo "1. 登录获取 token..."
echo "  用户名: $USERNAME"
echo "  密码: $PASSWORD"
echo ""

TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.data.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  echo ""
  echo "可能的原因："
  echo "  1. 后端服务未启动（请运行: cd backend && ./gradlew bootRun）"
  echo "  2. 用户名或密码错误"
  echo "  3. 数据库连接问题"
  exit 1
fi

echo "✅ 登录成功"
echo "  Token: ${TOKEN:0:30}..."
echo ""

# 2. 运行完整的 API 测试
echo "2. 运行 API 测试..."
echo ""

/Users/qiuliang/code/alfred/scripts/test_account_history_api.sh "$TOKEN"

echo ""
echo "=== 自动化测试完成 ==="
