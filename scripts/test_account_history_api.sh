#!/bin/bash

# 账户历史功能 API 测试脚本
# 测试账户历史 API 的各种场景

set -e

BASE_URL="http://localhost:8080/api/v1"

echo "=== 账户历史功能 API 测试 ==="
echo ""

# 检查是否提供了 TOKEN
if [ -z "$1" ]; then
  echo "用法: $0 <JWT_TOKEN>"
  echo ""
  echo "请先登录获取 JWT Token，然后作为参数传递给此脚本"
  echo ""
  echo "示例："
  echo "  ./scripts/test_account_history_api.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  exit 1
fi

TOKEN="$1"

echo "使用 Token: ${TOKEN:0:20}..."
echo ""

# 测试函数
test_api() {
  local name="$1"
  local url="$2"
  local expected_code="${3:-200}"

  echo "测试: $name"
  echo "GET $url"

  response=$(curl -s -w "\n%{http_code}" -X GET "$url" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -eq "$expected_code" ]; then
    echo "✅ HTTP $http_code"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo "❌ HTTP $http_code (预期: $expected_code)"
    echo "$body"
  fi
  echo ""
}

# 1. 获取账户列表，找到一个账户ID
echo "1. 获取账户列表"
accounts=$(curl -s -X GET "$BASE_URL/accounts" \
  -H "Authorization: Bearer $TOKEN")

echo "$accounts" | jq '.' 2>/dev/null || echo "$accounts"
echo ""

# 提取第一个账户 ID
account_id=$(echo "$accounts" | jq -r '.accounts[0].id // empty')

if [ -z "$account_id" ] || [ "$account_id" = "null" ]; then
  echo "❌ 未找到账户，请先创建账户"
  exit 1
fi

echo "✅ 找到账户 ID: $account_id"
echo ""

# 2. 测试获取账户历史（默认参数）
test_api "2. 获取账户历史（默认参数）" \
  "$BASE_URL/accounts/$account_id/history?page=0&size=10"

# 3. 测试获取账户历史（指定货币 - CNY）
test_api "3. 获取账户历史（CNY 筛选）" \
  "$BASE_URL/accounts/$account_id/history?currency=CNY&page=0&size=10"

# 4. 测试获取账户历史（指定货币 - HKD）
test_api "4. 获取账户历史（HKD 筛选）" \
  "$BASE_URL/accounts/$account_id/history?currency=HKD&page=0&size=10"

# 5. 测试获取账户历史（指定货币 - USD）
test_api "5. 获取账户历史（USD 筛选）" \
  "$BASE_URL/accounts/$account_id/history?currency=USD&page=0&size=10"

# 6. 测试分页 - 第一页
test_api "6. 获取账户历史（第1页，每页5条）" \
  "$BASE_URL/accounts/$account_id/history?page=0&size=5"

# 7. 测试分页 - 第二页
test_api "7. 获取账户历史（第2页，每页5条）" \
  "$BASE_URL/accounts/$account_id/history?page=1&size=5"

# 8. 测试排序 - 按时间升序
test_api "8. 获取账户历史（按时间升序）" \
  "$BASE_URL/accounts/$account_id/history?page=0&size=10&sort=transactionTime,asc"

# 9. 测试排序 - 按时间降序
test_api "9. 获取账户历史（按时间降序）" \
  "$BASE_URL/accounts/$account_id/history?page=0&size=10&sort=transactionTime,desc"

# 10. 测试获取不存在的账户历史
echo "10. 测试获取不存在的账户历史（预期返回空列表或 404）"
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/accounts/99999/history?page=0&size=10" \
  -H "Authorization: Bearer $TOKEN")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "HTTP $http_code"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
echo ""

# 11. 测试无效的货币代码
test_api "11. 测试无效的货币代码（应忽略或返回错误）" \
  "$BASE_URL/accounts/$account_id/history?currency=XXX&page=0&size=10"

# 12. 测试边界情况 - 极大的页码
test_api "12. 测试边界情况（极大的页码）" \
  "$BASE_URL/accounts/$account_id/history?page=9999&size=10"

# 13. 测试边界情况 - 极大的页面大小
test_api "13. 测试边界情况（极大的页面大小）" \
  "$BASE_URL/accounts/$account_id/history?page=0&size=9999"

# 14. 测试参数组合
test_api "14. 测试参数组合（货币 + 排序 + 分页）" \
  "$BASE_URL/accounts/$account_id/history?currency=CNY&page=0&size=5&sort=transactionTime,desc"

echo "=== 测试完成 ==="
echo ""
echo "✅ 所有测试执行完毕"
echo ""
echo "注意事项："
echo "  - 如果返回 401，请检查 Token 是否有效"
echo "  - 如果返回 404，请检查后端是否已启动"
echo "  - 如果历史记录为空，请先创建一些交易记录"
echo ""
echo "创建测试数据的方法："
echo "  1. 使用 ./scripts/test_transactions.sh 创建交易"
echo "  2. 或使用 ./scripts/test_multi_currency_accounts.sh 创建多币种交易"
echo ""
