#!/bin/bash

# 清理测试分类脚本

BASE_URL="http://localhost:8080/api/v1"

# 使用已有的token
TOKEN=$(cat /tmp/token.txt)

if [ -z "$TOKEN" ]; then
  echo "Token文件不存在,尝试登录..."
  TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"test003","password":"test003"}' \
    | jq -r '.data.token')

  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "登录失败,无法获取token"
    exit 1
  fi

  echo "$TOKEN" > /tmp/token.txt
fi

echo "使用token进行操作"

# 获取所有分类
echo "获取所有分类..."
CATEGORIES=$(curl -s -X GET "$BASE_URL/categories?type=expense" \
  -H "Authorization: Bearer $TOKEN")

# 找出所有测试分类的ID
TEST_CATEGORY_IDS=$(echo "$CATEGORIES" | jq -r '.data[] | select(.name | contains("测试")) | .id')

if [ -z "$TEST_CATEGORY_IDS" ]; then
  echo "没有找到测试分类"
  exit 0
fi

echo "找到的测试分类ID: $TEST_CATEGORY_IDS"

# 删除每个测试分类
for ID in $TEST_CATEGORY_IDS; do
  echo "删除分类 ID: $ID"
  curl -s -X DELETE "$BASE_URL/categories/$ID" \
    -H "Authorization: Bearer $TOKEN" \
    | jq -r '.message'
done

echo "清理完成!"
