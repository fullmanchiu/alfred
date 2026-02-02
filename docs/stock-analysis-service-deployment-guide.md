# 股票分析微服务部署更新指南

**日期**: 2026-01-29
**目标**: 更新服务器上的部署脚本和 webhook 服务器以支持股票分析微服务

---

## 📋 需要更新的文件

### 1. 部署脚本

**位置**: `/root/alfred/deploy.sh`

**操作**:
```bash
# 备份旧脚本
cp /root/alfred/deploy.sh /root/alfred/deploy.sh.backup

# 复制新脚本（从本地）
# 在 alfred 项目根目录执行：
scp scripts/deploy-with-stock-service.sh root@123.58.210.128:/root/alfred/deploy.sh

# 设置执行权限
ssh root@123.58.210.128 "chmod +x /root/alfred/deploy.sh"
```

**主要变更**:
- 新增第 4 个参数：`stock_service_url`
- 新增 Python 服务 Docker 镜像加载逻辑
- 新增容器启动和健康检查逻辑

---

### 2. Webhook 服务器

**位置**: `/root/webhook/webhook-server.py`

**操作**:
```bash
# 备份旧脚本
cp /root/webhook/webhook-server.py /root/webhook/webhook-server.py.backup

# 复制新脚本
# 在 alfred 项目根目录执行：
scp scripts/webhook-server-updated.py root@123.58.210.128:/root/webhook/webhook-server.py

# 重启 webhook 服务
ssh root@123.58.210.128 "systemctl restart alfred-webhook"

# 检查状态
ssh root@123.58.210.128 "systemctl status alfred-webhook"
```

**主要变更**:
- 处理 webhook 中的 `stockService` 字段
- 将第 4 个参数（stock_service_url）传递给部署脚本
- 版本号更新为 2.0.0

---

### 3. Docker 网络

**确保所有服务在同一 Docker 网络中**:

```bash
# 创建 alfred-network（如果不存在）
ssh root@123.58.210.128 "docker network create alfred-network || true"

# 将现有容器连接到网络（如果尚未连接）
ssh root@123.58.210.128 << 'EOF'
docker network connect alfred-network alfred-backend 2>/dev/null || true
docker network connect alfred-network alfred-frontend 2>/dev/null || true
EOF
```

---

### 4. 环境变量配置

**为 Python 服务配置 OpenAI API Key**:

编辑 webhook 服务的 systemd 配置：
```bash
ssh root@123.58.210.128
vi /etc/systemd/system/alfred-webhook.service
```

添加环境变量：
```ini
[Service]
...
Environment="OPENAI_API_KEY=your-actual-api-key-here"
Environment="OPENAI_BASE_URL=https://api.openai.com/v1"
...
```

重启服务：
```bash
systemctl daemon-reload
systemctl restart alfred-webhook
```

---

## 🧪 测试部署

### 手动测试部署脚本

```bash
# SSH 到服务器
ssh root@123.58.210.128

# 手动触发部署（使用测试 URL）
/root/alfred/deploy.sh \
  "test-1.0.0" \
  "https://github.com/fullmanchiu/alfred/releases/download/v1.0.0-abc123/app.jar" \
  "https://github.com/fullmanchiu/alfred/releases/download/v1.0.0-abc123/dist.tar.gz" \
  "https://github.com/fullmanchiu/alfred/releases/download/v1.0.0-abc123/stock-service.tar.gz"
```

### 检查服务状态

```bash
# 检查所有容器
docker ps

# 检查网络
docker network inspect alfred-network

# 检查 Python 服务日志
docker logs stock-analysis-service

# 测试 Python 服务健康检查
curl http://localhost:8001/api/health
```

---

## 📊 验收标准

- [ ] 部署脚本已更新并包含 Python 服务部署逻辑
- [ ] Webhook 服务器已更新并能处理 stockService URL
- [ ] 所有服务在 alfred-network 网络中
- [ ] OpenAI API Key 已配置
- [ ] 手动测试部署成功
- [ ] 所有容器正常运行

---

## 🚨 回滚方案

如果更新后出现问题：

```bash
# 回滚部署脚本
cp /root/alfred/deploy.sh.backup /root/alfred/deploy.sh

# 回滚 webhook 服务器
cp /root/webhook/webhook-server.py.backup /root/webhook/webhook-server.py
systemctl restart alfred-webhook

# 删除 Python 服务容器（如果需要）
docker rm -f stock-analysis-service
```

---

## 📝 下一步

1. ✅ 更新本地代码（已完成）
2. ⏳ 提交代码到 GitHub
3. ⏳ 触发 CI/CD 构建
4. ⏳ 验证构建产物包含 Python 服务镜像
5. ⏳ 更新服务器上的部署脚本和 webhook 服务器
6. ⏳ 测试自动部署流程

---

**备注**: 更新完成后，每次推送到 master 分支都会自动构建和部署所有三个服务（后端、前端、Python 服务）。
