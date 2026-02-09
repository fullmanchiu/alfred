# Alfred 项目部署指南

> **文档版本**: v2.0
> **最后更新**: 2026-02-09
> **技术栈**: Spring Boot (Kotlin) + React (TypeScript)
> **适用平台**: Windows, macOS, Linux

---

## 📋 目录

- [环境要求](#环境要求)
- [后端部署（Spring Boot）](#后端部署spring-boot)
- [前端部署（React）](#前端部署react)
- [开发环境快速启动](#开发环境快速启动)
- [生产环境部署](#生产环境部署)
- [常见问题](#常见问题)

---

## 环境要求

### 后端环境要求（Spring Boot）

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| JDK | 17+ | 必需，推荐使用 OpenJDK 或 Amazon Corretto |
| Gradle | 8.x+ | 构建工具 |
| PostgreSQL | 14+ | 数据库 |
| Redis | 6.x+ | 缓存（可选） |

### 前端环境要求（React）

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | 18+ | 必需 |
| npm | 9+ 或 pnpm | 包管理器 |
| 浏览器 | Chrome/Firefox/Safari/Edge | 开发调试 |

---

## 后端部署（Spring Boot）

### 步骤 1: 进入项目目录

```bash
# macOS/Linux Terminal
cd /Users/qiuliang/code/alfred/backend

# Windows PowerShell
cd C:\Users\qiuliang\code\alfred\backend
```

### 步骤 2: 检查 Java 版本

```bash
java -version
```

**要求**: JDK 17 或更高版本

**如果没有安装**:
- **macOS**: `brew install openjdk@17`
- **Ubuntu/Debian**: `sudo apt install openjdk-17-jdk`
- **Windows**: 下载并安装 [OpenJDK](https://adoptium.net/)

### 步骤 3: 检查 Gradle 版本

```bash
./gradlew --version
```

**要求**: Gradle 8.x 或更高版本（Wrapper 会自动下载）

### 步骤 4: 数据库配置

#### PostgreSQL 安装

**macOS**:
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian**:
```bash
sudo apt install postgresql-14
sudo systemctl start postgresql
```

**Windows**:
下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)

#### 创建数据库

```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库和用户
CREATE DATABASE alfred_db;
CREATE USER alfred_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE alfred_db TO alfred_user;
\q
```

#### 配置数据库连接

编辑 `src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/alfred_db
    username: alfred_user
    password: your_password
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
```

### 步骤 5: Redis 配置（可选）

**安装 Redis**:

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis
```

**配置 Redis**（在 `application.yml` 中）:

```yaml
spring:
  redis:
    host: localhost
    port: 6379
    password: # 如果有密码
```

### 步骤 6: JWT 配置

在 `application.yml` 中配置 JWT:

```yaml
jwt:
  secret: your-secret-key-change-this-in-production-use-at-least-256-bits
  expiration: 86400000 # 24小时（毫秒）
```

**生成安全的密钥**:

```bash
# 使用 OpenSSL
openssl rand -base64 64

# 或使用在线工具生成随机字符串
```

### 步骤 7: 数据库迁移

项目使用 Flyway 进行数据库迁移，迁移脚本位于 `src/main/resources/db/migration/`。

首次启动时，Flyway 会自动执行迁移脚本。

**手动执行迁移**:

```bash
./gradlew flywayMigrate
```

### 步骤 8: 启动后端服务

#### 方式一：使用 Gradle（推荐开发环境）

```bash
./gradlew bootRun
```

**参数说明**:
- 默认端口: 8080
- Profile: `dev`（可通过 `--args='--spring.profiles.active=prod'` 指定）

#### 方式二：使用构建的 JAR 文件

```bash
# 构建
./gradlew build

# 运行
java -jar build/libs/alfred-backend-0.0.1-SNAPSHOT.jar
```

### 步骤 9: 验证后端运行

```bash
# macOS/Linux
curl http://localhost:8080/actuator/health

# Windows PowerShell
Invoke-WebRequest -Uri http://localhost:8080/actuator/health

# 或在浏览器打开
# http://localhost:8080/swagger-ui.html - Swagger API 文档
# http://localhost:8080/actuator/health - 健康检查
```

**预期响应**:
```json
{
  "status": "UP"
}
```

---

## 前端部署（React）

### 步骤 1: 进入项目目录

```bash
# macOS/Linux Terminal
cd /Users/qiuliang/code/alfred/frontend

# Windows PowerShell
cd C:\Users\qiuliang\code\alfred\frontend
```

### 步骤 2: 检查 Node.js 版本

```bash
node --version
npm --version
```

**要求**: Node.js 18+ 和 npm 9+

**如果没有安装**:
- 下载并安装 [Node.js](https://nodejs.org/)
- 或使用版本管理器: `nvm install 18`

### 步骤 3: 安装依赖

```bash
npm install
# 或使用 pnpm
pnpm install
```

### 步骤 4: 配置 API 地址

编辑 `src/utils/config.ts`:

```typescript
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const CONFIG = {
  API_BASE_URL,
  // 其他配置...
};
```

**或使用环境变量文件**:

创建 `.env.development`:
```env
REACT_APP_API_URL=http://localhost:8080
```

创建 `.env.production`:
```env
REACT_APP_API_URL=https://api.yourdomain.com
```

### 步骤 5: 启动前端应用

#### 开发模式

```bash
npm start
# 或
npm run dev
```

**默认端口**: 3000

应用会自动在浏览器中打开: http://localhost:3000

#### 生产构建

```bash
npm run build
```

构建产物在 `build/` 目录

### 步骤 6: 验证前端运行

1. 浏览器自动打开 http://localhost:3000
2. 显示登录/注册界面
3. 打开浏览器开发者工具（F12）查看 Network 标签
4. 尝试注册/登录，确认 API 请求正常

---

## 开发环境快速启动

### macOS/Linux 快速启动

**准备两个终端窗口或使用 tmux**

**终端1 - 后端**:

```bash
# 进入后端目录
cd /Users/qiuliang/code/alfred/backend

# 启动 PostgreSQL（如果未运行）
brew services start postgresql@14

# 启动 Redis（如果需要）
brew services start redis

# 启动后端
./gradlew bootRun
```

**终端2 - 前端**:

```bash
# 进入前端目录
cd /Users/qiuliang/code/alfred/frontend

# 启动前端
npm start
```

### 使用 tmux（macOS/Linux 推荐）

```bash
# 安装 tmux（如果未安装）
brew install tmux

# 创建新会话
tmux new-session -d -s alfred

# 启动后端
tmux send-keys -t alfred "cd /Users/qiuliang/code/alfred/backend" C-m
tmux send-keys -t alfred "./gradlew bootRun" C-m

# 分割窗口
tmux split-window -t alfred

# 启动前端
tmux send-keys -t alfred.1 "cd /Users/qiuliang/code/alfred/frontend" C-m
tmux send-keys -t alfred.1 "npm start" C-m

# 附加到会话
tmux attach-session -t alfred

# tmux 快捷键
# Ctrl+b c - 创建新窗口
# Ctrl+b " - 分割窗口
# Ctrl+b 方向键 - 切换面板
# Ctrl+b d - 分离会话
```

### Windows 快速启动

**准备两个 PowerShell 窗口**

**终端1 - 后端**:

```powershell
# 进入后端目录
cd C:\Users\qiuliang\code\alfred\backend

# 启动后端
.\gradlew.bat bootRun
```

**终端2 - 前端**:

```powershell
# 进入前端目录
cd C:\Users\qiuliang\code\alfred\frontend

# 启动前端
npm start
```

---

## 生产环境部署

### 后端生产部署

#### 服务器准备

```bash
# 连接到服务器
ssh user@YOUR_BACKEND_SERVER

# 或使用密钥
ssh -i ~/.ssh/your-key.pem user@YOUR_BACKEND_SERVER
```

#### 使用 Systemd 服务（Linux）

**创建服务文件**:

```bash
sudo nano /etc/systemd/system/alfred-backend.service
```

**服务配置**:

```ini
[Unit]
Description=Alfred Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=alfred
Group=alfred
WorkingDirectory=/opt/alfred/backend
Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk"
Environment="SPRING_PROFILES_ACTIVE=prod"
ExecStart=/usr/bin/java -jar /opt/alfred/backend/alfred-backend.jar
ExecStop=/bin/kill -15 $MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=alfred-backend

[Install]
WantedBy=multi-user.target
```

**启动和管理服务**:

```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start alfred-backend

# 设置开机自启
sudo systemctl enable alfred-backend

# 查看服务状态
sudo systemctl status alfred-backend

# 查看日志
sudo journalctl -u alfred-backend -f

# 重启服务
sudo systemctl restart alfred-backend

# 停止服务
sudo systemctl stop alfred-backend
```

#### 使用 Docker 部署

**创建 Dockerfile**:

```dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app

# 复制 JAR 文件
COPY build/libs/alfred-backend-*.jar app.jar

# 暴露端口
EXPOSE 8080

# 启动命令
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**构建和运行**:

```bash
# 构建 JAR
./gradlew build

# 构建镜像
docker build -t alfred-backend:latest .

# 运行容器
docker run -d \
  --name alfred-backend \
  -p 8080:8080 \
  --env-file .env \
  --network host \
  alfred-backend:latest

# 查看日志
docker logs -f alfred-backend

# 停止容器
docker stop alfred-backend

# 删除容器
docker rm alfred-backend
```

**使用 Docker Compose**:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: alfred_db
      POSTGRES_USER: alfred_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6
    ports:
      - "6379:6379"

  backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/alfred_db
      SPRING_DATASOURCE_USERNAME: alfred_user
      SPRING_DATASOURCE_PASSWORD: your_password
      SPRING_REDIS_HOST: redis
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down
```

#### 使用 Nginx 反向代理

**Nginx 配置**:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # API 文档
    location /swagger-ui.html {
        proxy_pass http://127.0.0.1:8080/swagger-ui.html;
    }
}
```

**重启 Nginx**:

```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 或
sudo service nginx restart
```

### 前端生产部署

#### Web 应用部署

**构建生产版本**:

```bash
cd frontend

# 安装依赖
npm install

# 构建
npm run build

# 构建产物在 build/ 目录
```

**部署到 Nginx**:

```bash
# 将构建产物复制到服务器
scp -r build/* user@YOUR_FRONTEND_SERVER:/var/www/alfred/

# 或使用 rsync
rsync -avz build/ user@YOUR_FRONTEND_SERVER:/var/www/alfred/
```

**Nginx 配置**:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    root /var/www/alfred;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理（避免跨域）
    location /api {
        proxy_pass http://api.yourdomain.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 缓存控制
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**配置 HTTPS（使用 Let's Encrypt）**:

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d app.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

#### 使用 Docker 部署前端

**创建 Dockerfile**:

```dockerfile
# 构建阶段
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8080;
    }
}
```

**构建和运行**:

```bash
# 构建镜像
docker build -t alfred-frontend:latest .

# 运行容器
docker run -d \
  --name alfred-frontend \
  -p 80:80 \
  alfred-frontend:latest
```

---

## 常见问题

### 后端问题

#### Q1: 端口被占用

**查找占用端口的进程**:

```bash
# macOS/Linux
lsof -i :8080

# Windows PowerShell
netstat -ano | findstr :8080
```

**杀死进程**:

```bash
# macOS/Linux
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

**或使用其他端口**:

```bash
./gradlew bootRun --args='--server.port=8081'
```

#### Q2: 数据库连接失败

**检查 PostgreSQL 是否运行**:

```bash
# macOS
brew services list

# Linux
sudo systemctl status postgresql

# 启动 PostgreSQL
# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql
```

**验证数据库配置**:

```bash
# 测试连接
psql -h localhost -U alfred_user -d alfred_db

# 检查配置文件
cat src/main/resources/application.yml
```

#### Q3: 依赖下载缓慢

**配置国内镜像源**（在 `build.gradle` 中）:

```gradle
repositories {
    maven { url 'https://maven.aliyun.com/repository/public/' }
    maven { url 'https://maven.aliyun.com/repository/spring/' }
    mavenCentral()
}
```

#### Q4: 内存不足

**增加 JVM 堆内存**:

```bash
./gradlew bootRun --args='-Xmx2g -Xms1g'
```

或在 `gradle.properties` 中配置:

```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
```

### 前端问题

#### Q1: 无法连接到后端

**检查清单**:

1. **确认后端正在运行**:
   ```bash
   curl http://localhost:8080/actuator/health
   ```

2. **检查前端 API 配置**:
   ```typescript
   // src/utils/config.ts
   export const API_BASE_URL = 'http://localhost:8080';
   ```

3. **检查 CORS 配置**（后端）:
   ```java
   @Configuration
   public class WebConfig implements WebMvcConfigurer {
       @Override
       public void addCorsMappings(CorsRegistry registry) {
           registry.addMapping("/**")
               .allowedOrigins("http://localhost:3000")
               .allowedMethods("*")
               .allowedHeaders("*")
               .allowCredentials(true);
       }
   }
   ```

4. **清除浏览器缓存**:
   - Chrome: Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (macOS)

#### Q2: 构建失败

**清理并重新构建**:

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 构建
npm run build
```

#### Q3: 环境变量未生效

**确认文件命名**:
- 开发环境: `.env.development`
- 生产环境: `.env.production`

**重启开发服务器**:
```bash
# 停止（Ctrl+C）
# 重新启动
npm start
```

### 开发工具问题

#### Q1: VS Code 调试配置

**创建 `.vscode/launch.json`**:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

#### Q2: Git 提交后文件权限变化

```bash
# 配置 Git 忽略文件权限变化
git config core.fileMode false

# 或全局配置
git config --global core.fileMode false
```

---

## 性能优化建议

### 后端优化

```bash
# 使用生产 Profile
./gradlew bootRun --args='--spring.profiles.active=prod'

# 调整 JVM 参数
java -Xmx2g -Xms1g -XX:+UseG1GC -jar app.jar

# 启用数据库连接池
# 在 application.yml 中配置 HikariCP
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
```

### 前端优化

```bash
# 分析构建产物
npm run build -- --profile

# 启用代码分割
# React.lazy() 和 Suspense

# 使用 CDN 加速静态资源
```

---

## 安全建议

### 后端安全

1. **环境变量管理**:
   - 不要将 `.env` 文件提交到 Git
   - 使用强密码作为 JWT 密钥
   - 定期更换密钥

2. **CORS 配置**:
   - 生产环境限制允许的域名
   - 不要使用 `allowedOrigins("*")`

3. **数据库备份**:
   ```bash
   # 定期备份
   pg_dump -U alfred_user alfred_db > backup_$(date +%Y%m%d).sql
   ```

### 前端安全

1. **API 密钥保护**:
   - 不要在前端代码中硬编码敏感信息
   - 使用环境变量管理配置

2. **HTTPS**:
   - 生产环境必须使用 HTTPS
   - 配置 SSL 证书（Let's Encrypt 免费）

---

## 监控和日志

### 后端日志

```bash
# 查看应用日志
tail -f logs/alfred.log

# 或使用 journalctl（systemd 服务）
sudo journalctl -u alfred-backend -f

# 日志级别配置
# 在 application.yml 中配置
logging:
  level:
    com.colafan.alfred: DEBUG
    org.springframework.web: INFO
```

### 前端日志

```bash
# Web 版本 - 浏览器开发者工具 Console
# 使用 React DevTools 扩展
```

---

## 备份和恢复

### 数据备份

```bash
# 备份数据库
pg_dump -U alfred_user alfred_db > backups/alfred_$(date +%Y%m%d).sql

# 备份配置文件
cp .env backups/.env.backup

# 完整备份
tar -czf backups/alfred_full_$(date +%Y%m%d).tar.gz backend/
```

### 数据恢复

```bash
# 恢复数据库
psql -U alfred_user alfred_db < backups/alfred_20260209.sql

# 恢复配置
cp backups/.env.backup .env
```

---

## 更新和维护

### 后端更新

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
./gradlew build

# 重启服务
sudo systemctl restart alfred-backend  # Linux
```

### 前端更新

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
npm install

# 重新构建
npm run build

# 部署到服务器
rsync -avz build/ user@server:/var/www/alfred/
```

---

## 联系和支持

- **文档**: `/docs` 目录
- **问题反馈**: GitHub Issues
- **API 文档**: http://localhost:8080/swagger-ui.html

---

**最后更新**: 2026-02-09
**文档维护**: 开发团队
**技术栈**: Spring Boot (Kotlin) + React (TypeScript)
