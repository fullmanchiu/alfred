#!/bin/bash

# CI测试脚本
# 用于在CI环境中验证构建

set -e

echo "=========================================="
echo "  Alfred CI 测试"
echo "=========================================="
echo ""

# 后端测试
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  后端测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd backend

echo "运行后端单元测试..."
./gradlew test --no-daemon --stacktrace

echo "✅ 后端测试通过"
echo ""

# 前端测试
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  前端测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd ../frontend

echo "安装前端依赖..."
npm install

echo "运行前端lint检查..."
npm run lint --if-present

echo "运行前端测试..."
npm run test --if-present

echo "✅ 前端测试通过"
echo ""

echo "=========================================="
echo "  ✅ 所有测试通过"
echo "=========================================="
