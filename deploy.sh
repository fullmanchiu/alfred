#!/bin/bash

# Alfred 项目自动部署脚本
# 用于在服务器上快速部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SUCCESS="✅"
ERROR="❌"
INFO="➜"

# 项目路径
PROJECT_PATH="/root/alfred"
BRANCH="${1:-main}"

echo ""
echo "=========================================="
echo "  Alfred 自动部署"
echo "=========================================="
echo ""
echo -e "${INFO} 分支: ${GREEN}$BRANCH${NC}"
echo ""

cd $PROJECT_PATH

# 拉取最新代码
echo -e "${INFO} 拉取最新代码..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  选择部署目标${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. 仅部署后端"
echo "2. 仅部署前端"
echo "3. 部署 Python 微服务"
echo "4. 前后端一起部署"
echo "5. 全部部署（前后端+Python）"
echo "6. 退出"
echo ""

read -p "请选择 [1-6]: " CHOICE

case $CHOICE in
  1)
    # 部署后端
    echo ""
    echo -e "${INFO} 开始部署后端..."

    cd backend/deploy
    docker build -t alfred-backend:latest .
    docker stop alfred-backend 2>/dev/null || true
    docker rm alfred-backend 2>/dev/null || true

    # 确保网络存在
    if ! docker network ls | grep -q "alfred-network"; then
        docker network create alfred-network
    fi

    docker-compose up -d

    sleep 5
    echo ""
    echo -e "${SUCCESS} ${GREEN}后端部署完成${NC}"
    docker ps | grep alfred-backend
    ;;

  2)
    # 部署前端
    echo ""
    echo -e "${INFO} 开始部署前端..."

    cd frontend
    echo -e "${INFO} 安装依赖..."
    npm install
    echo -e "${INFO} 构建静态资源..."
    npm run build

    # 复制构建产物
    rm -rf deploy/web/*
    cp -r dist/* deploy/web/

    cd deploy
    docker build -t alfred-frontend:latest .
    docker stop alfred-frontend 2>/dev/null || true
    docker rm alfred-frontend 2>/dev/null || true

    # 确保网络存在
    if ! docker network ls | grep -q "alfred-network"; then
        docker network create alfred-network
    fi

    docker-compose up -d

    sleep 5
    echo ""
    echo -e "${SUCCESS} ${GREEN}前端部署完成${NC}"
    docker ps | grep alfred-frontend
    ;;

  3)
    # 部署 Python 微服务
    echo ""
    echo -e "${INFO} 开始部署 Python 微服务..."

    cd py-service/deploy
    mkdir -p app config data logs

    # 设置权限
    echo -e "${INFO} 设置目录权限..."
    sudo chown -R 57439:57439 app 2>/dev/null || echo -e "${WARNING} ${YELLOW}警告: 无法设置权限${NC}"

    # 构建 Docker 镜像
    echo -e "${INFO} 构建 Docker 镜像..."
    docker build -t alfred-py-service:latest .

    # 清理旧容器
    docker stop py-service 2>/dev/null || true
    docker rm py-service 2>/dev/null || true

    # 确保网络存在
    if ! docker network ls | grep -q "alfred-network"; then
        docker network create alfred-network
    fi

    docker-compose up -d

    sleep 10
    echo ""
    echo -e "${SUCCESS} ${GREEN}Python 微服务部署完成${NC}"
    docker ps | grep py-service
    ;;

  4)
    # 部署前后端
    echo ""
    echo -e "${INFO} 开始部署前后端..."

    # 部署后端
    echo -e "${INFO} [1/2] 部署后端..."
    cd $PROJECT_PATH/backend/deploy
    docker build -t alfred-backend:latest .
    docker stop alfred-backend 2>/dev/null || true
    docker rm alfred-backend 2>/dev/null || true

    if ! docker network ls | grep -q "alfred-network"; then
        docker network create alfred-network
    fi

    docker-compose up -d

    # 部署前端
    echo -e "${INFO} [2/2] 部署前端..."
    cd $PROJECT_PATH/frontend
    npm install
    npm run build
    rm -rf deploy/web/*
    cp -r dist/* deploy/web/

    cd deploy
    docker build -t alfred-frontend:latest .
    docker stop alfred-frontend 2>/dev/null || true
    docker rm alfred-frontend 2>/dev/null || true
    docker-compose up -d

    sleep 5
    echo ""
    echo -e "${SUCCESS} ${GREEN}前后端部署完成${NC}"
    docker ps | grep alfred
    ;;

  5)
    # 部署全部（前后端+Python）
    echo ""
    echo -e "${INFO} 开始部署全部服务..."

    # 部署后端
    echo -e "${INFO} [1/3] 部署后端..."
    cd $PROJECT_PATH/backend/deploy
    docker build -t alfred-backend:latest .
    docker stop alfred-backend 2>/dev/null || true
    docker rm alfred-backend 2>/dev/null || true

    if ! docker network ls | grep -q "alfred-network"; then
        docker network create alfred-network
    fi

    docker-compose up -d

    # 部署前端
    echo -e "${INFO} [2/3] 部署前端..."
    cd $PROJECT_PATH/frontend
    npm install
    npm run build
    rm -rf deploy/web/*
    cp -r dist/* deploy/web/

    cd deploy
    docker build -t alfred-frontend:latest .
    docker stop alfred-frontend 2>/dev/null || true
    docker rm alfred-frontend 2>/dev/null || true
    docker-compose up -d

    # 部署 Python 微服务
    echo -e "${INFO} [3/3] 部署 Python 微服务..."
    cd $PROJECT_PATH/py-service/deploy
    mkdir -p app config data logs
    sudo chown -R 57439:57439 app 2>/dev/null || true
    docker build -t alfred-py-service:latest .
    docker stop py-service 2>/dev/null || true
    docker rm py-service 2>/dev/null || true
    docker-compose up -d

    sleep 10
    echo ""
    echo -e "${SUCCESS} ${GREEN}全部服务部署完成${NC}"
    docker ps | grep alfred
    docker ps | grep py-service
    ;;

  6)
    echo "退出"
    exit 0
    ;;

  *)
    echo -e "${ERROR} ${RED}无效选择${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}==========================================${NC}"
