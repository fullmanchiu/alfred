#!/bin/bash
# WebSocket 集成测试脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "WebSocket 集成测试"
echo "=========================================="

# 检查服务是否运行
echo ""
echo "1. 检查服务状态..."
JAVA_RUNNING=false
PYTHON_RUNNING=false

# 检查 Java 后端 (8080)
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    JAVA_RUNNING=true
    echo "  ✓ Java 后端运行中 (8080)"
else
    echo "  ✗ Java 后端未运行 (8080)"
fi

# 检查 Python 微服务 (8001)
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    PYTHON_RUNNING=true
    echo "  ✓ Python 微服务运行中 (8001)"
else
    echo "  ✗ Python 微服务未运行 (8001)"
fi

if [ "$JAVA_RUNNING" = false ] || [ "$PYTHON_RUNNING" = false ]; then
    echo ""
    echo "请先启动两个服务后再运行集成测试。"
    exit 1
fi

echo ""
echo "2. 测试 WebSocket 连接..."

# 测试 WebSocket 升级
echo "  测试 /ws 端点..."
WS_RESPONSE=$(curl -s -i -N \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    http://localhost:8001/ws 2>&1)

if echo "$WS_RESPONSE" | grep -q "101 Switching Protocols"; then
    echo "  ✓ WebSocket 升级成功"
else
    echo "  ✗ WebSocket 升级失败"
    echo "  响应: $WS_RESPONSE"
fi

echo ""
echo "3. 测试 HTTP API 端点..."

# 测试 stock.realtime action
echo "  测试 stock.realtime..."
RESPONSE=$(curl -s -X POST http://localhost:8001/api/invoke \
    -H "Content-Type: application/json" \
    -d '{"action":"stock.realtime","payload":{"code":"000001"}}')

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "  ✓ stock.realtime 调用成功"
else
    echo "  ✗ stock.realtime 调用失败"
    echo "  响应: $RESPONSE"
fi

echo ""
echo "=========================================="
echo "集成测试完成"
echo "=========================================="
