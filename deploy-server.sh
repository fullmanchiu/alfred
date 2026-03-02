#!/bin/bash
# Alfred 自动部署脚本
# 用途：从 GitHub Release 下载最新构建产物并重启 Docker 容器

set -e

# 配置
WORK_DIR="/root/alfred"
BACKEND_JAR="${WORK_DIR}/backend/deploy/app/app.jar"
FRONTEND_DIST="${WORK_DIR}/frontend/deploy/web"
PYTHON_SERVICE_DIR="${WORK_DIR}/py-service/deploy/app"
LOG_FILE="/var/log/alfred-deploy.log"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# 下载文件
download_file() {
    local url=$1
    local output=$2
    local max_retries=3
    local retry=0

    while [ ${retry} -lt ${max_retries} ]; do
        log "下载: ${url} -> ${output}"
        if curl -fSL --retry 3 --retry-delay 5 -o "${output}" "${url}"; then
            return 0
        fi
        retry=$((retry + 1))
        log "重试 ${retry}/${max_retries}..."
        sleep 5
    done

    error_exit "下载失败: ${url}"
}

# 部署后端
deploy_backend() {
    local version=$1
    local download_url=$2

    log "部署后端 v${version}..."

    # 创建目录
    mkdir -p "$(dirname ${BACKEND_JAR})"

    # 备份现有 JAR
    if [ -f "${BACKEND_JAR}" ]; then
        cp "${BACKEND_JAR}" "${BACKEND_JAR}.backup.$(date +%s)"
    fi

    # 下载新 JAR
    download_file "${download_url}" "${BACKEND_JAR}"

    # 验证
    if [ ! -f "${BACKEND_JAR}" ]; then
        error_exit "后端 JAR 文件不存在"
    fi

    log "后端部署完成"
}

# 部署前端
deploy_frontend() {
    local version=$1
    local download_url=$2

    log "部署前端 v${version}..."

    # 创建目录
    mkdir -p "${FRONTEND_DIST}"

    # 清理现有构建
    rm -rf "${FRONTEND_DIST}/*"

    # 下载并解压
    local temp_tar="/tmp/frontend-${version}.tar.gz"
    download_file "${download_url}" "${temp_tar}"
    tar -xzf "${temp_tar}" -C "${FRONTEND_DIST}"
    rm -f "${temp_tar}"

    # 验证
    if [ ! -d "${FRONTEND_DIST}" ] || [ -z "$(ls -A ${FRONTEND_DIST})" ]; then
        error_exit "前端构建产物不存在"
    fi

    log "前端部署完成"
}

# 部署 Python 服务
deploy_python_service() {
    local version=$1
    local download_url=$2

    log "部署 Python 服务 v${version}..."

    # 创建目录
    mkdir -p "${PYTHON_SERVICE_DIR}"

    # 备份现有代码
    if [ -d "${PYTHON_SERVICE_DIR}" ] && [ "$(ls -A ${PYTHON_SERVICE_DIR})" ]; then
        local backup_dir="${PYTHON_SERVICE_DIR}.backup.$(date +%s)"
        cp -r "${PYTHON_SERVICE_DIR}" "${backup_dir}"
        log "已备份现有代码到: ${backup_dir}"
    fi

    # 清理现有代码
    rm -rf "${PYTHON_SERVICE_DIR:?}"/*

    # 下载并解压
    local temp_tar="/tmp/py-service-${version}.tar.gz"
    download_file "${download_url}" "${temp_tar}"

    # 解压到app目录
    tar -xzf "${temp_tar}" -C "${PYTHON_SERVICE_DIR}"
    rm -f "${temp_tar}"

    # 验证关键文件
    if [ ! -f "${PYTHON_SERVICE_DIR}/main.py" ]; then
        error_exit "Python 服务 main.py 不存在"
    fi

    # 检查关键目录
    for dir in executor scheduler websocket modules; do
        if [ ! -d "${PYTHON_SERVICE_DIR}/${dir}" ]; then
            log "⚠ 警告: 目录 ${dir} 不存在"
        fi
    done

    log "Python 服务部署完成"
}

# 重启容器
restart_containers() {
    log "重启 Docker 容器..."

    # 重启后端
    docker restart alfred-backend
    log "✓ 后端容器已重启"

    # 重启前端
    docker restart alfred-frontend
    log "✓ 前端容器已重启"

    # 重启 Python 服务
    docker restart py-service
    log "✓ Python 服务容器已重启"

    # 等待服务启动
    log "等待服务启动..."
    sleep 15

    # 健康检查
    if curl -f http://localhost:8000/actuator/health > /dev/null 2>&1; then
        log "✓ 后端服务健康检查通过"
    else
        log "⚠ 后端服务健康检查失败"
    fi

    if curl -f http://localhost/ > /dev/null 2>&1; then
        log "✓ 前端服务健康检查通过"
    else
        log "⚠ 前端服务健康检查失败"
    fi

    if curl -f http://localhost:8001/ > /dev/null 2>&1; then
        log "✓ Python 服务健康检查通过"
    else
        log "⚠ Python 服务健康检查失败"
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log "清理 7 天前的备份文件..."
    find "$(dirname ${BACKEND_JAR})" -name "app.jar.backup.*" -mtime +7 -delete 2>/dev/null || true
    find "$(dirname ${PYTHON_SERVICE_DIR})" -name "app.backup.*" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
}

# 主部署流程
main() {
    local version=$1
    local backend_url=$2
    local frontend_url=$3
    local python_url=$4

    log "========================================"
    log "开始部署 Alfred v${version}"
    log "========================================"

    # 部署
    deploy_backend "${version}" "${backend_url}"
    deploy_frontend "${version}" "${frontend_url}"

    # 如果提供了 Python 服务 URL，则部署
    if [ -n "${python_url}" ]; then
        deploy_python_service "${version}" "${python_url}"
    fi

    restart_containers
    cleanup_old_backups

    log "========================================"
    log "部署完成！"
    log "========================================"
}

# 参数检查
if [ $# -lt 3 ]; then
    error_exit "用法: $0 <version> <backend_url> <frontend_url> [python_url]"
fi

main "$@"
