#!/bin/bash
# 项目初始化脚本 - 安装Git hooks和配置
# 使用方法：./scripts/setup.sh

set -e

echo "========================================="
echo "🚀 Alfred 项目初始化"
echo "========================================="
echo ""

# 1. 安装Git hooks
echo "📦 安装 Git Hooks..."
if [ -f "scripts/pre-commit" ]; then
    cp scripts/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✅ Pre-commit hook 已安装"
else
    echo "⚠️  未找到 scripts/pre-commit"
fi

echo ""

# 2. 检查Node.js
echo "📦 检查前端依赖..."
if [ -d "frontend" ] && [ ! -d "frontend/node_modules" ]; then
    echo "正在安装前端依赖..."
    cd frontend
    npm install
    cd ..
    echo "✅ 前端依赖已安装"
else
    echo "✅ 前端依赖已存在"
fi

echo ""

# 3. 检查后端
echo "📦 检查后端配置..."
if [ -f "backend/gradlew" ]; then
    chmod +x backend/gradlew
    echo "✅ 后端Gradle已配置"
else
    echo "⚠️  未找到后端Gradle"
fi

echo ""
echo "========================================="
echo "✅ 初始化完成！"
echo "========================================="
echo ""
echo "接下来："
echo "1. 启动后端: cd backend && ./gradlew bootRun"
echo "2. 启动前端: cd frontend && npm run dev"
echo "3. 开始开发吧！"
echo ""
