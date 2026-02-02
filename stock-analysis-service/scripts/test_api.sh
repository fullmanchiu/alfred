#!/bin/bash
# 测试股票分析API

curl -s -X POST http://localhost:8001/api/stock/analyze \
  -H "Content-Type: application/json" \
  -d '{"code":"600000","include_ai":true}' | python3 -m json.tool
