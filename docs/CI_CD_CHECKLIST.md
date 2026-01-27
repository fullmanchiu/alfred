# CI/CD 配置检查清单

## ✅ Gitee 配置检查

### 仓库配置
- [ ] 代码已推送到 Gitee
- [ ] `.gitee/pipelines/config.yml` 文件存在
- [ ] Gitee Go 功能已开启

### 环境变量配置
- [ ] `SSH_HOST` 已配置（服务器IP）
- [ ] `SSH_USER` 已配置（root）
- [ ] `SSH_KEY` 已配置（完整私钥）
- [ ] `PROJECT_PATH` 已配置（/root/alfred）

### 密钥验证
```bash
# 本地测试SSH连接
ssh -i ~/.ssh/id_rsa root@YOUR_SERVER_IP "echo 'SSH连接成功'"

# 验证私钥格式
cat ~/.ssh/id_rsa | head -1
# 应该输出: -----BEGIN OPENSSH PRIVATE KEY-----
```

---

## ✅ 服务器配置检查

### 基础环境
- [ ] Docker 已安装 (`docker --version`)
- [ ] Docker Compose 已安装 (`docker-compose --version`)
- [ ] Git 已安装 (`git --version`)

### 项目配置
- [ ] 代码已克隆 (`ls /root/alfred`)
- [ ] 后端依赖已安装 (`cd /root/alfred/backend && ./gradlew build`)
- [ ] 前端依赖已安装 (`cd /root/alfred/frontend && npm install`)

### 部署脚本
- [ ] `setup.sh` 有执行权限
- [ ] `deploy.sh` 有执行权限
- [ ] 首次部署已完成 (`./setup.sh`)

### 容器状态
- [ ] 后端容器运行中 (`docker ps | grep alfred-backend`)
- [ ] 前端容器运行中 (`docker ps | grep alfred-frontend`)
- [ ] 网络已创建 (`docker network ls | grep alfred-network`)

---

## ✅ 本地开发配置检查

### Git 配置
- [ ] `.gitignore` 已配置（排除部署产物）
```gitignore
backend/deploy/app/
backend/deploy/config/
backend/deploy/data/
frontend/deploy/web/
frontend/deploy/logs/
```

### 测试配置
- [ ] 后端测试可运行 (`cd backend && ./gradlew test`)
- [ ] 前端测试可运行 (`cd frontend && npm test`)

---

## 🧪 测试流程

### 1. 本地测试
```bash
# 测试SSH连接
ssh root@YOUR_SERVER "cd /root/alfred && git status"

# 测试部署脚本
ssh root@YOUR_SERVER "cd /root/alfred && ./deploy.sh"
```

### 2. Gitee Go 测试
```bash
# 推送测试分支
git checkout -b test-ci
git push origin test-ci

# 在 Gitee Go 界面手动触发
# 检查运行日志
```

### 3. 自动部署测试
```bash
# 推送到 main（会自动部署）
git checkout main
git merge test-ci
git push origin main

# 观察自动部署流程
# 检查服务器状态
```

---

## 📝 配置示例

### Gitee Go 环境变量示例

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `SSH_HOST` | `123.58.210.128` | 服务器IP |
| `SSH_USER` | `root` | SSH用户名 |
| `SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----` | 完整私钥（包含换行符）|
| `PROJECT_PATH` | `/root/alfred` | 项目路径 |

### SSH 密钥格式示例

**正确格式：**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAAABmAAAAXZXLzu8g6QZAf
...(很多行)...
-----END OPENSSH PRIVATE KEY-----
```

**注意：**
- ✅ 包含 BEGIN 和 END 行
- ✅ 包含所有中间内容
- ✅ 保持换行符

---

## 🚨 常见问题排查

### 问题1：SSH连接失败
```
Permission denied (publickey)
```

**检查项：**
1. [ ] SSH_KEY 变量是否包含完整私钥
2. [ ] 服务器 `~/.ssh/authorized_keys` 是否包含对应公钥
3. [ ] 私钥权限是否正确（chmod 600）

**解决：**
```bash
# 重新生成密钥对
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器
ssh-copy-id root@YOUR_SERVER

# 更新 Gitee Go 变量
cat ~/.ssh/id_rsa  # 复制全部内容
```

### 问题2：容器启动失败
```
docker: Error response from daemon
```

**检查项：**
1. [ ] Docker 镜像是否构建成功
2. [ ] 网络是否存在
3. [ ] 端口是否被占用

**解决：**
```bash
# 在服务器上检查
docker ps -a
docker network ls
docker logs alfred-backend

# 手动重新部署
cd /root/alfred
./deploy.sh
```

### 问题3：构建超时
```
timeout: 1200s
```

**检查项：**
1. [ ] 网络连接速度
2. [ ] 服务器资源（CPU/内存）
3. [ ] Docker 镜像大小

**解决：**
```yaml
# 增加 timeout
timeout: 1800  # 30分钟
```

---

## 📊 监控指标

### CI/CD 成功率
- 目标：> 95%
- 监控：Gitee Go → 构建历史

### 部署时间
- 后端：5-10分钟
- 前端：3-5分钟
- 全量：10-15分钟

### 失败率
- 测试失败：< 5%
- 部署失败：< 2%

---

## 🎯 优化建议

### 短期（1-2周）
1. ✅ 完善测试覆盖率
2. ✅ 添加部署通知（钉钉/企业微信）
3. ✅ 配置自动回滚机制

### 中期（1-2月）
1. ✅ 添加性能测试
2. ✅ 实现蓝绿部署
3. ✅ 配置监控告警

### 长期（3-6月）
1. ✅ 多环境支持（dev/test/prod）
2. ✅ 自动化测试报告
3. ✅ CI/CD 流程可视化

---

## 📞 支持与反馈

- **文档**：[CI_CD_GUIDE.md](./CI_CD_GUIDE.md)
- **问题**：提交 Issue 到 Gitee
- **讨论**：Pull Request 审查中讨论

---

## ✅ 配置完成检查

完成以上所有配置后，标记：

- [ ] Gitee Go 配置完成
- [ ] 服务器环境就绪
- [ ] 首次自动部署成功
- [ ] 手动部署测试通过
- [ ] 团队成员已培训

**恭喜！🎉 CI/CD 配置完成！**
