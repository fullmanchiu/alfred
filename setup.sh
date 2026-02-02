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

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set -e

echo ""
echo "=========================================="
echo "  Alfred 一键部署脚本"
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

# ========== 选择部署目标 ==========
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  选择部署目标${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. 仅部署前端"
echo "2. 仅部署后端"
echo "3. 前后端一起部署"
echo "4. 退出"
echo ""

while true; do
    read -p "请选择 [1-4]: " CHOICE
    case $CHOICE in
        1)
            DEPLOY_FRONTEND=true
            DEPLOY_BACKEND=false
            break
            ;;
        2)
            DEPLOY_FRONTEND=false
            DEPLOY_BACKEND=true
            break
            ;;
        3)
            DEPLOY_FRONTEND=true
            DEPLOY_BACKEND=true
            break
            ;;
        4)
            echo "退出"
            exit 0
            ;;
        *)
            echo -e "${ERROR} ${RED}无效选择，请输入 1-4${NC}"
            ;;
    esac
done

echo ""
echo -e "${INFO} 部署配置: ${GREEN}$([ "$DEPLOY_FRONTEND" = true ] && echo "前端 " || echo "")$([ "$DEPLOY_BACKEND" = true ] && echo "后端" || echo "")${NC}"
echo ""

# ========== 公共函数：安装 Docker ==========
install_docker() {
    echo -e "${INFO} 检查Docker..."
    if ! command -v docker &> /dev/null; then
        echo -e "${WARNING} ${YELLOW}Docker未安装${NC}"
        read -p "是否安装Docker? [y/N]: " INSTALL_DOCKER
        INSTALL_DOCKER=${INSTALL_DOCKER:-n}

        if [ "$INSTALL_DOCKER" = "y" ] || [ "$INSTALL_DOCKER" = "Y" ]; then
            echo -e "${INFO} 正在安装Docker..."

            if [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "rocky" ]; then
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
}

# ========== 公共函数：安装 Docker Compose ==========
install_docker_compose() {
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
}

# ========== 公共函数：创建网络 ==========
create_network() {
    if ! docker network ls | grep -q "alfred-network"; then
        echo -e "${INFO} 创建Docker网络..."
        docker network create alfred-network
        echo -e "${SUCCESS} ${GREEN}网络创建完成${NC}"
    fi
}

