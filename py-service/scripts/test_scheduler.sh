#!/bin/bash
# 测试任务调度器

set -e

echo "=== 测试任务调度器 ==="

# 基础 URL
BASE_URL="http://localhost:8001"

echo ""
echo "1. 获取调度器状态..."
curl -s "$BASE_URL/api/scheduler/status" | python3 -m json.tool

echo ""
echo "2. 重新同步调度器任务..."
curl -s -X POST "$BASE_URL/api/scheduler/resync" | python3 -m json.tool

echo ""
echo "3. 再次获取调度器状态..."
curl -s "$BASE_URL/api/scheduler/status" | python3 -m json.tool

echo ""
echo "=== 测试完成 ==="
