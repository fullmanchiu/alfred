# Alfred Docker 部署文档

本文档说明如何使用Docker部署Alfred应用。

**最后更新**: 2026-01-27

---

## 📦 架构设计

### 设计原则
- ✅ 前端和后端Docker完全分离
- ✅ 可独立部署和迁移
- ✅ 与服务器无关，可在任何环境运行
- ✅ 使用标准Docker镜像，可移植性强

### 组件说明
```
alfred/
├── frontend/           # React前端
│   ├── Dockerfile     # 前端镜像构建文件
│   └── docker/        # 前端配置
│       └── nginx.conf
├── backend/           # Spring Boot后端
│   └── Dockerfile     # 后端镜像构建文件
└── docker-compose.example.yml  # 编排示例
```

---

## 🚀 快速开始

### 方式1: 使用Docker Compose（推荐）

适用于：完整部署（前端+后端+数据库）

```bash
# 1. 准备配置文件
cp docker-compose.example.yml docker-compose.yml
cp .env.example .env

# 2. 编辑.env文件，修改密码等配置
vim .env

# 3. 启动所有服务
docker-compose up -d

# 4. 查看状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f
```

### 方式2: 单独部署前端

适用于：只需要前端，后端在其他服务器

```bash
# 1. 构建前端镜像
cd frontend
docker build -t alfred-frontend .

# 2. 运行前端容器
docker run -d \
  --name alfred-frontend \
  -p 80:80 \
  --restart unless-stopped \
  alfred-frontend

# 3. 验证
curl http://localhost/health
```

### 方式3: 单独部署后端

适用于：只需要后端，前端在其他服务器

```bash
# 1. 构建后端镜像
cd backend
docker build -t alfred-backend .

# 2. 运行后端容器（需要先启动数据库）
docker run -d \
  --name alfred-backend \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://your-db-host:5432/alfred \
  -e SPRING_DATASOURCE_USERNAME=alfred \
  -e SPRING_DATASOURCE_PASSWORD=your_password \
  -e SPRING_PROFILES_ACTIVE=prod \
  --restart unless-stopped \
  alfred-backend

# 3. 验证
curl http://localhost:8080/actuator/health
```

---

## 🔧 环境变量配置

### 后端环境变量

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `SPRING_PROFILES_ACTIVE` | Spring配置环境 | `prod` | 否 |
| `SPRING_DATASOURCE_URL` | 数据库连接URL | - | 是 |
| `SPRING_DATASOURCE_USERNAME` | 数据库用户名 | - | 是 |
| `SPRING_DATASOURCE_PASSWORD` | 数据库密码 | - | 是 |
| `SERVER_PORT` | 服务端口 | `8080` | 否 |
| `JAVA_OPTS` | JVM参数 | `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0` | 否 |

### 前端环境变量

前端无需环境变量，通过nginx提供静态文件服务。

API地址在构建时由前端代码配置（目前使用腾讯云地址）。

---

## 🌐 生产环境部署

### 架构建议

#### 方案A: 单服务器部署
```
服务器A
  ├─ Frontend (端口80)
  ├─ Backend (端口8080)
  └─ PostgreSQL (端口5432)
```

#### 方案B: 前后端分离（当前架构）
```
服务器A (海外VPS)
  └─ Frontend (端口80/443)

服务器B (腾讯云)
  ├─ Backend (端口8080)
  └─ PostgreSQL (端口5432)
```

### 部署到海外VPS（前端）

```bash
# 1. 本地构建前端镜像
cd frontend
docker build -t alfred-frontend .

# 2. 保存镜像为tar文件
docker save alfred-frontend -o alfred-frontend.tar

# 3. 上传到服务器
scp alfred-frontend.tar root@YOUR_FRONTEND_SERVER:/tmp/

# 4. 在服务器上加载并运行
ssh root@YOUR_FRONTEND_SERVER
docker load -i /tmp/alfred-frontend.tar
docker run -d \
  --name alfred-frontend \
  -p 80:80 \
  -p 443:443 \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  --restart unless-stopped \
  alfred-frontend
```

### 部署到后端服务器（后端+数据库）

```bash
# 1. 使用docker-compose
scp docker-compose.yml root@YOUR_BACKEND_SERVER:/opt/alfred/
scp .env root@YOUR_BACKEND_SERVER:/opt/alfred/

# 2. 在服务器上启动
ssh root@YOUR_BACKEND_SERVER
cd /opt/alfred
docker-compose up -d
```

