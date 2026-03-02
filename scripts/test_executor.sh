#!/bin/bash
# 测试任务执行器

echo "=== 测试任务执行器 ==="

# 确保后端服务运行
echo "1. 检查后端服务..."
if ! curl -s http://localhost:8080/actuator/health > /dev/null; then
    echo "错误: 后端服务未运行，请先启动 Spring Boot 后端"
    exit 1
fi

echo "2. 启动 Python 微服务..."
cd /Users/qiuliang/code/alfred/py-service

# 运行测试脚本
python3 tests/test_executor.py

echo ""
echo "=== 测试完成 ==="
