# Alfred CI/CD 配置指南

## 概述

基于 Gitee Go 的持续集成与部署方案，实现自动化测试和部署。

## 架构设计

```
Gitee 代码仓库
  ↓ push (main分支)
  ↓
Gitee Go (CI)
  ↓ 运行测试
  ↓ SSH到服务器
  ↓
服务器部署
  - git pull
  - 构建 Docker 镜像
  - 重启容器
```

## 特性

- ✅ **自动部署**：推送到 main 分支自动触发部署
- ✅ **手动触发**：其他分支可手动触发部署
- ✅ **测试验证**：main 分支自动运行测试
- ✅ **本地构建**：在服务器上构建，无需镜像仓库
- ✅ **独立部署**：前后端可独立部署

## 配置步骤

### 1. Gitee Go 配置

#### 1.1 开启 Gitee Go

1. 进入 Gitee 仓库
2. 点击「管理」→「Gitee Go」
3. 开启 Gitee Go 功能

#### 1.2 配置环境变量

在「Gitee Go」→「环境变量」中添加以下变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `SSH_HOST` | 服务器IP或域名 | `123.58.210.128` |
| `SSH_USER` | SSH用户名 | `root` |
| `SSH_KEY` | SSH私钥 | `(完整的私钥内容)` |
| `PROJECT_PATH` | 服务器上项目路径 | `/root/alfred` |

**注意：**
- `SSH_KEY` 需要包含完整的私钥内容（包括 `-----BEGIN...` 和 `-----END...`）
- 私钥应对应服务器上的公钥（`~/.ssh/authorized_keys`）

#### 1.3 配置 SSH 访问

**方式1：使用现有密钥对**

```bash
# 在本地生成密钥（如果还没有）
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器
ssh-copy-id root@YOUR_SERVER_IP

# 复制私钥内容（用于配置 SSH_KEY 变量）
cat ~/.ssh/id_rsa
```

**方式2：在服务器上生成**

```bash
# 在服务器上生成密钥对
ssh-keygen -t rsa -b 4096

# 将公钥添加到 authorized_keys
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys

# 复制私钥内容（用于配置 SSH_KEY 变量）
cat ~/.ssh/id_rsa
```

### 2. 服务器准备

#### 2.1 克隆代码到服务器

```bash
# 在服务器上执行
cd /root
git clone https://gitee.com/YOUR_USERNAME/alfred.git
cd alfred

# 安装依赖（首次）
cd backend && ./gradlew build
cd ../frontend && npm install
```

#### 2.2 配置部署脚本

```bash
# 添加执行权限
chmod +x /root/alfred/deploy.sh
```

#### 2.3 初始化部署

```bash
# 首次部署使用 setup.sh
cd /root/alfred
./setup.sh

# 或使用 deploy.sh
./deploy.sh
```

### 3. Gitee Go Pipeline 配置

配置文件已创建：`.gitee/pipelines/config.yml`

**触发规则：**

- **自动触发**：推送到 `main` 分支
  - 运行测试
  - 自动部署到生产环境

- **手动触发**：其他分支
  - 在 Gitee Go 页面手动点击「运行」
  - 可选择是否部署

## 使用方式

### 方式1：自动部署（推荐）

```bash
# 本地开发完成后
git add .
git commit -m "feat: 新增功能"
git push origin main
# ✅ 自动触发测试和部署
```

### 方式2：手动部署

#### 2.1 在 Gitee Go 界面手动触发

1. 进入仓库 →「Gitee Go」
2. 选择分支
3. 点击「运行」

#### 2.2 在服务器上直接部署

```bash
# SSH 到服务器
ssh root@YOUR_SERVER

# 部署最新代码
cd /root/alfred
./deploy.sh

# 选择部署目标
# 1. 仅后端
# 2. 仅前端
# 3. 前后端一起
```

### 方式3：手动部署特定分支

```bash
# 在服务器上部署特定分支
cd /root/alfred
./deploy.sh develop  # 部署 develop 分支
```

## 部署流程说明

### 后端部署流程

1. ✅ 拉取最新代码
2. ✅ 构建 Docker 镜像
3. ✅ 停止旧容器
4. ✅ 启动新容器
5. ✅ 验证容器状态

### 前端部署流程

1. ✅ 拉取最新代码
2. ✅ 安装依赖 (`npm install`)
3. ✅ 构建静态资源 (`npm run build`)
4. ✅ 复制到部署目录
5. ✅ 构建 Docker 镜像
6. ✅ 停止旧容器
7. ✅ 启动新容器
8. ✅ 验证容器状态

## 监控和日志

### 查看 Gitee Go 日志

1. 仓库 →「Gitee Go」
2. 选择具体的运行记录
3. 查看各个步骤的日志

### 查看服务器日志

```bash
# 查看容器状态
docker ps | grep alfred

# 查看后端日志
docker logs -f alfred-backend

# 查看前端日志
docker logs -f alfred-frontend

# 查看部署日志
tail -f /root/alfred/backend/deploy/logs/*.log
tail -f /root/alfred/frontend/deploy/logs/*.log
```

## 故障排查

### 问题1：SSH连接失败

**症状：**
```
Permission denied (publickey)
```

**解决：**
1. 检查 `SSH_KEY` 变量配置是否正确
2. 确认私钥格式完整（包括 BEGIN 和 END 行）
3. 验证服务器 `~/.ssh/authorized_keys` 包含对应公钥

### 问题2：部署失败但本地正常

**检查步骤：**
```bash
# 在服务器上手动执行
cd /root/alfred
git status
git log -1
./deploy.sh
```

### 问题3：容器启动失败

```bash
# 查看容器日志
docker logs alfred-backend
docker logs alfred-frontend

# 检查网络
docker network ls | grep alfred

# 重新运行 setup.sh
cd /root/alfred/backend/deploy
./setup.sh
```

## 最佳实践

### 分支策略

- `main` - 生产环境，自动部署
- `develop` - 开发环境，手动部署
- `feature/*` - 功能分支，不触发部署

### 提交信息规范

```
feat: 新增功能
fix: 修复bug
docs: 文档更新
refactor: 代码重构
test: 测试相关
chore: 构建/工具链相关
```

### 测试要求

- 推送到 `main` 前确保测试通过
- 重要功能需要编写测试
- 避免直接推送到 `main`，使用 Pull Request

## 回滚策略

### 方式1：Git 回滚

```bash
# 在服务器上
cd /root/alfred
git log --oneline -10  # 查看最近提交
git reset --hard <commit-hash>  # 回滚到指定提交
./deploy.sh
```

### 方式2：重新构建旧版本

```bash
# 在 Gitee Go 手动运行旧分支
# 或在服务器上
cd /root/alfred
git checkout <tag-or-branch>
./deploy.sh
```

## 维护建议

1. **定期清理**：删除未使用的 Docker 镜像和容器
2. **监控空间**：确保服务器有足够磁盘空间
3. **备份配置**：定期备份 `deploy/config/` 目录
4. **更新密钥**：定期更换 SSH 密钥
5. **日志轮转**：配置日志自动清理

## 相关文档

- [部署指南](./DEPLOYMENT.md)
- [测试清单](./TESTING_CHECKLIST.md)
- [项目架构](./docs/architecture/overview.md)
