# Python 微服务首次 Setup 指南

## 🚀 首次部署（只需执行一次）

### 1. 拉取最新代码

```bash
cd /root/alfred
git pull origin master
```

### 2. 构建 Python 服务基础镜像

```bash
cd /root/alfred/stock-analysis-service/deploy

# 构建基础镜像（包含 TA-Lib 和所有 Python 依赖）
# 注意：这一步需要 5-10 分钟，因为要编译 TA-Lib
docker build -t alfred-stock-service:latest .
```

**验证镜像构建成功**：
```bash
docker images | grep alfred-stock-service
# 应该看到：alfred-stock-service   latest   xxx   xxx MB
```

### 3. 准备代码目录（首次部署）

```bash
# 创建代码目录
mkdir -p /root/alfred/stock-analysis-service/deploy/app

# 从本地代码复制
cd /root/alfred/stock-analysis-service
cp -r api modules prompts main.py requirements.txt deploy/app/
```

### 4. 配置环境变量

```bash
cd /root/alfred/stock-analysis-service/deploy/config

# 复制配置文件
cp .env.example .env

# 编辑配置，添加 LLM 配置
nano .env
```

**配置内容**（用于股票 AI 分析）：
```bash
# LLM 配置（独立于 Spring Boot）
LLM_PROVIDER=custom
DASHSCOPE_API_KEY=your-api-key-here
CUSTOM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
CUSTOM_MODEL=qwen-max
CUSTOM_MAX_TOKENS=3500
CUSTOM_TEMPERATURE=0.7

# 服务配置
PORT=8001
LOG_LEVEL=INFO
```

### 5. 启动服务

```bash
cd /root/alfred/stock-analysis-service/deploy

# 启动服务
docker-compose up -d

# 查看日志
docker logs -f stock-analysis-service
```

### 6. 验证服务

```bash
# 健康检查
curl http://localhost:8001/api/health

# 应该返回：
# {"status":"ok","service":"stock-analysis-service","version":"1.0.0"}

# 查看容器状态
docker ps | grep stock-analysis-service
```

---

## 🔄 后续更新（CI/CD 自动部署）

当代码推送到 master 分支后：

1. **GitHub Actions 自动构建**：
   - 后端：`app.jar`
   - 前端：`dist.tar.gz`
   - Python 服务：`stock-service.tar.gz`（代码包）

2. **Webhook 触发自动部署**：
   ```bash
   # scripts/deploy-with-stock-service.sh 自动执行：
   # 1. 下载 stock-service.tar.gz
   # 2. 解压到 deploy/app/
   # 3. 重启容器（docker restart stock-analysis-service）
   ```

3. **不需要重新构建镜像**，因为：
   - 依赖没变（TA-Lib、pandas 等）
   - 只更新了代码
   - 基础镜像可以复用

---

## 📊 新 vs 旧架构对比

| 步骤 | 旧方式（完整镜像） | 新方式（代码包） |
|------|------------------|----------------|
| CI 构建 | 构建完整镜像（5-10分钟） | 打包代码（30秒） |
| 产物大小 | 几百 MB | 几 MB |
| 部署方式 | docker load | 解压代码 |
| 镜像更新 | 每次都构建新镜像 | 一次构建，重复使用 |
| 部署速度 | 慢（传输大镜像） | 快（只传代码） |

---

## 🐛 故障排查

### 镜像构建失败

**问题**：TA-Lib 编译失败
```bash
# 解决：确保安装了编译依赖
apt-get update && apt-get install -y wget build-essential
```

### 容器启动失败

**问题**：ImportError: No module named 'talib'
```bash
# 解决：检查镜像是否正确构建
docker run --rm alfred-stock-service:latest python -c "import talib; print(talib.__version__)"
```

**问题**：启动命令找不到
```bash
# 解决：检查 main.py 是否在 app/ 目录
ls -la /root/alfred/stock-analysis-service/deploy/app/main.py
```

**问题**：LLM API 调用失败
```bash
# 解决：检查环境变量配置
docker exec stock-analysis-service env | grep LLM
docker exec stock-analysis-service env | grep DASHSCOPE
```

### 服务无响应

```bash
# 查看容器日志
docker logs stock-analysis-service

# 进入容器调试
docker exec -it stock-analysis-service bash
```

---

## ✅ 部署检查清单

- [ ] 代码已拉取到最新
- [ ] 基础镜像构建成功
- [ ] 代码已复制到 deploy/app/
- [ ] LLM 环境变量已配置（LLM_PROVIDER、DASHSCOPE_API_KEY 等）
- [ ] 容器已启动
- [ ] 健康检查通过
- [ ] 日志无错误
