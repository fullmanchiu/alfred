#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2MiIsInVzZXJuYW1lIjoiY2hhcnR0ZXN0IiwiaWF0IjoxNzcyNTI0NTIxLCJleHAiOjE3NzI1MjYzMjF9.n2Xq61eZT-1eulLyJxH_u4m5PUmTpt17rLxb34dXMgM"

echo "=== GET saved config ==="
curl -s 'http://localhost:8080/api/v1/stocks/chart-config' -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== Test reset config ==="
curl -s -X POST 'http://localhost:8080/api/v1/stocks/chart-config/reset' -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== GET after reset ==="
curl -s 'http://localhost:8080/api/v1/stocks/chart-config' -H "Authorization: Bearer $TOKEN" | jq .
