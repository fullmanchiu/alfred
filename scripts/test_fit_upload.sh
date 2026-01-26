#!/bin/bash

# FIT文件上传功能测试脚本
# 测试 /api/v1/upload 端点

API_URL="http://localhost:8080/api/v1"
USERNAME="test003"
PASSWORD="test003"
FIT_FILE="${1:-/Users/qiuliang/code/alfred/FitSDKRelease_21.188.00/py/tests/fits/HrmPluginTestActivity.fit}"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0

# 检查FIT文件是否存在
if [ ! -f "$FIT_FILE" ]; then
    echo -e "${RED}错误: FIT文件不存在: $FIT_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}FIT文件上传功能测试${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "API URL: $API_URL"
echo -e "用户: $USERNAME"
echo -e "FIT文件: $FIT_FILE"
echo ""

# 1. 登录获取Token
echo -e "\n${YELLOW}步骤 1: 登录系统${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}登录失败，无法获取Token${NC}"
    echo "响应: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}登录成功，Token已获取${NC}"

# ==================== 开始测试 ====================

# 测试 1: 上传单个FIT文件
echo -e "\n${YELLOW}测试 1: 上传单个FIT文件${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "files=@$FIT_FILE")
echo "响应: $UPLOAD_RESPONSE"
if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
fi

# 测试 2: 验证返回的数据结构
echo -e "\n${YELLOW}测试 2: 验证返回的数据结构${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "files=@$FIT_FILE")
if echo "$UPLOAD_RESPONSE" | grep -q 'uploaded_count' && \
   echo "$UPLOAD_RESPONSE" | grep -q 'activities' && \
   echo "$UPLOAD_RESPONSE" | grep -q 'message'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
fi

# 测试 3: 上传空文件列表（应该失败）
echo -e "\n${YELLOW}测试 3: 上传空文件列表（预期失败）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X POST "$API_URL/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "files=")
if echo "$RESPONSE" | grep -q '"success":false'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
fi

# 测试 4: 未认证访问（应该失败）
echo -e "\n${YELLOW}测试 4: 未认证访问（预期失败）${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X POST "$API_URL/upload" \
    -F "files=@$FIT_FILE")
# 未认证访问应该返回401或403，或者包含success:false
if echo "$RESPONSE" | grep -q '"success":false'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    # 检查是否返回401/403状态码（即使没有JSON响应）
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/upload" \
        -F "files=@$FIT_FILE")
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过 (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}✗ 测试失败 (HTTP $HTTP_CODE: $RESPONSE)${NC}"
    fi
fi

# 测试 5: 验证活动记录被创建
echo -e "\n${YELLOW}测试 5: 验证活动记录被创建${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
ACTIVITIES_RESPONSE=$(curl -s "$API_URL/activities" \
    -H "Authorization: Bearer $TOKEN")
# 检查响应包含activities数组或data字段
if echo "$ACTIVITIES_RESPONSE" | grep -q '"activities"' || echo "$ACTIVITIES_RESPONSE" | grep -q '"data"'; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "响应: $ACTIVITIES_RESPONSE" | head -c 200
fi

# 测试 6: 获取活动详情
echo -e "\n${YELLOW}测试 6: 获取活动详情${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "files=@$FIT_FILE")
ACTIVITY_ID=$(echo "$UPLOAD_RESPONSE" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)
if [ -n "$ACTIVITY_ID" ]; then
    DETAIL_RESPONSE=$(curl -s "$API_URL/activities/$ACTIVITY_ID" \
        -H "Authorization: Bearer $TOKEN")
    # 检查响应包含success:true或data字段
    if echo "$DETAIL_RESPONSE" | grep -q '"success":true' || echo "$DETAIL_RESPONSE" | grep -q '"id"'; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ 测试通过${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
        echo "活动ID: $ACTIVITY_ID"
        echo "响应: $DETAIL_RESPONSE" | head -c 200
    fi
else
    echo -e "${RED}✗ 测试失败（无法获取Activity ID）${NC}"
    echo "上传响应: $UPLOAD_RESPONSE"
fi

# ==================== 测试总结 ====================

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}测试总结${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}所有测试通过！${NC}"
    exit 0
else
    echo -e "\n${RED}部分测试失败${NC}"
    exit 1
fi
