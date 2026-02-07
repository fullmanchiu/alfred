#!/bin/bash

# 登录获取token
echo "=== 登录 ==="
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test003","password":"test003"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))")

echo "Token: $TOKEN"

# 获取账户列表
echo -e "\n=== 账户列表及其货币 ==="
curl -s -X GET "http://localhost:8080/api/v1/fund-accounts" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