---

## 🔄 更新部署

### 更新前端

```bash
# 1. 重新构建镜像
cd frontend
docker build -t alfred-frontend:latest .

# 2. 停止旧容器
docker stop alfred-frontend
docker rm alfred-frontend

# 3. 启动新容器
docker run -d \
  --name alfred-frontend \
  -p 80:80 \
  --restart unless-stopped \
  alfred-frontend:latest

# 或使用docker-compose
docker-compose stop frontend
docker-compose rm -f frontend
docker-compose up -d frontend
```

### 更新后端

```bash
# 方式1: 使用docker-compose
docker-compose stop backend
docker-compose rm -f backend
docker-compose build backend
docker-compose up -d backend

# 方式2: 手动更新
cd backend
docker build -t alfred-backend:latest .
docker stop alfred-backend
docker rm alfred-backend
docker run -d \
  --name alfred-backend \
  -p 8080:8080 \
  --env-file .env \
  --restart unless-stopped \
  alfred-backend:latest
```

---

## 🛠️ 常用命令

### 查看容器状态
```bash
docker ps
docker-compose ps
```

### 查看日志
```bash
docker logs -f alfred-frontend
docker logs -f alfred-backend
docker-compose logs -f
```

### 进入容器
```bash
docker exec -it alfred-frontend sh
docker exec -it alfred-backend sh
```

### 重启服务
```bash
docker restart alfred-frontend
docker-compose restart
```

### 停止并删除
```bash
docker stop alfred-frontend
docker rm alfred-frontend
docker-compose down
```

---

## 🔍 健康检查

### 前端健康检查
```bash
curl http://localhost/health
# 预期输出: healthy
```

### 后端健康检查
```bash
curl http://localhost:8080/actuator/health
# 预期输出: {"status":"UP"}
```

### 数据库健康检查
```bash
docker exec alfred-postgres pg_isready -U alfred
# 预期输出: /var/run/postgresql:5432 - accepting connections
```

---

## 🐛 故障排查

### 前端无法访问

1. 检查容器状态: `docker ps`
2. 查看容器日志: `docker logs alfred-frontend`
3. 检查端口占用: `netstat -tlnp | grep 80`
4. 进入容器检查: `docker exec -it alfred-frontend sh`

### 后端启动失败

1. 检查数据库连接: `docker logs alfred-backend`
2. 验证环境变量: `docker inspect alfred-backend | grep -A 20 Env`
3. 检查数据库可访问性: `docker exec alfred-backend ping postgres`

### 容器反复重启

1. 查看详细日志: `docker logs -f --tail 100 alfred-backend`
2. 检查健康配置: `docker inspect alfred-backend | grep -A 10 Health`
3. 手动运行测试: `docker run -it --rm alfred-backend:latest sh`

---

## 📊 监控

### 查看资源使用
```bash
docker stats
```

### 查看容器详情
```bash
docker inspect alfred-frontend
docker inspect alfred-backend
```

### 查看网络
```bash
docker network ls
docker network inspect alfred-network
```

---

## 🔒 安全建议

1. **不要在代码中硬编码密码**
   - 使用环境变量或密钥管理工具

2. **限制容器权限**
   - Dockerfile中使用非root用户
   - 避免使用--privileged参数

3. **定期更新镜像**
   - 及时更新基础镜像（nginx, postgres等）
   - 修复安全漏洞

4. **网络隔离**
   - 使用Docker网络隔离服务
   - 数据库不应暴露到公网

5. **日志管理**
   - 配置日志轮转
   - 敏感信息不要记录到日志

---

## 📝 最佳实践

1. **使用Docker Compose**
   - 便于管理和编排多容器应用

2. **镜像版本管理**
   - 使用tag标记版本，不要只用latest
   - 例如: `alfred-backend:v1.0.0`

3. **健康检查**
   - 确保所有服务都配置了健康检查
   - 及时发现和重启异常容器

4. **资源限制**
   - 在docker-compose.yml中配置资源限制
   - 防止单个容器占用过多资源

5. **数据持久化**
   - 使用Docker volume持久化数据库数据
   - 避免容器重启后数据丢失

---

## 🆘 获取帮助

遇到问题时：
1. 查看日志: `docker logs -f <container_name>`
2. 查看文档: [ARCHITECTURE.md](./ARCHITECTURE.md)
3. 检查配置: 确保环境变量设置正确
