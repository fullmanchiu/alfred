#!/bin/bash
# 测试股票分析 API（通过 Spring Boot）

curl -s -X POST "http://localhost:8080/api/v1/stocks/600000/analyze?includeAi=true" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool | head -60
