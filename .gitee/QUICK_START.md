# Gitee Go 配置快速指南

## 📋 你需要完成的 4 个步骤

### 步骤 1️⃣：开启 Gitee Go（网页操作）

1. 访问：https://gitee.com/castor/alfred
2. 点击「管理」→「Gitee Go」
3. 点击「开启 Gitee Go」

---

### 步骤 2️⃣：配置 SSH 密钥（本地终端）

```bash
# A. 生成密钥
ssh-keygen -t rsa -b 4096

# B. 复制公钥到服务器
ssh-copy-id root@123.58.210.128

# C. 验证连接
ssh root@123.58.210.128 "echo 'SSH连接成功'"
```

---

### 步骤 3️⃣：配置环境变量（网页操作）

在 Gitee → 仓库 → 管理 → Gitee Go → 环境变量

添加 4 个变量：

| 变量名 | 值 |
|--------|-----|
| `SSH_HOST` | `123.58.210.128` |
| `SSH_USER` | `root` |
| `SSH_KEY` | 见下面获取 |
| `PROJECT_PATH` | `/root/alfred` |

**获取 SSH_KEY：**
```bash
# 在本地终端执行，复制全部内容
cat ~/.ssh/id_rsa
```

---

### 步骤 4️⃣：初始化服务器（SSH 到服务器）

```bash
# A. 连接服务器
ssh root@123.58.210.128

# B. 克隆代码
cd /root
git clone https://gitee.com/castor/alfred.git
cd alfred

# C. 运行部署
chmod +x setup.sh
./setup.sh

# 选择：
# - 3 (前后端一起)
# - 端口：默认
# - 数据库：110.42.222.64:35432
# - HTTPS：启用，域名 colafans.cn
```

---

## ✅ 完成后测试

```bash
# 在本地
git push origin master
# ✅ 自动触发部署！
```

---

**需要帮助？** 查看详细文档：`docs/GITEE_GO_SETUP.md`
