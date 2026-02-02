#!/bin/bash

# Alfred 自动部署脚本（含股票分析微服务）
# Auto-deployment script for Alfred with Stock Analysis Service

set -e  # 遇到错误立即退出

# 配置
WORK_DIR="/root/alfred"
BACKEND_JAR="${WORK_DIR}/backend/deploy/app/app.jar"
FRONTEND_DIST="${WORK_DIR}/frontend/deploy/web/"
STOCK_SERVICE_TAR="/tmp/stock-service.tar.gz"
WEBHOOK_SERVER_LOG="/root/webhook/webhook-server.log"

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

# 主部署流程
main() {
    local version="$1"
    local backend_url="$2"
    local frontend_url="$3"
    local stock_service_url="$4"

    log "=========================================="
    log "开始部署 Alfred v${version}"
    log "=========================================="

    # 1. 部署后端
    if [ -n "$backend_url" ]; then
        log "【1/3】部署后端..."
        if download_file "$backend_url" "$BACKEND_JAR"; then
            log "重启后端容器..."
            docker restart alfred-backend || log "后端容器重启失败或不存在"
            sleep 10  # 等待后端启动
        else
            log "后端部署失败"
        fi
    fi

    # 2. 部署前端
    if [ -n "$frontend_url" ]; then
        log "【2/3】部署前端..."
        local temp_tar="/tmp/frontend-dist.tar.gz"
        if download_file "$frontend_url" "$temp_tar"; then
            log "解压前端文件..."
            rm -rf "${FRONTEND_DIST}"*
            tar -xzf "$temp_tar" -C "$(dirname "$FRONTEND_DIST")"
            rm -f "$temp_tar"

            log "重启前端容器..."
            docker restart alfred-frontend || log "前端容器重启失败或不存在"
            sleep 5  # 等待前端启动
        else
            log "前端部署失败"
        fi
    fi

    # 3. 部署 Python 微服务
    if [ -n "$stock_service_url" ]; then
        log "【3/3】部署 Python 微服务..."

        # 新的部署路径
        STOCK_SERVICE_DIR="${WORK_DIR}/py-service"
        STOCK_SERVICE_APP="${STOCK_SERVICE_DIR}/deploy/app"
        STOCK_SERVICE_TAR="/tmp/stock-service.tar.gz"

        if download_file "$stock_service_url" "$STOCK_SERVICE_TAR"; then
            log "解压代码包..."
            rm -rf "${STOCK_SERVICE_APP}"/*
            tar -xzf "$STOCK_SERVICE_TAR" -C "${STOCK_SERVICE_APP}"
            rm -f "$STOCK_SERVICE_TAR"

            log "重启 Python 服务容器..."
            docker restart py-service || log "Python 服务容器重启失败或不存在"
            sleep 15

            # 健康检查
            if docker ps | grep -q py-service; then
                log "✅ Python 服务启动成功"
            else
                log "❌ Python 服务启动失败"
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

    log "✅ 部署完成！版本: ${version}"
}

# 执行主函数
main "$@"
