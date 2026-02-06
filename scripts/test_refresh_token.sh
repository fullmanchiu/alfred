#!/bin/bash

BASE_URL="http://localhost:8080/api/v1"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Refresh Token 功能测试${NC}"
echo -e "${BLUE}========================================${NC}"

# 1. 登录获取 token
echo -e "\n${YELLOW}1. 登录...${NC}"
LOGIN_RESPONSE=$(curl -s "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test003","password":"test003"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}登录失败${NC}"
  exit 1
fi

if [ "$REFRESH_TOKEN" == "null" ] || [ -z "$REFRESH_TOKEN" ]; then
  echo -e "${RED}未获取到 refresh token${NC}"
  exit 1
fi

echo -e "${GREEN}登录成功${NC}"
echo "  Access Token: ${ACCESS_TOKEN:0:20}..."
echo "  Refresh Token: ${REFRESH_TOKEN:0:20}..."
echo "  用户ID: $USER_ID"

# 2. 使用 access token 访问受保护资源
echo -e "\n${YELLOW}2. 使用 access token 访问受保护资源...${NC}"
PROTECTED_RESPONSE=$(curl -s "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

USERNAME=$(echo $PROTECTED_RESPONSE | jq -r '.username')
if [ "$USERNAME" == "test003" ]; then
  echo -e "${GREEN}✓ Access token 有效${NC}"
else
  echo -e "${RED}✗ Access token 无效${NC}"
fi

# 3. 使用 refresh token 刷新
echo -e "\n${YELLOW}3. 使用 refresh token 刷新...${NC}"
REFRESH_RESPONSE=$(curl -s "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.token')
NEW_REFRESH_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.refreshToken')

if [ "$NEW_ACCESS_TOKEN" == "null" ] || [ -z "$NEW_ACCESS_TOKEN" ]; then
  echo -e "${RED}✗ 刷新失败${NC}"
  echo $REFRESH_RESPONSE | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ 刷新成功${NC}"
echo "  新 Access Token: ${NEW_ACCESS_TOKEN:0:20}..."
echo "  新 Refresh Token: ${NEW_REFRESH_TOKEN:0:20}..."

# 验证新 token 不同于旧 token
if [ "$NEW_ACCESS_TOKEN" != "$ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✓ Access token 已更新${NC}"
else
  echo -e "${RED}✗ Access token 未更新${NC}"
fi

if [ "$NEW_REFRESH_TOKEN" != "$REFRESH_TOKEN" ]; then
  echo -e "${GREEN}✓ Refresh token 已更新（滑动过期）${NC}"
else
  echo -e "${RED}✗ Refresh token 未更新${NC}"
fi

# 4. 使用新 token 访问受保护资源
echo -e "\n${YELLOW}4. 使用新 access token 访问受保护资源...${NC}"
PROTECTED_RESPONSE2=$(curl -s "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN")

USERNAME2=$(echo $PROTECTED_RESPONSE2 | jq -r '.username')
if [ "$USERNAME2" == "test003" ]; then
  echo -e "${GREEN}✓ 新 Access token 有效${NC}"
else
  echo -e "${RED}✗ 新 Access token 无效${NC}"
fi

# 5. 使用旧 refresh token 尝试再次刷新（应该失败）
echo -e "\n${YELLOW}5. 使用旧 refresh token 尝试再次刷新（应该失败）...${NC}"
REFRESH_RESPONSE2=$(curl -s "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

if echo $REFRESH_RESPONSE2 | jq -e '.message' > /dev/null; then
  echo -e "${GREEN}✓ 旧 refresh token 已失效（符合预期）${NC}"
else
  echo -e "${RED}✗ 旧 refresh token 仍然有效（不符合预期）${NC}"
fi

# 6. 测试登出
echo -e "\n${YELLOW}6. 测试登出...${NC}"
LOGOUT_RESPONSE=$(curl -s "$BASE_URL/auth/logout" \
  -X POST \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN")

if echo $LOGOUT_RESPONSE | jq -e '.message' > /dev/null; then
  echo -e "${GREEN}✓ 登出成功${NC}"
else
  echo -e "${RED}✗ 登出失败${NC}"
fi

# 7. 使用已登出的 refresh token 尝试刷新（应该失败）
echo -e "\n${YELLOW}7. 使用已登出的 refresh token 尝试刷新（应该失败）...${NC}"
REFRESH_RESPONSE3=$(curl -s "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$NEW_REFRESH_TOKEN\"}")

if echo $REFRESH_RESPONSE3 | jq -e '.message' > /dev/null; then
  echo -e "${GREEN}✓ 登出后 refresh token 已失效（符合预期）${NC}"
else
  echo -e "${RED}✗ 登出后 refresh token 仍然有效（不符合预期）${NC}"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}测试完成！${NC}"
echo -e "${BLUE}========================================${NC}"
