#!/bin/bash
# 股票 API 测试脚本

BASE_URL="http://localhost:8080/api/v1"

echo "=================================="
echo "股票 API 集成测试"
echo "=================================="
echo ""

# 1. 测试股票搜索 API
echo "=== 测试 1: 股票搜索 API ==="
echo "GET $BASE_URL/stocks/search?keyword=60"
curl -s "$BASE_URL/stocks/search?keyword=60" | jq .
echo ""

# 2. 测试 K线数据 API
echo "=== 测试 2: K线数据 API ==="
echo "GET $BASE_URL/stocks/600000/klines?limit=10"
curl -s "$BASE_URL/stocks/600000/klines?limit=10" | jq .
echo ""

# 3. 测试股票详情 API
echo "=== 测试 3: 股票详情 API ==="
echo "GET $BASE_URL/stocks/600000/detail"
curl -s "$BASE_URL/stocks/600000/detail" | jq .
echo ""

# 4. 测试搜索不存在的股票
echo "=== 测试 4: 搜索不存在的股票 ==="
echo "GET $BASE_URL/stocks/search?keyword=NOTEXIST123"
curl -s "$BASE_URL/stocks/search?keyword=NOTEXIST123" | jq .
echo ""

# 5. 测试不存在股票的 K线
echo "=== 测试 5: 不存在股票的 K线 ==="
echo "GET $BASE_URL/stocks/NOTEXIST123/klines?limit=10"
curl -s "$BASE_URL/stocks/NOTEXIST123/klines?limit=10" | jq .
echo ""

echo "=================================="
echo "测试完成"
echo "=================================="
