#!/bin/bash

# Test script to verify gRPC files have been deleted
# 测试脚本验证gRPC文件已删除

set -e

echo "=== 测试 gRPC 文件删除 ==="
echo ""

# Backend gRPC directory
echo "1. 检查 backend gRPC 目录..."
if [ -d "backend/src/main/kotlin/com/colafan/alfred/grpc/" ]; then
    echo "❌ 失败: backend gRPC 目录仍然存在"
    exit 1
else
    echo "✅ 通过: backend gRPC 目录已删除"
fi

# Python gRPC files
echo ""
echo "2. 检查 py-service gRPC 文件..."

files_to_check=(
    "py-service/grpc_server.py"
    "py-service/comm_pb2.py"
    "py-service/comm_pb2_grpc.py"
)

all_deleted=true
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "❌ 失败: $file 仍然存在"
        all_deleted=false
    fi
done

if [ "$all_deleted" = true ]; then
    echo "✅ 通过: 所有 py-service gRPC 文件已删除"
else
    exit 1
fi

# Git status check
echo ""
echo "3. 检查 git 状态..."
if git ls-files | grep -E "(grpc|comm_pb2)" > /dev/null 2>&1; then
    echo "⚠️  警告: git 仍跟踪某些 gRPC 相关文件"
    git ls-files | grep -E "(grpc|comm_pb2)"
else
    echo "✅ 通过: git 不跟踪任何 gRPC 相关文件"
fi

echo ""
echo "=== 所有测试通过 ==="
echo "gRPC 代码删除成功！"
