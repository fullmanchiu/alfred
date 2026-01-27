# Alfred CI/CD 快速开始

## 📋 前置条件

- ✅ Gitee 仓库已创建
- ✅ 服务器可SSH访问
- ✅ Docker已安装

## 🚀 快速配置（3步）

### 1️⃣ 配置 SSH 密钥

```bash
# 生成密钥（如果还没有）
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器
ssh-copy-id root@YOUR_SERVER_IP

# 查看私钥（复制内容）
cat ~/.ssh/id_rsa
```

### 2️⃣ Gitee Go 配置

1. 仓库 → 管理 → Gitee Go → 开启
2. 配置环境变量：

| 变量名 | 值 |
|--------|-----|
| `SSH_HOST` | `123.58.210.128` |
| `SSH_USER` | `root` |
| `SSH_KEY` | `(上面复制的私钥内容)` |
| `PROJECT_PATH` | `/root/alfred` |

### 3️⃣ 服务器初始化

```bash
# 克隆代码
ssh root@YOUR_SERVER
cd /root
git clone https://gitee.com/YOUR_NAME/alfred.git
cd alfred

# 首次部署
./setup.sh
```

## ✨ 使用

### 自动部署（推荐）

```bash
git add .
git commit -m "feat: 新功能"
git push origin main
# ✅ 自动测试 + 自动部署
```

### 手动部署

**方式A：Gitee Go 界面**
- 仓库 → Gitee Go → 选择分支 → 点击「运行」

**方式B：服务器直接部署**
```bash
ssh root@SERVER
cd /root/alfred
./deploy.sh
```

## 📚 详细文档

[完整配置指南](../docs/CI_CD_GUIDE.md)

## 🔍 监控

**Gitee Go：** 仓库 → Gitee Go → 查看运行日志

**服务器日志：**
```bash
docker logs -f alfred-backend
docker logs -f alfred-frontend
```

## ⚠️ 注意事项

1. 推送到 `main` 分支会自动部署到生产环境
2. 确保测试通过后再推送
3. 重要功能建议先手动部署测试
4. 定期备份配置文件

## 🆘 故障排查

**SSH失败？** → 检查 `SSH_KEY` 变量配置

**容器启动失败？** → `docker logs alfred-backend`

**需要回滚？** → `git reset --hard <commit> && ./deploy.sh`

[完整故障排查](../docs/CI_CD_GUIDE.md#故障排查)
