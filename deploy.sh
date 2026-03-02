#!/bin/bash

# Alfred 项目自动部署脚本
# 支持两种模式：
# 1. 交互式：./deploy.sh [branch]
# 2. 自动部署：./deploy.sh version backend_url frontend_url python_url

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
WARNING="⚠️"

# 项目路径
PROJECT_PATH="${PROJECT_PATH:-/root/alfred}"
WEBHOOK_SERVER_LOG="${WEBHOOK_SERVER_LOG:-/root/webhook/webhook-server.log}"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${WEBHOOK_SERVER_LOG}"
}

# 下载文件函数
download_file() {
    local url="$1"
    local output="$2"

    log "开始下载: $url"
    log "保存到: $output"

    # 创建目录
    mkdir -p "$(dirname "$output")"

    # 下载文件（带重试）
    for i in {1..3}; do
        if curl -L -f -o "$output" "$url" --max-time 300; then
            log "下载成功"
            return 0
        else
            log "下载失败，重试 ($i/3)..."
            sleep 5
        fi
    done

    log "下载失败，已达到最大重试次数"
    return 1
}

# 自动部署模式（webhook 触发）
auto_deploy() {
    local version="$1"
    local backend_url="$2"
    local frontend_url="$3"
    local python_service_url="$4"

    log "=========================================="
    log "开始自动部署 Alfred v${version}"
    log "=========================================="

    # 1. 部署后端
    if [ -n "$backend_url" ]; then
        log "【1/3】部署后端..."
        local backend_jar="${PROJECT_PATH}/backend/deploy/app/app.jar"
        if download_file "$backend_url" "$backend_jar"; then
            log "重启后端容器..."
            cd "${PROJECT_PATH}/backend/deploy"
            docker restart alfred-backend 2>/dev/null || docker-compose up -d
            sleep 10
        else
            log "后端部署失败"
        fi
    fi

    # 2. 部署前端
    if [ -n "$frontend_url" ]; then
        log "【2/3】部署前端..."
        local temp_tar="/tmp/frontend-dist.tar.gz"
        local frontend_dist="${PROJECT_PATH}/frontend/deploy/web/"

        if download_file "$frontend_url" "$temp_tar"; then
            log "解压前端文件..."
            rm -rf "${frontend_dist}"*
            tar -xzf "$temp_tar" -C "$(dirname "$frontend_dist")"
            rm -f "$temp_tar"

            log "重启前端容器..."
            cd "${PROJECT_PATH}/frontend/deploy"
            docker restart alfred-frontend 2>/dev/null || docker-compose up -d
            sleep 5
        else
            log "前端部署失败"
        fi
    fi

    # 3. 部署 Python 微服务
    if [ -n "$python_service_url" ]; then
        log "【3/3】部署 Python 微服务..."

        local python_service_dir="${PROJECT_PATH}/py-service"
        local python_service_app="${python_service_dir}/deploy/app"
        local python_service_tar="/tmp/py-service.tar.gz"

        if download_file "$python_service_url" "$python_service_tar"; then
            log "解压 Python 代码包（包含 environment.yml）..."
            rm -rf "${python_service_app}"/*
            tar -xzf "$python_service_tar" -C "${python_service_app}"
            rm -f "$python_service_tar"

            # 验证 environment.yml 存在
            if [ ! -f "${python_service_app}/environment.yml" ]; then
                log "❌ 错误: environment.yml 不存在，Python 服务将无法启动！"
            else
                log "✅ environment.yml 已就位"
            fi

            log "设置目录权限（容器以 UID 57439 运行）..."
            sudo chown -R 57439:57439 "${python_service_app}" 2>/dev/null || log "警告: 权限设置失败"

            log "重启 Python 服务容器..."
            cd "${python_service_dir}/deploy"
            docker restart py-service 2>/dev/null || docker-compose up -d
            sleep 15

            # 健康检查
            if docker ps | grep -q py-service; then
                log "✅ Python 服务启动成功"
            else
                log "❌ Python 服务启动失败，查看日志..."
                docker-compose logs --tail=50 py-service | tee -a "${WEBHOOK_SERVER_LOG}"
            fi
        else
            log "Python 服务部署失败"
        fi
    else
        log "跳过 Python 服务部署（未提供 URL）"
    fi

    # 4. 检查所有服务状态
    log "=========================================="
    log "部署完成！检查服务状态..."
    log "=========================================="

    echo ""
    log "📊 容器状态:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|alfred|py"
    echo ""

    log "✅ 自动部署完成！版本: ${version}"
}

# 交互式部署模式
interactive_deploy() {
    local BRANCH="${1:-main}"

    echo ""
    echo "=========================================="
    echo "  Alfred 交互式部署"
    echo "=========================================="
    echo ""
    echo -e "${INFO} 分支: ${GREEN}$BRANCH${NC}"
    echo ""

    cd "$PROJECT_PATH"

    # 拉取最新代码
    echo -e "${INFO} 拉取最新代码..."
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"

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

            # 复制代码到 app 目录
            echo -e "${INFO} 复制代码文件..."
            rsync -av --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' \
                --exclude='tests' --exclude='scripts' --exclude='deploy' \
                ../ app/

            # 验证 environment.yml 存在
            if [ ! -f "app/environment.yml" ]; then
                echo -e "${ERROR} ${RED}错误: app/environment.yml 不存在！${NC}"
                exit 1
            fi
            echo -e "${SUCCESS} environment.yml 已就位"

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
            cd "$PROJECT_PATH/backend/deploy"
            docker build -t alfred-backend:latest .
            docker stop alfred-backend 2>/dev/null || true
            docker rm alfred-backend 2>/dev/null || true

            if ! docker network ls | grep -q "alfred-network"; then
                docker network create alfred-network
            fi

            docker-compose up -d

            # 部署前端
            echo -e "${INFO} [2/2] 部署前端..."
            cd "$PROJECT_PATH/frontend"
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
            cd "$PROJECT_PATH/backend/deploy"
            docker build -t alfred-backend:latest .
            docker stop alfred-backend 2>/dev/null || true
            docker rm alfred-backend 2>/dev/null || true

            if ! docker network ls | grep -q "alfred-network"; then
                docker network create alfred-network
            fi

            docker-compose up -d

            # 部署前端
            echo -e "${INFO} [2/3] 部署前端..."
            cd "$PROJECT_PATH/frontend"
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
            cd "$PROJECT_PATH/py-service/deploy"
            mkdir -p app config data logs

            # 复制代码
            rsync -av --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' \
                --exclude='tests' --exclude='scripts' --exclude='deploy' \
                ../ app/

            if [ ! -f "app/environment.yml" ]; then
                echo -e "${ERROR} ${RED}错误: app/environment.yml 不存在！${NC}"
                exit 1
            fi

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
}

# 主入口
main() {
    # 检查调用模式
    if [ $# -eq 4 ]; then
        # 自动部署模式（webhook 触发）
        # 参数：version backend_url frontend_url python_service_url
        auto_deploy "$@"
    else
        # 交互式模式
        # 参数：[branch]
        interactive_deploy "$@"
    fi
}

main "$@"
