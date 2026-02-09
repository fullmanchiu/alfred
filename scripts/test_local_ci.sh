#!/bin/bash
# 本地CI测试脚本 - 模拟GitHub Actions构建环境
# 使用方法：./scripts/test_local_ci.sh

set -e

echo "========================================="
echo "🚀 本地CI测试 - 模拟GitHub Actions构建"
echo "========================================="
echo ""

# 清理缓存（模拟CI环境）
echo "🧹 清理前端缓存..."
cd frontend
rm -rf node_modules .vite dist
echo "✅ 缓存清理完成"
echo ""

# 安装依赖（使用npm ci，类似CI）
echo "📦 安装前端依赖 (npm ci)..."
npm ci
echo "✅ 依赖安装完成"
echo ""

# 设置环境变量（模拟CI）
echo "🔧 设置环境变量..."
VERSION=$(node -p "require('./package.json').version")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
export VITE_APP_VERSION="${VERSION}-${COMMIT}"
export VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "✅ VITE_APP_VERSION=${VITE_APP_VERSION}"
echo "✅ VITE_BUILD_TIME=${VITE_BUILD_TIME}"
echo ""

# 构建前端
echo "🔨 构建前端..."
if npm run build; then
    echo "✅ 前端构建成功"
    echo ""
    echo "📊 构建产物："
    ls -lh dist/ | head -10
    echo ""

    # 检查构建产物大小
    echo "📦 构建产物总大小："
    du -sh dist/
    echo ""
else
    echo "❌ 前端构建失败"
    echo ""
    echo "💡 提示："
    echo "1. 检查TypeScript编译错误"
    echo "2. 运行 'npm run build' 查看详细错误"
    echo "3. 确保所有类型定义正确"
    exit 1
fi

cd ..

echo "========================================="
echo "✅ 本地CI测试通过"
echo "========================================="
echo ""
echo "💡 提示：如果本地通过但GitHub CI失败，可能原因："
echo "1. Node.js版本不同（CI使用Node 18）"
echo "2. 依赖版本不同（npm ci vs npm install）"
echo "3. 平台差异（Linux vs macOS）"
echo ""
echo "🚀 可以安全提交代码了！"
