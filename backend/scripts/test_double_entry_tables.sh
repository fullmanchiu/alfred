#!/bin/bash

# 测试复式记账数据库表结构
# 使用 Spring Boot Actuator 的 /actuator/health 端点验证数据库连接

BASE_URL="http://localhost:8080"

echo "=========================================="
echo "测试复式记账数据库表结构"
echo "=========================================="
echo ""

# 1. 测试应用健康状态
echo "1. 检查应用健康状态..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/actuator/health")
if echo "$HEALTH_RESPONSE" | grep -q "UP"; then
    echo "✓ 应用运行正常"
else
    echo "✗ 应用未启动或不健康"
    echo "响应: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# 2. 测试 Flyway 迁移状态
echo "2. 检查 Flyway 迁移状态..."
FLYWAY_RESPONSE=$(curl -s "$BASE_URL/actuator/flyway")
if echo "$FLYWAY_RESPONSE" | grep -q "v16"; then
    echo "✓ Flyway 迁移已到 v16 版本"
else
    echo "✗ Flyway 迁移未到预期版本"
    echo "响应: $FLYWAY_RESPONSE"
fi
echo ""

# 3. 测试登录获取 token
echo "3. 登录测试账号..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"test003","password":"test003"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$TOKEN" ]; then
    echo "✓ 登录成功，获取到 token"
else
    echo "✗ 登录失败"
    echo "响应: $LOGIN_RESPONSE"
    exit 1
fi
echo ""

# 4. 测试访问账户列表（验证 accounts 表正常）
echo "4. 测试访问账户列表..."
ACCOUNTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/accounts" \
    -H "Authorization: Bearer $TOKEN")

if echo "$ACCOUNTS_RESPONSE" | grep -q "success"; then
    echo "✓ accounts 表正常工作"
    ACCOUNT_COUNT=$(echo "$ACCOUNTS_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "  当前账户数量: $ACCOUNT_COUNT"
else
    echo "✗ accounts 表访问异常"
    echo "响应: $ACCOUNTS_RESPONSE"
fi
echo ""

# 5. 测试访问交易列表（验证 transactions 表正常）
echo "5. 测试访问交易列表..."
TRANSACTIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/transactions" \
    -H "Authorization: Bearer $TOKEN")

if echo "$TRANSACTIONS_RESPONSE" | grep -q "success"; then
    echo "✓ transactions 表正常工作"
else
    echo "✗ transactions 表访问异常"
    echo "响应: $TRANSACTIONS_RESPONSE"
fi
echo ""

echo "=========================================="
echo "数据库验证完成"
echo "=========================================="
echo ""
echo "迁移表结构说明："
echo "- postings 表: 复式记账核心表，记录每笔交易的借贷分录"
echo "- system_accounts 表: 系统科目账户（权益类）"
echo "- transactions 表: 新增 adjustment_type 和 adjustment_reason 字段"
