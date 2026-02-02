#!/bin/bash
# 股票分析API测试脚本

BASE_URL="http://localhost:8080"

# 1. 登录获取token
echo "=== 1. 登录 ==="
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"test003","password":"test003"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "Token: $TOKEN"
echo ""

# 2. 添加自选股（需要先在数据库中存在股票信息）
echo "=== 2. 添加自选股 ==="
# 这里假设数据库中已经有了股票信息，如果失败会提示
curl -s -X POST "$BASE_URL/api/v1/stocks" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"code":"000001","note":"平安银行"}' | python3 -m json.tool
echo ""

# 3. 查询自选股列表
echo "=== 3. 查询自选股列表 ==="
curl -s "$BASE_URL/api/v1/stocks" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# 4. 查询股票概览（从数据库）
echo "=== 4. 查询股票概览 (000001) ==="
curl -s "$BASE_URL/api/v1/stocks/000001/overview" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# 5. 测试实时分析SSE流（这会调用Python微服务）
echo "=== 5. 测试实时分析SSE流 (000001) ==="
echo "注意：此命令会持续输出SSE事件，按Ctrl+C停止"
echo "如果Python微服务未启动，会报错"
timeout 10s curl -N "$BASE_URL/api/v1/stocks/000001/realtime" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Accept: text/event-stream' || true
echo ""

echo "=== 测试完成 ==="
