#!/bin/bash

echo "========================================"
echo "系统分类同步测试脚本"
echo "========================================"

# 0. 重启后端
echo ""
echo "[0] 重启后端..."
pkill -f "bootRun" 2>/dev/null || true
sleep 2

cd /Users/qiuliang/code/alfred/alfred
./gradlew bootRun > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端启动
echo "等待后端启动 (PID: $BACKEND_PID)..."
for i in {1..30}; do
  if curl -s http://localhost:8080/actuator/health >/dev/null 2>&1; then
    echo "后端已启动"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "后端启动超时"
    exit 1
  fi
  sleep 1
done

cd - > /dev/null

# 1. 登录
echo ""
echo "[1] 登录中..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lance","password":"921217qL"}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "登录失败"
  exit 1
fi

echo "登录成功，Token: ${TOKEN:0:30}..."

# 2. 检查所有主分类和子分类数量
echo ""
echo "[2] 统计分类数量"
TOTAL=$(curl -s -X GET "http://localhost:8080/api/v1/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '. | length')

PARENT_COUNT=$(curl -s -X GET "http://localhost:8080/api/v1/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | select(.parentId == null)] | length')

SUB_COUNT=$(curl -s -X GET "http://localhost:8080/api/v1/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | select(.parentId != null)] | length')

echo "总分类数: $TOTAL"
echo "主分类数: $PARENT_COUNT"
echo "子分类数: $SUB_COUNT"

# 3. 列出所有主分类
echo ""
echo "[3] 所有主分类"
curl -s -X GET "http://localhost:8080/api/v1/categories" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.parentId == null) | "\(.name) | ID=\(.id) | 子分类=\(.subcategories | length)"'

# 4. 详细显示餐饮和工资的子分类
echo ""
echo "[4] 餐饮分类（参考示例）"
curl -s -X GET "http://localhost:8080/api/v1/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name == "餐饮") | {
    name,
    id,
    subcategories: [.subcategories[0:2] | .[] | {name, id, parentId}]
  }'

echo ""
echo "[5] 工资分类（问题分类）"
curl -s -X GET "http://localhost:8080/api/v1/categories" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name == "工资") | {
    name,
    id,
    configId,
    isSystem,
    parentId,
    subcategories: [.subcategories[] | {name, id, parentId, configId}]
  }'

# 6. 显示所有收入分类及其configId
echo ""
echo "[6] 所有收入分类及configId"
curl -s -X GET "http://localhost:8080/api/v1/categories?type=income" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.parentId == null) | "\(.name) | ID=\(.id) | configId=\(.configId) | 子分类数=\(.subcategories | length)"'

# 7. 验证配置文件更新（v1.0.4）
echo ""
echo "[7] 验证配置文件更新 v1.0.4"

echo ""
echo "7.1 一级分类名称：居住 → 居住缴费"
curl -s -X GET "http://localhost:8080/api/v1/categories" -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.configId == 4) | {name, icon, configId}'

echo ""
echo "7.2 娱乐子分类：应有6个（包含新增的会员订阅）"
curl -s -X GET "http://localhost:8080/api/v1/categories" -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name == "娱乐") | {name, subcategory_count: (.subcategories | length), subcategories: [.subcategories[] | {name, configId}]}'

echo ""
echo "7.3 图标更新验证"
echo "餐饮图标（应为 e3c2）："
curl -s -X GET "http://localhost:8080/api/v1/categories" -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name == "餐饮") | {name, icon}'
echo "工资图标（应为 e8d4）："
curl -s -X GET "http://localhost:8080/api/v1/categories" -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name == "工资") | {name, icon}'
echo "奖金图标（应为 e8dc）："
curl -s -X GET "http://localhost:8080/api/v1/categories" -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name == "奖金") | {name, icon}'

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"
