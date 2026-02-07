#!/bin/bash

# 测试账户API
# 用于验证账户相关接口是否正常工作

BASE_URL="http://localhost:8080/api/v1"
ACCOUNTS_ENDPOINT="/fund-accounts"  # 注意：路由是 /fund-accounts，不是 /accounts

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "账户API测试"
echo "======================================"

# 1. 登录获取token
echo -e "\n${YELLOW}1. 登录测试账号...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test003","password":"test003"}')

echo "登录响应: $LOGIN_RESPONSE"

# 提取token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}登录失败，无法获取token${NC}"
  exit 1
fi

echo -e "${GREEN}登录成功，获取到token${NC}"

# 2. 获取账户列表
echo -e "\n${YELLOW}2. 获取账户列表...${NC}"
ACCOUNTS_RESPONSE=$(curl -s -X GET "$BASE_URL$ACCOUNTS_ENDPOINT" \
  -H "Authorization: Bearer $TOKEN")

echo "账户列表响应: $ACCOUNTS_RESPONSE"

# 检查响应格式
if echo "$ACCOUNTS_RESPONSE" | grep -q '"accounts"'; then
  echo -e "${GREEN}✓ 账户列表格式正确${NC}"
else
  echo -e "${RED}✗ 账户列表格式错误${NC}"
fi

# 3. 创建新账户
echo -e "\n${YELLOW}3. 创建新账户...${NC}"
TIMESTAMP=$(date +%s)
CREATE_ACCOUNT_RESPONSE=$(curl -s -X POST "$BASE_URL$ACCOUNTS_ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"测试账户_$TIMESTAMP\",
    \"accountType\": \"savings\",
    \"initialBalance\": 1000.00,
    \"currency\": \"CNY\"
  }")

echo "创建账户响应: $CREATE_ACCOUNT_RESPONSE"

# 检查是否创建成功
if echo "$CREATE_ACCOUNT_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✓ 账户创建成功${NC}"

  # 提取账户ID
  ACCOUNT_ID=$(echo $CREATE_ACCOUNT_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)
  echo "新账户ID: $ACCOUNT_ID"
else
  echo -e "${RED}✗ 账户创建失败${NC}"
fi

# 4. 获取单个账户
if [ -n "$ACCOUNT_ID" ]; then
  echo -e "\n${YELLOW}4. 获取单个账户详情 (ID: $ACCOUNT_ID)...${NC}"
  ACCOUNT_DETAIL=$(curl -s -X GET "$BASE_URL$ACCOUNTS_ENDPOINT/$ACCOUNT_ID" \
    -H "Authorization: Bearer $TOKEN")

  echo "账户详情响应: $ACCOUNT_DETAIL"

  if echo "$ACCOUNT_DETAIL" | grep -q '"id"'; then
    echo -e "${GREEN}✓ 获取账户详情成功${NC}"
  else
    echo -e "${RED}✗ 获取账户详情失败${NC}"
  fi
fi

echo -e "\n======================================"
echo "测试完成"
echo "======================================"
