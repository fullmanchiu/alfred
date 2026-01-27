#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 图标
SUCCESS="✅"
ERROR="❌"
WARNING="⚠️ "
INFO="➜"
ARROW="👉"
LOCK="🔒"

set -e

echo ""
echo "=========================================="
echo "  Alfred 后端环境部署"
echo "=========================================="
echo ""

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
else
    echo -e "${ERROR} ${RED}错误: 无法检测操作系统${NC}"
    exit 1
fi

echo -e "${INFO} 操作系统: $OS $OS_VERSION"
echo ""

# ========== 检查并安装 Docker ==========
echo -e "${INFO} 检查Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${WARNING} ${YELLOW}Docker未安装${NC}"
    read -p "是否安装Docker? [y/N]: " INSTALL_DOCKER
    INSTALL_DOCKER=${INSTALL_DOCKER:-n}

    if [ "$INSTALL_DOCKER" = "y" ] || [ "$INSTALL_DOCKER" = "Y" ]; then
        echo -e "${INFO} 正在安装Docker..."

        if [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "rocky" ]; then
            # 使用阿里云镜像安装最新版Docker
            yum install -y yum-utils
            yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io
            systemctl start docker
            systemctl enable docker

            # 配置镜像加速器
            mkdir -p /etc/docker
            cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF
            systemctl restart docker
        elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            apt-get update
            apt-get install -y docker.io
            systemctl start docker
            systemctl enable docker
        else
            echo -e "${ERROR} ${RED}不支持的操作系统: $OS${NC}"
            exit 1
        fi

        echo -e "${SUCCESS} ${GREEN}Docker安装完成${NC}"
    else
        echo -e "${ERROR} ${RED}Docker是必需的，退出安装${NC}"
        exit 1
    fi
else
    # 检查Docker版本
    DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    DOCKER_MAJOR=$(echo $DOCKER_VERSION | cut -d. -f1)

    if [ "$DOCKER_MAJOR" -lt 18 ]; then
        echo -e "${WARNING} ${YELLOW}Docker版本过旧 ($DOCKER_VERSION)${NC}"
        echo -e "${YELLOW}新版镜像需要 Docker 18.06+${NC}"
        read -p "是否升级Docker? [y/N]: " UPGRADE_DOCKER
        UPGRADE_DOCKER=${UPGRADE_DOCKER:-n}

        if [ "$UPGRADE_DOCKER" = "y" ] || [ "$UPGRADE_DOCKER" = "Y" ]; then
            echo -e "${INFO} 正在升级Docker..."

            if [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "rocky" ]; then
                yum remove -y docker docker-common docker-selinux docker-engine
                yum install -y yum-utils
                yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
                yum install -y docker-ce docker-ce-cli containerd.io
                systemctl restart docker
                systemctl enable docker

                # 配置镜像加速器
                mkdir -p /etc/docker
                cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF
                systemctl restart docker
            else
                echo -e "${ERROR} ${RED}请手动升级Docker${NC}"
                exit 1
            fi

            echo -e "${SUCCESS} ${GREEN}Docker升级完成${NC}"
        else
            echo -e "${ERROR} ${RED}Docker版本过旧，无法继续${NC}"
            exit 1
        fi
    else
        echo -e "${SUCCESS} ${GREEN}Docker已安装 (版本 $DOCKER_VERSION)${NC}"
    fi
fi

# ========== 检查并安装 Docker Compose ==========
echo -e "${INFO} 检查Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${WARNING} ${YELLOW}Docker Compose未安装${NC}"
    read -p "是否安装Docker Compose? [y/N]: " INSTALL_COMPOSE
    INSTALL_COMPOSE=${INSTALL_COMPOSE:-n}

    if [ "$INSTALL_COMPOSE" = "y" ] || [ "$INSTALL_COMPOSE" = "Y" ]; then
        echo -e "${INFO} 正在安装Docker Compose..."

        DOCKER_COMPOSE_VERSION="v2.24.5"
        if [ "$(uname -m)" = "x86_64" ]; then
            ARCH="x86_64"
        else
            ARCH="aarch64"
        fi

        curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-${ARCH}" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose

        echo -e "${SUCCESS} ${GREEN}Docker Compose安装完成${NC}"
    else
        echo -e "${ERROR} ${RED}Docker Compose是必需的，退出安装${NC}"
        exit 1
    fi
