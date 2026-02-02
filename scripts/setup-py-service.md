# Python 微服务部署指南

## 🚀 首次部署（只需执行一次）

### 1. 拉取最新代码

```bash
cd /root/alfred
git pull origin master
```

### 2. 运行 Setup 脚本（推荐）

```bash
./setup.sh
# 选择选项 3 或 4（全部部署）
```

Setup 脚本会自动：
- 创建必要的目录结构
- 设置正确的目录权限（UID 57439）
- 构建 Docker 镜像
- 启动容器

### 3. 手动部署（如需自定义）

如果需要手动控制部署过程：

```bash
cd /root/alfred/py-service/deploy

# 创建目录结构
mkdir -p app config data logs

# 设置权限（容器以 mambauser 运行，UID 57439）
sudo chown -R 57439:57439 app

# 构建 Docker 镜像
docker build -t alfred-py-service:latest .

# 启动容器
docker-compose up -d
```

---

## 🔄 后续更新（CI/CD 自动部署）

当代码推送到 master 分支后：

1. **GitHub Actions 自动构建**：
   - 后端：`app.jar`
   - 前端：`dist.tar.gz`
   - Python 服务：`py-service.tar.gz`（代码包）

2. **Webhook 触发自动部署**：
   ```bash
   # scripts/deploy-with-py-service.sh 自动执行：
   # 1. 下载 py-service.tar.gz
   # 2. 解压到 deploy/app/
   # 3. 重启容器（docker restart py-service）
   ```

3. **不需要重新构建镜像**，因为：
   - 依赖已通过 environment.yml 管理
   - 容器启动时动态安装依赖
   - 代码通过挂载载入，更新无需重新构建镜像

---

## 📦 依赖管理策略

**混合方案**：
- **ta-lib**：使用 mamba 安装（需要 C 库）
- **其他包**：使用 pip 安装（fast 5 倍）

**environment.yml** 配置：
```yaml
dependencies:
  - python=3.13
  - pip
  - ta-lib           # conda 安装
  - pip:
      - fastapi      # pip 安装
      - uvicorn
      - pandas
      - plotly
      # ... 其他包
```

**为什么这样设计**：
- mamba 安装 ta-lib：自动处理 C 库依赖
- pip 安装其他包：安装速度快（38秒 vs 202秒）
- 容器启动时安装：一次构建，重复使用

---

## 🔧 健康检查

```bash
# 查看容器状态
docker ps | grep py-service

# 健康检查（根路径）
curl http://localhost:8001/
# 返回：{"service":"Stock Analysis Microservice","version":"1.0.0","status":"running"}

# API 文档
curl http://localhost:8001/docs

# 查看日志
docker logs py-service -f

# 进入容器调试
docker exec -it py-service bash
```

---

## 🐛 故障排查

### 容器启动失败

**问题**：Permission denied
```bash
# 解决：设置正确的目录权限
sudo chown -R 57439:57439 /root/alfred/py-service/deploy/app
docker-compose restart
```

**问题**：ImportError: No module named 'xxx'
```bash
# 解决：检查 environment.yml 是否包含该包
cat /root/alfred/py-service/deploy/app/environment.yml

# 查看已安装的包
docker exec py-service micromamba list
```

**问题**：健康检查失败
```bash
# 解决：检查服务是否正常启动
curl http://localhost:8001/

# 查看详细日志
docker logs py-service --tail 100
```

### 依赖安装慢

**问题**：mamba/pip 安装很慢
```bash
# 解决：已配置清华镜像源，检查是否生效
docker exec py-service micromamba config list channels

# 应该看到 mirrors.tuna.tsinghua.edu.cn
```

---

## ✅ 部署检查清单

- [ ] 代码已拉取到最新
- [ ] 目录权限已设置（57439:57439）
- [ ] environment.yml 包含所有依赖
- - ta-lib 用 mamba
- - 其他包用 pip
- [ ] 容器已启动
- [ ] 健康检查通过
- [ ] 日志无错误

---

## 📊 服务状态监控

**后端系统健康 API**：
```bash
# 获取所有服务状态
curl http://localhost:8080/api/v1/system/health

# 返回：
{
  "status": "healthy",
  "timestamp": 1234567890,
  "services": [
    {
      "name": "backend",
      "status": "healthy",
      "url": "http://localhost:8080/actuator/health"
    },
    {
      "name": "py-service",
      "status": "healthy",
      "url": "http://localhost:8001/"
    },
    {
      "name": "frontend",
      "status": "healthy",
      "url": "http://localhost:3000/"
    }
  ]
}
```

前端设置页面将展示这些服务的实时状态。
