#!/bin/bash
set -e

echo "==================================="
echo "  Python 微服务启动脚本"
echo "==================================="

# 检查代码是否存在
if [ ! -f "/app/main.py" ]; then
    echo "❌ 错误: /app/main.py 不存在"
    echo "   请确保代码已正确挂载到容器"
    exit 1
fi

# 安装依赖（根据代码的 environment.yml）
if [ -f "/app/environment.yml" ]; then
    echo "➜ 配置镜像源..."
    # 检查是否已配置清华镜像源
    if ! micromamba config list channels | grep -q "mirrors.tuna.tsinghua.edu.cn"; then
        micromamba config append channels conda-forge
        echo "✅ 镜像源配置完成"
    else
        echo "✅ 镜像源已配置"
    fi

    echo "➜ 安装依赖到 py-service 环境..."
    micromamba install --yes --name py-service -f /app/environment.yml
    echo "✅ 依赖安装完成"
else
    echo "⚠️  警告: /app/environment.yml 不存在"
    echo "   跳过依赖安装"
fi

echo ""
echo "➜ 启动服务..."
# 进入代码目录
cd /app
# 使用 py-service 环境启动 FastAPI 服务
exec micromamba run -n py-service uvicorn main:app --host 0.0.0.0 --port 8001