# ========== 部署后端 ==========
deploy_backend() {
    echo ""
    echo "=========================================="
    echo "  部署后端"
    echo "=========================================="
    echo ""

    cd "$SCRIPT_DIR/backend/deploy"

    # 创建目录结构
    echo -e "${INFO} 创建目录结构..."
    mkdir -p app config data logs

    # 检查 jar 包
    echo -e "${INFO} 检查应用文件..."
    JAR_READY=false

    if [ ! -f "app/app.jar" ]; then
        echo -e "${WARNING} ${YELLOW}警告: app/app.jar 不存在${NC}"
        echo -e "${YELLOW}容器将无法启动，请稍后上传jar包${NC}"
    else
        echo -e "${SUCCESS} ${GREEN}应用文件已就绪${NC}"
        JAR_READY=true
    fi
    echo ""

    # 配置服务端口
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

    # 配置数据库
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  2/2 配置数据库和LLM${NC}"
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

    # LLM配置（可选）
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
        fi
    fi

    echo ""
    echo -e "${INFO} 数据库: ${GREEN}$DB_IP:$DB_PORT/$DB_NAME${NC}"
    if [ -n "$LLM_MODEL" ]; then
        echo -e "${INFO} LLM: ${GREEN}$LLM_MODEL${NC}"
    else
        echo -e "${INFO} LLM: ${YELLOW}未配置${NC}"
    fi
    echo ""

    read -p "确认配置并部署? [Y/n]: " CONFIRM
    CONFIRM=${CONFIRM:-y}
    if [ "$CONFIRM" = "n" ] || [ "$CONFIRM" = "N" ]; then
        echo -e "${WARNING} 已取消"
        return
    fi

    # 生成配置文件
    echo -e "${INFO} 生成配置文件..."
    cp application.yml config/application.yml

    sed -i "s|@DATABASE_URL@|jdbc:postgresql://$DB_IP:$DB_PORT/$DB_NAME|g" config/application.yml
    sed -i "s|@DATABASE_USERNAME@|$DB_USER|g" config/application.yml
    sed -i "s|@DATABASE_PASSWORD@|$DB_PASSWORD|g" config/application.yml

    # 只有当配置了LLM时才替换LLM相关配置
    if [ -n "$LLM_API_KEY" ]; then
        sed -i "s|@LLM_API_KEY@|$LLM_API_KEY|g" config/application.yml
        sed -i "s|@LLM_BASE_URL@|$LLM_BASE_URL|g" config/application.yml
        sed -i "s|@LLM_MODEL@|$LLM_MODEL|g" config/application.yml
    else
        # 保持占位符不变或替换为空
        sed -i "s|@LLM_API_KEY@||g" config/application.yml
        sed -i "s|@LLM_BASE_URL@||g" config/application.yml
        sed -i "s|@LLM_MODEL@||g" config/application.yml
    fi

    echo -e "${SUCCESS} ${GREEN}配置文件已生成${NC}"
    echo ""

    # 构建镜像
    echo -e "${INFO} 构建Docker镜像..."
    if docker images | grep -q "alfred-backend.*latest"; then
        echo -e "${INFO} 镜像已存在，跳过构建"
    else
        docker build -t alfred-backend:latest . > /dev/null 2>&1
        echo -e "${SUCCESS} ${GREEN}镜像构建完成${NC}"
    fi
    echo ""

    # 清理旧容器
    if docker ps -a | grep -q "alfred-backend"; then
        echo -e "${INFO} 清理旧容器..."
        docker stop alfred-backend 2>/dev/null
        docker rm alfred-backend 2>/dev/null
    fi

    # 确保网络存在
    if ! docker network ls | grep -q "alfred-network"; then
        echo -e "${INFO} 创建Docker网络..."
        docker network create alfred-network
    fi

    # 启动容器
    if [ "$JAR_READY" = true ]; then
        echo -e "${INFO} 启动容器..."
        BACKEND_PORT=$BACKEND_PORT docker-compose up -d

        echo ""
        echo -e "${GREEN}=========================================="
        echo -e "  ${GREEN}后端部署完成！${NC}"
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

    cd "$SCRIPT_DIR"
}