else
    echo -e "${SUCCESS} ${GREEN}Docker Compose已安装${NC}"
fi

echo ""

# ========== 创建目录结构 ==========
echo -e "${INFO} 创建目录结构..."
mkdir -p app config data logs
echo -e "${SUCCESS} ${GREEN}目录创建完成${NC}"
echo ""

# ========== 检查 jar 包 ==========
echo -e "${INFO} 检查应用文件..."
JAR_READY=false

if [ ! -f "app/app.jar" ]; then
    echo -e "${WARNING} ${YELLOW}警告: app/app.jar 不存在${NC}"
    echo -e "${YELLOW}容器将无法启动，请稍后上传jar包${NC}"
    echo ""
else
    echo -e "${SUCCESS} ${GREEN}应用文件已就绪${NC}"
    JAR_READY=true
fi
echo ""

# ========== 配置服务端口 ==========
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  1/2 配置服务端口${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "请输入对外端口 [8000]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-8000}

if [[ ! "$BACKEND_PORT" =~ ^[0-9]+$ ]] || [ "$BACKEND_PORT" -lt 1 ] || [ "$BACKEND_PORT" -gt 65535 ]; then
    echo -e "${ERROR} ${RED}错误: 端口无效${NC}"
    exit 1
fi

echo -e "${SUCCESS} ${GREEN}端口配置: $BACKEND_PORT${NC}"
echo ""

# ========== 配置数据库 ==========
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  2/2 配置数据库${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "请输入数据库IP或域名: " DB_IP
if [ -z "$DB_IP" ]; then
    echo -e "${ERROR} ${RED}错误: 数据库地址不能为空${NC}"
    exit 1
fi

read -p "请输入数据库端口 [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "请输入数据库名称 [alfred]: " DB_NAME
DB_NAME=${DB_NAME:-alfred}

read -p "请输入数据库用户名 [alfred]: " DB_USER
DB_USER=${DB_USER:-alfred}

read -sp "${LOCK} 请输入数据库密码: " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${ERROR} ${RED}错误: 数据库密码不能为空${NC}"
    exit 1
fi

echo -e "${SUCCESS} ${GREEN}数据库配置: $DB_IP:$DB_PORT/$DB_NAME${NC}"
echo ""

# ========== 配置LLM ==========
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  3/3 配置LLM服务（可选）${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "是否配置LLM服务? [Y/n]: " ENABLE_LLM
ENABLE_LLM=${ENABLE_LLM:-y}

LLM_API_KEY=""
LLM_BASE_URL=""
LLM_MODEL=""

if [ "$ENABLE_LLM" = "y" ] || [ "$ENABLE_LLM" = "Y" ]; then
    read -p "请输入LLM API密钥: " LLM_API_KEY
    if [ -z "$LLM_API_KEY" ]; then
        echo -e "${WARNING} ${YELLOW}跳过LLM配置${NC}"
    else
        read -p "请输入LLM API地址 [https://dashscope.aliyuncs.com/compatible-mode/v1]: " LLM_BASE_URL
        LLM_BASE_URL=${LLM_BASE_URL:-https://dashscope.aliyuncs.com/compatible-mode/v1}

        read -p "请输入LLM模型 [qwen-plus]: " LLM_MODEL
        LLM_MODEL=${LLM_MODEL:-qwen-plus}

        echo -e "${SUCCESS} ${GREEN}LLM配置完成${NC}"
    fi
fi
echo ""

# ========== 配置总结 ==========
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  配置总结${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${INFO} 服务端口:     ${GREEN}$BACKEND_PORT${NC}"
echo -e "${INFO} 数据库:       ${GREEN}$DB_IP:$DB_PORT/$DB_NAME${NC}"
echo -e "${INFO} 数据库用户:   ${GREEN}$DB_USER${NC}"
if [ -n "$LLM_MODEL" ]; then
    echo -e "${INFO} LLM API:      ${GREEN}$LLM_BASE_URL${NC}"
    echo -e "${INFO} LLM模型:      ${GREEN}$LLM_MODEL${NC}"
else
    echo -e "${INFO} LLM:          ${YELLOW}未配置${NC}"
fi
echo ""

read -p "确认配置并部署? [Y/n]: " CONFIRM
CONFIRM=${CONFIRM:-y}
if [ "$CONFIRM" = "n" ] || [ "$CONFIRM" = "N" ]; then
    echo -e "${WARNING} 已取消"
    exit 0
fi

# ========== 生成配置文件 ==========
echo -e "${INFO} 生成配置文件..."

# 复制模板
cp application.yml config/application.yml

# 替换配置
sed -i "s|@DATABASE_URL@|jdbc:postgresql://$DB_IP:$DB_PORT/$DB_NAME|g" config/application.yml
sed -i "s|@DATABASE_USERNAME@|$DB_USER|g" config/application.yml
sed -i "s|@DATABASE_PASSWORD@|$DB_PASSWORD|g" config/application.yml

# 只有当配置了LLM时才替换LLM相关配置
if [ -n "$LLM_API_KEY" ]; then
    sed -i "s|@LLM_API_KEY@|$LLM_API_KEY|g" config/application.yml
    sed -i "s|@LLM_BASE_URL@|$LLM_BASE_URL|g" config/application.yml
    sed -i "s|@LLM_MODEL@|$LLM_MODEL|g" config/application.yml
else
    # 替换为空字符串
    sed -i "s|@LLM_API_KEY@||g" config/application.yml
    sed -i "s|@LLM_BASE_URL@||g" config/application.yml
    sed -i "s|@LLM_MODEL@||g" config/application.yml
fi

echo -e "${SUCCESS} ${GREEN}配置文件已生成${NC}"
echo ""

# ========== 构建镜像 ==========
echo -e "${INFO} 构建Docker镜像..."
if docker images | grep -q "alfred-backend.*latest"; then
    echo -e "${INFO} 镜像已存在，跳过构建"
else
    docker build -t alfred-backend:latest . > /dev/null 2>&1
    echo -e "${SUCCESS} ${GREEN}镜像构建完成${NC}"
fi
echo ""

# ========== 启动容器 ==========
if [ "$JAR_READY" = true ]; then
    echo -e "${INFO} 启动容器..."
    BACKEND_PORT=$BACKEND_PORT docker-compose up -d

    echo ""
    echo -e "${GREEN}=========================================="
    echo -e "  ${GREEN}部署完成！${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo -e "${INFO} 访问地址:     ${GREEN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "${INFO} 健康检查:     ${GREEN}http://localhost:$BACKEND_PORT/actuator/health${NC}"
    echo -e "${INFO} API文档:      ${GREEN}http://localhost:$BACKEND_PORT/swagger-ui.html${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  环境已搭建完成，但缺少jar包${NC}"
    echo ""
    echo -e "${INFO} 后续操作：${NC}"
    echo "1. 上传jar包: scp build/libs/alfred-0.0.1-SNAPSHOT.jar otter:/root/alfred/backend/deploy/app/app.jar"
    echo "2. 启动容器: docker-compose up -d"
    echo ""
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  管理命令${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "查看状态:   docker-compose ps"
echo "查看日志:   docker-compose logs -f"
echo "重启服务:   docker-compose restart"
echo "停止服务:   docker-compose down"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  更新应用${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. 上传新jar: scp build/libs/alfred-0.0.1-SNAPSHOT.jar otter:/root/alfred/backend/deploy/app/app.jar"
echo "2. 重启容器:  docker-compose restart"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  更新配置${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. 重新运行: ./setup.sh"
echo "2. 或者手动编辑: vim config/application.yml"
echo "3. 重启容器:  docker-compose restart"
echo ""
echo -e "${GREEN}==========================================${NC}"
