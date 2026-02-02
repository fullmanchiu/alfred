#!/bin/bash
# 测试超时问题

echo "=== 测试1：不含AI分析（应该很快）==="
start=$(date +%s)
curl -s -X POST "http://localhost:8001/api/stock/analyze" \
  -H "Content-Type: application/json" \
  -d '{"code":"600000","include_ai":false}' \
  -o /tmp/test_no_ai.json
end=$(date +%s)
elapsed=$((end - start))
echo "耗时: ${elapsed}秒"
echo "股票名称:" $(python3 -c "import json; d=json.load(open('/tmp/test_no_ai.json')); print(d['data']['stock_name'])" 2>/dev/null || echo "解析失败")

echo ""
echo "=== 测试2：含AI分析（可能较慢）==="
start=$(date +%s)
curl -s -X POST "http://localhost:8001/api/stock/analyze" \
  -H "Content-Type: application/json" \
  -d '{"code":"600000","include_ai":true}' \
  -o /tmp/test_with_ai.json
end=$(date +%s)
elapsed=$((end - start))
echo "耗时: ${elapsed}秒"
echo "AI报告长度:" $(python3 -c "import json; d=json.load(open('/tmp/test_with_ai.json')); print(len(d['data']['ai_report']) + '字符')" 2>/dev/null || echo "解析失败")