# ========== 部署前端 ==========
deploy_frontend() {
    echo ""
    echo "=========================================="
    echo "  部署前端"
    echo "=========================================="
    echo ""

    cd "$SCRIPT_DIR/frontend/deploy"

    # 创建目录结构
    echo -e "${INFO} 创建目录结构..."
    mkdir -p web logs

    # 检查静态文件
    echo -e "${INFO} 检查静态文件..."
    STATIC_READY=false

    if [ ! -d "web" ] || [ -z "$(ls -A web)" ]; then
        echo -e "${WARNING} ${YELLOW}警告: web目录为空${NC}"
        echo -e "${YELLOW}容器将无法正常提供服务，请稍后上传静态文件${NC}"
    else
        echo -e "${SUCCESS} ${GREEN}静态文件已就绪${NC}"
        STATIC_READY=true
    fi
    echo ""

    # 配置前端端口
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  1/2 配置前端端口${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    read -p "请输入前端端口 [80]: " FRONTEND_PORT
    FRONTEND_PORT=${FRONTEND_PORT:-80}

    if [[ ! "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || [ "$FRONTEND_PORT" -lt 1 ] || [ "$FRONTEND_PORT" -gt 65535 ]; then
        echo -e "${ERROR} ${RED}错误: 端口无效${NC}"
        exit 1
    fi

    echo -e "${SUCCESS} ${GREEN}端口配置: $FRONTEND_PORT${NC}"
    echo ""

    # 配置后端API
    if [ "$DEPLOY_BACKEND" = true ]; then
        # 前后端一起部署，自动使用容器名
        BACKEND_API="http://alfred-backend:8080"
        echo -e "${INFO} 前后端一起部署，自动配置后端API地址"
        echo -e "${SUCCESS} ${GREEN}后端API: $BACKEND_API${NC}"
        echo ""
    else
        # 仅部署前端，需要手动输入后端地址
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}  2/2 配置后端API${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${ARROW} 说明："
        echo "  - 前端nginx会将 /api/ 请求代理到此地址"
        echo "  - 如果后端非标准端口(80/443)，需要加端口号"
        echo -e "${YELLOW}  示例: http://localhost:8000 或 http://colafans.cn:8000${NC}"
        echo ""

        while true; do
            read -p "请输入后端API地址: " BACKEND_API_INPUT

            if [ -z "$BACKEND_API_INPUT" ]; then
                echo -e "${ERROR} ${RED}错误: API地址不能为空${NC}"
                continue
            fi

            # 自动补全 http://
            if [[ ! "$BACKEND_API_INPUT" =~ ^https?:// ]]; then
                BACKEND_API="http://$BACKEND_API_INPUT"
                echo -e "${INFO} 自动补全为: $BACKEND_API"
            else
                BACKEND_API="$BACKEND_API_INPUT"
            fi

            echo -e "${SUCCESS} ${GREEN}后端API: $BACKEND_API${NC}"
            break
        done
        echo ""
    fi

    # 配置HTTPS
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  3/3 配置HTTPS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 检测是否已有证书
    EXISTING_CERTS=""
    if [ -d /etc/letsencrypt/live ]; then
        EXISTING_CERTS=$(ls -1 /etc/letsencrypt/live 2>/dev/null | grep -v README | tr '\n' ' ')
    fi

    if [ -n "$EXISTING_CERTS" ]; then
        echo -e "${INFO} 检测到已有SSL证书: ${GREEN}$EXISTING_CERTS${NC}"
        read -p "是否使用已有证书? [Y/n]: " USE_EXISTING
        USE_EXISTING=${USE_EXISTING:-y}

        if [ "$USE_EXISTING" = "y" ] || [ "$USE_EXISTING" = "Y" ]; then
            # 显示已有证书列表
            echo ""
            echo "已有证书："
            i=1
            for cert in $EXISTING_CERTS; do
                echo "  $i. $cert"
                i=$((i+1))
            done

            # 选择证书
            while true; do
                read -p "请选择证书 (输入域名或序号): " CERT_CHOICE

                # 如果输入的是序号
                if [[ "$CERT_CHOICE" =~ ^[0-9]+$ ]]; then
                    j=1
                    for cert in $EXISTING_CERTS; do
                        if [ $j -eq $CERT_CHOICE ]; then
                            DOMAIN="$cert"
                            break
                        fi
                        j=$((j+1))
                    done
                else
                    DOMAIN="$CERT_CHOICE"
                fi

                if [ -z "$DOMAIN" ]; then
                    echo -e "${ERROR} ${RED}选择无效${NC}"
                    continue
                fi

                if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
                    echo -e "${SUCCESS} ${GREEN}选择证书: $DOMAIN${NC}"
                    break
                else
                    echo -e "${ERROR} ${RED}证书不存在: $DOMAIN${NC}"
                fi
            done

            USE_HTTPS=true
            SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
            SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
        fi
    fi

    # 如果没有使用已有证书，询问是否申请新证书
    if [ "$USE_HTTPS" = false ]; then
        echo -e "${ARROW} 说明："
        echo "  - 生产环境推荐启用HTTPS"
        echo "  - Let's Encrypt 提供90天免费证书"
        echo "  - 需要域名已解析到此服务器"
        echo "  - 开发环境可以跳过"
        echo ""

        read -p "是否启用HTTPS? [y/N]: " ENABLE_HTTPS
        ENABLE_HTTPS=${ENABLE_HTTPS:-n}
    fi

    if [ "$ENABLE_HTTPS" = "y" ] || [ "$ENABLE_HTTPS" = "Y" ]; then
        if [ "$USE_HTTPS" = false ]; then
            echo ""
            echo -e "${ARROW} 自动申请Let's Encrypt证书"
            echo ""

            while true; do
                read -p "请输入域名（如: colafans.cn）: " DOMAIN
                if [ -z "$DOMAIN" ]; then
                    echo -e "${ERROR} ${RED}错误: 域名不能为空${NC}"
                    continue
                fi

                # 验证域名格式
                if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
                    echo -e "${ERROR} ${RED}错误: 域名格式不正确${NC}"
                    continue
                fi

                echo -e "${SUCCESS} ${GREEN}域名: $DOMAIN${NC}"

                # 检查域名解析
                echo -e "${INFO} 检查域名解析..."
                SERVER_IP=$(hostname -I | awk '{print $1}')
                DOMAIN_IP=$(dig +short $DOMAIN | head -1)

                if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
                    echo -e "${WARNING} ${YELLOW}警告: 域名 $DOMAIN 解析到 $DOMAIN_IP${NC}"
                    echo -e "${YELLOW}服务器IP: $SERVER_IP${NC}"
                    echo -e "${YELLOW}请确保域名已正确解析到此服务器${NC}"
                    read -p "是否继续? [y/N]: " CONFIRM_DOMAIN
                    CONFIRM_DOMAIN=${CONFIRM_DOMAIN:-n}
                    if [ "$CONFIRM_DOMAIN" != "y" ] && [ "$CONFIRM_DOMAIN" != "Y" ]; then
                        continue
                    fi
                fi

                break
            done

            # 询问邮箱
            while true; do
                read -p "请输入邮箱（用于证书到期提醒）: " EMAIL
                if [ -z "$EMAIL" ]; then
                    echo -e "${ERROR} ${RED}错误: 邮箱不能为空${NC}"
                    continue
                fi

                if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
                    echo -e "${ERROR} ${RED}错误: 邮箱格式不正确${NC}"
                    continue
                fi

                break
            done

            echo ""
            echo -e "${INFO} 开始申请证书..."

            # 检查certbot是否安装
            if ! command -v certbot &> /dev/null; then
                echo -e "${INFO} 安装certbot..."
                if [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "rocky" ]; then
                    yum install -y epel-release
                    yum install -y certbot
                elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
                    apt-get update
                    apt-get install -y certbot
                else
                    echo -e "${ERROR} ${RED}不支持的操作系统${NC}"
                    exit 1
                fi
            fi

            # 申请证书
            certbot certonly --standalone \
                -d $DOMAIN \
                --email $EMAIL \
                --agree-tos \
                --non-interactive \
                --force-renewal

            if [ $? -eq 0 ]; then
                echo -e "${SUCCESS} ${GREEN}证书申请成功${NC}"
                USE_HTTPS=true
                SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
                SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
            else
                echo -e "${ERROR} ${RED}证书申请失败${NC}"
                echo -e "${YELLOW}请检查：${NC}"
                echo "1. 域名是否已解析到此服务器"
                echo "2. 防火墙是否已开放80和443端口"
                echo "3. 80端口是否被其他程序占用"
                read -p "是否继续部署（HTTP模式）? [y/N]: " CONTINUE_HTTP
                CONTINUE_HTTP=${CONTINUE_HTTP:-n}
                if [ "$CONTINUE_HTTP" != "y" ] && [ "$CONTINUE_HTTP" != "Y" ]; then
                    exit 1
                fi
                USE_HTTPS=false
            fi
        fi
    else
        echo -e "${INFO} ${YELLOW}使用HTTP模式${NC}"
    fi
    echo ""

    # 配置总结
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  配置总结${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${INFO} 前端端口:    ${GREEN}$FRONTEND_PORT${NC}"
    echo -e "${INFO} 后端API:     ${GREEN}$BACKEND_API${NC}"
    echo -e "${INFO} HTTPS:       ${GREEN}$([ "$USE_HTTPS" = true ] && echo "已启用" || echo "未启用")${NC}"
    if [ "$USE_HTTPS" = true ]; then
        echo -e "${INFO} SSL证书:     ${GREEN}$SSL_CERT${NC}"
    fi
    echo ""

    read -p "确认配置并部署? [Y/n]: " CONFIRM
    CONFIRM=${CONFIRM:-y}
    if [ "$CONFIRM" = "n" ] || [ "$CONFIRM" = "N" ]; then
        echo -e "${WARNING} 已取消"
        cd "$SCRIPT_DIR"
        return
    fi

    # 生成nginx配置
    echo -e "${INFO} 生成nginx配置..."

    if [ "$USE_HTTPS" = true ]; then
        # HTTPS配置
        cat > nginx.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    root /usr/share/nginx/html;
    index index.html;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # 开启gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API代理
    location /api/ {
        proxy_pass $BACKEND_API;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # API超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
    else
        # HTTP配置
        cat > nginx.conf << EOF
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # 开启gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API代理
    location /api/ {
        proxy_pass $BACKEND_API;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # API超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
    fi

    echo -e "${SUCCESS} ${GREEN}nginx配置已生成${NC}"
    echo ""

    # 构建镜像
    echo -e "${INFO} 构建Docker镜像..."
    if docker images | grep -q "alfred-frontend.*latest"; then
        echo -e "${INFO} 镜像已存在，跳过构建"
    else
        docker build -t alfred-frontend:latest . > /dev/null 2>&1
        echo -e "${SUCCESS} ${GREEN}镜像构建完成${NC}"
    fi
    echo ""

    # 清理旧容器
    if docker ps -a | grep -q "alfred-frontend"; then
        echo -e "${INFO} 清理旧容器..."
        docker stop alfred-frontend 2>/dev/null
        docker rm alfred-frontend 2>/dev/null
    fi

    # 确保网络存在
    if ! docker network ls | grep -q "alfred-network"; then
        echo -e "${INFO} 创建Docker网络..."
        docker network create alfred-network
    fi

    # 启动容器
    if [ "$STATIC_READY" = true ]; then
        echo -e "${INFO} 启动容器..."

        # 根据HTTPS配置生成docker-compose命令
        if [ "$USE_HTTPS" = true ]; then
            # HTTPS模式：需要挂载SSL证书
            docker run -d \
                --name alfred-frontend \
                --restart unless-stopped \
                -p "$FRONTEND_PORT:80" \
                -p "443:443" \
                -v "$(pwd)/web:/usr/share/nginx/html:ro" \
                -v "$(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
                -v "$SSL_CERT:/etc/ssl/certs/fullchain.pem:ro" \
                -v "$SSL_KEY:/etc/ssl/certs/privkey.pem:ro" \
                -v "$(pwd)/logs:/var/log/nginx" \
                --network alfred-network \
                alfred-frontend:latest
        else
            # HTTP模式
            FRONTEND_PORT=$FRONTEND_PORT docker-compose up -d
        fi

        echo ""
        echo -e "${GREEN}=========================================="
        echo -e "  ${GREEN}前端部署完成！${NC}"
        echo -e "${GREEN}==========================================${NC}"
        echo ""

        if [ "$USE_HTTPS" = true ]; then
            echo -e "${INFO} HTTP访问:    ${GREEN}http://localhost:$FRONTEND_PORT${NC} (自动跳转HTTPS)"
            echo -e "${INFO} HTTPS访问:   ${GREEN}https://localhost${NC}"
            echo -e "${INFO} 健康检查:    ${GREEN}https://localhost/health${NC}"
        else
            echo -e "${INFO} 访问地址:    ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
            echo -e "${INFO} 健康检查:    ${GREEN}http://localhost:$FRONTEND_PORT/health${NC}"
        fi
        echo ""
    else
        echo -e "${YELLOW}⚠️  环境已搭建完成，但缺少静态文件${NC}"
        echo ""
        echo -e "${INFO} 后续操作：${NC}"
        echo "1. 上传静态文件: scp -r dist/* otter:/root/alfred/frontend/deploy/web/"
        if [ "$USE_HTTPS" = true ]; then
            echo "2. 启动容器: docker run -d --name alfred-frontend -p 80:80 -p 443:443 \\"
            echo "   -v \$(pwd)/web:/usr/share/nginx/html:ro \\"
            echo "   -v \$(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro \\"
            echo "   -v $SSL_CERT:/etc/ssl/certs/fullchain.pem:ro \\"
            echo "   -v $SSL_KEY:/etc/ssl/certs/privkey.pem:ro \\"
            echo "   --network alfred-network alfred-frontend:latest"
        else
            echo "2. 启动容器: docker-compose up -d"
        fi
        echo ""
    fi

    # 配置证书自动续期
    if [ "$USE_HTTPS" = true ] && [ -n "$DOMAIN" ]; then
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}  证书自动续期${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""

        # 检查cron任务
        if crontab -l 2>/dev/null | grep -q "certbot renew"; then
            echo -e "${INFO} 自动续期任务已存在"
        else
            echo -e "${INFO} 配置证书自动续期..."

            # 创建续期脚本
            cat > /root/renew-cert.sh << EOF
#!/bin/bash
# 证书续期脚本
certbot renew --quiet --no-self-upgrade
docker restart alfred-frontend
EOF
            chmod +x /root/renew-cert.sh

            # 添加到crontab（每月1号凌晨3点）
            (crontab -l 2>/dev/null; echo "0 3 1 * * /root/renew-cert.sh >> /var/log/cert-renew.log 2>&1") | crontab -

            echo -e "${SUCCESS} ${GREEN}自动续期已配置（每月1号凌晨3点）${NC}"
        fi

        echo ""
        echo -e "${INFO} 证书有效期: 90天"
        echo -e "${INFO} 续期任务: 每月1号自动续期"
        echo -e "${INFO} 手动续期: certbot renew --force-renewal && docker restart alfred-frontend"
        echo ""
    fi

    cd "$SCRIPT_DIR"
}

# ========== 部署 Python 微服务 ==========
deploy_python_service() {
    echo ""
    echo "=========================================="
    echo "  部署 Python 微服务"
    echo "=========================================="
    echo ""

    cd "$SCRIPT_DIR/py-service/deploy"

    # 创建目录结构
    echo -e "${INFO} 创建目录结构..."
    mkdir -p app config data logs

    # 设置 app 目录权限（容器以 UID 57439 运行）
    echo -e "${INFO} 设置目录权限..."
    sudo chown -R 57439:57439 app 2>/dev/null || echo -e "${WARNING} ${YELLOW}警告: 无法设置权限，可能需要手动执行${NC}"

    # 检查代码文件
    echo -e "${INFO} 检查代码文件..."
    CODE_READY=false

    if [ ! -f "app/main.py" ]; then
        echo -e "${WARNING} ${YELLOW}警告: app/main.py 不存在${NC}"
        echo -e "${YELLOW}容器将无法启动，请稍后上传代码包${NC}"
    else
        echo -e "${SUCCESS} ${GREEN}代码文件已就绪${NC}"
        CODE_READY=true
    fi
    echo ""

    # 配置 Python 服务端口
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  1/1 配置服务端口${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    read -p "请输入 Python 服务端口 [8001]: " PYTHON_PORT
    PYTHON_PORT=${PYTHON_PORT:-8001}

    if [[ ! "$PYTHON_PORT" =~ ^[0-9]+$ ]] || [ "$PYTHON_PORT" -lt 1 ] || [ "$PYTHON_PORT" -gt 65535 ]; then
        echo -e "${ERROR} ${RED}错误: 端口无效${NC}"
        exit 1
    fi

    echo -e "${SUCCESS} ${GREEN}端口配置: $PYTHON_PORT${NC}"
    echo ""

    # 生成环境变量配置
    echo -e "${INFO} 生成环境变量配置..."
    cat > config/.env <<EOF
# 服务配置
PORT=8001
LOG_LEVEL=INFO

# Python 路径
PYTHONPATH=/app
EOF
    echo -e "${SUCCESS} ${GREEN}配置文件已生成${NC}"
    echo ""

    read -p "确认配置并部署? [Y/n]: " CONFIRM
    CONFIRM=${CONFIRM:-y}
    if [ "$CONFIRM" = "n" ] || [ "$CONFIRM" = "N" ]; then
        echo -e "${WARNING} 已取消"
        return
    fi

    # 构建 Docker 基础镜像
    echo -e "${INFO} 构建 Docker 运行环境镜像..."
    echo -e "${YELLOW}⏳ 需要 2-3 分钟${NC}"
    docker build -t alfred-py-service:latest .
    echo -e "${SUCCESS} ${GREEN}镜像构建完成${NC}"
    echo ""

    # 清理旧容器
    if docker ps -a | grep -q "py-service"; then
        echo -e "${INFO} 清理旧容器..."
        docker stop py-service 2>/dev/null
        docker rm py-service 2>/dev/null
    fi

    # 确保网络存在
    if ! docker network ls | grep -q "alfred-network"; then
        echo -e "${INFO} 创建Docker网络..."
        docker network create alfred-network
    fi

    # 启动容器
    if [ "$CODE_READY" = true ]; then
        echo -e "${INFO} 启动容器..."
        PYTHON_PORT=$PYTHON_PORT docker-compose up -d

        echo ""
        echo -e "${GREEN}=========================================="
        echo -e "  ${GREEN}Python 微服务部署完成！${NC}"
        echo -e "${GREEN}=========================================="
        echo ""
        echo -e "${INFO} 访问地址:     ${GREEN}http://localhost:$PYTHON_PORT${NC}"
        echo -e "${INFO} 健康检查:     ${GREEN}http://localhost:$PYTHON_PORT/api/health${NC}"
        echo -e "${INFO} API文档:      ${GREEN}http://localhost:$PYTHON_PORT/docs${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠️  环境已搭建完成，但缺少代码文件${NC}"
        echo ""
        echo -e "${INFO} 后续操作：${NC}"
        echo "1. 从 CI/CD 获取代码包，或手动上传"
        echo "2. 解压到 app 目录: tar -xzf py-service.tar.gz -C app/"
        echo "3. 重启容器: docker-compose restart"
        echo ""
    fi

    cd "$SCRIPT_DIR"
}

# ========== 主流程 ==========
# 安装 Docker（如果需要）
install_docker

# 安装 Docker Compose（如果需要）
install_docker_compose

# 创建网络
create_network

# 部署后端（如果选择）
if [ "$DEPLOY_BACKEND" = true ]; then
    deploy_backend
fi

# 部署前端（如果选择）
if [ "$DEPLOY_FRONTEND" = true ]; then
    deploy_frontend
fi

# ========== 总结 ==========
echo ""
echo "=========================================="
echo "  部署完成"
echo "=========================================="
echo ""
echo -e "${INFO} 管理命令：${NC}"
echo ""
echo "后端："
echo "  查看状态:   cd /root/alfred/backend/deploy && docker-compose ps"
echo "  查看日志:   docker logs -f alfred-backend"
echo "  重启服务:   docker restart alfred-backend"
echo ""
echo "前端："
echo "  查看状态:   docker ps | grep alfred-frontend"
echo "  查看日志:   docker logs -f alfred-frontend"
echo "  重启服务:   docker restart alfred-frontend"
echo ""
echo -e "${GREEN}==========================================${NC}"
