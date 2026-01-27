# Gitee Go 配置步骤

## 第一步：开启 Gitee Go

1. 打开浏览器，访问：https://gitee.com/castor/alfred
2. 点击顶部菜单的「管理」
3. 左侧菜单找到「Gitee Go」
4. 点击「开启 Gitee Go」按钮
5. 选择「流水线」→「立即开启」

---

## 第二步：配置 SSH 密钥

### 2.1 生成密钥（本地操作）

```bash
# 在本地电脑终端执行
ssh-keygen -t rsa -b 4096

# 一路回车即可（或设置密码短语）
```

### 2.2 复制公钥到服务器

```bash
# 方式A：自动复制（推荐）
ssh-copy-id root@123.58.210.128

# 方式B：手动复制
cat ~/.ssh/id_rsa.pub | ssh root@123.58.210.128 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 2.3 验证 SSH 连接

```bash
# 测试连接
ssh root@123.58.210.128 "echo 'SSH连接成功'"

# 如果成功，会输出：SSH连接成功
```

---

## 第三步：配置 Gitee Go 环境变量

### 3.1 获取私钥内容

```bash
# 在本地执行，复制完整私钥
cat ~/.ssh/id_rsa
```

**复制格式示例：**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAAABmAAAAXZXLzu8g6QZAf
...(很多行)...
-----END OPENSSH PRIVATE KEY-----
```

**⚠️ 重要：**
- 必须包含 BEGIN 和 END 行
- 必须包含所有中间内容
- 保持换行符格式

### 3.2 在 Gitee 添加环境变量

1. 在 Gitee 仓库页面
2. 点击「管理」→「Gitee Go」
3. 点击「环境变量」标签
4. 点击「添加变量」

**添加以下 4 个变量：**

| 变量名 | 变量值 | 说明 |
|--------|--------|------|
| `SSH_HOST` | `123.58.210.128` | 服务器IP地址 |
| `SSH_USER` | `root` | SSH用户名 |
| `SSH_KEY` | `(上面复制的完整私钥)` | SSH私钥 |
| `PROJECT_PATH` | `/root/alfred` | 服务器项目路径 |

**添加方式：**
- 点击「添加变量」
- 输入变量名：`SSH_HOST`
- 输入变量值：`123.58.210.128`
- 点击「确定」

重复此步骤添加全部 4 个变量。

---

## 第四步：准备服务器环境

### 4.1 SSH 到服务器

```bash
ssh root@123.58.210.128
```

### 4.2 安装 Docker（如果还没有）

```bash
# 检查 Docker
docker --version

# 如果未安装，运行：
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
systemctl start docker
systemctl enable docker

# 配置镜像加速
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
```

### 4.3 克隆代码到服务器

```bash
# 创建项目目录
cd /root

# 克隆代码
git clone https://gitee.com/castor/alfred.git
cd alfred

# 检查文件
ls -la
```

### 4.4 初始化部署（首次）

```bash
# 给脚本添加执行权限
chmod +x setup.sh
chmod +x deploy.sh

# 运行部署脚本
./setup.sh
```

**选择：**
1. 选择 `3`（前后端一起部署）
2. 前端端口：直接回车（默认80）
3. 后端端口：直接回车（默认8000）
4. 数据库配置：输入你的数据库信息
   - IP: `110.42.222.64`
   - 端口: `35432`
   - 数据库名: `alfred`
   - 用户名: `alfred`
   - 密码: `你的密码`
5. LLM配置：选择 `n`（暂时跳过）
6. HTTPS：选择 `y`，然后输入域名 `colafans.cn`

---

## 第五步：测试 CI/CD

### 5.1 本地推送测试

```bash
# 在本地电脑执行
cd /Users/qiuliang/code/alfred

# 创建测试分支
git checkout -b test-ci

# 修改一个文件测试
echo "# 测试CI" >> README.md

# 提交
git add .
git commit -m "test: 测试CI/CD流程"
git push origin test-ci
```

### 5.2 在 Gitee Go 手动触发

1. 访问：https://gitee.com/castor/alfred
2. 点击「Gitee Go」
3. 找到 `test-ci` 分支的流水线
4. 点击「运行」按钮
5. 观察执行过程

### 5.3 检查部署结果

```bash
# SSH 到服务器
ssh root@123.58.210.128

# 查看容器状态
docker ps | grep alfred

# 查看日志
docker logs -f alfred-backend
docker logs -f alfred-frontend
```

---

## 第六步：启用自动部署

### 6.1 合并到 main

```bash
# 在本地
git checkout master
git merge test-ci
git push origin master
```

### 6.2 观察自动部署

推送到 `master` 分支后：
1. ✅ 自动触发 CI
2. ✅ 自动运行测试
3. ✅ 自动部署到服务器
4. ✅ 容器自动重启

---

## ✅ 验证清单

配置完成后，验证以下内容：

- [ ] Gitee Go 功能已开启
- [ ] 4 个环境变量已配置
- [ ] SSH 连接测试通过
- [ ] 服务器 Docker 已安装
- [ ] 代码已克隆到服务器
- [ ] 首次 setup.sh 运行成功
- [ ] 容器正常启动
- [ ] 测试分支手动部署成功
- [ ] master 分支自动部署成功

---

## 🆘 常见问题

### 问题1：SSH连接失败

```
Permission denied (publickey)
```

**解决：**
1. 确认 `SSH_KEY` 变量包含完整私钥（包括 BEGIN 和 END 行）
2. 确认服务器 `~/.ssh/authorized_keys` 包含对应公钥
3. 检查私钥权限：`chmod 600 ~/.ssh/id_rsa`

### 问题2：环境变量未生效

**解决：**
1. 确认变量名完全匹配（区分大小写）
2. 重新运行流水线
3. 检查流水线日志中的变量值

### 问题3：容器启动失败

**解决：**
```bash
# 在服务器上手动运行
cd /root/alfred
./deploy.sh

# 查看详细错误
docker logs alfred-backend
```

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Gitee Go 运行日志
2. 查看服务器日志：`docker logs -f alfred-backend`
3. 参考文档：`docs/CI_CD_GUIDE.md`
4. 提交 Issue 到 Gitee

---

## 🎉 完成后

配置完成后，你的工作流将是：

```bash
# 开发
git add .
git commit -m "feat: 新功能"
git push origin master

# ✅ 自动完成：
# 1. 运行测试
# 2. 构建镜像
# 3. 部署到服务器
# 4. 重启容器
```

简单、自动、高效！🚀
