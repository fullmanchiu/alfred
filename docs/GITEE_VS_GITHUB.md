# Gitee Go vs GitHub Actions 对比

## 当前选择：Gitee Go ✅

我们当前使用 Gitee Go，基于以下考虑：

| 特性 | Gitee Go | GitHub Actions |
|------|----------|----------------|
| 国内访问 | ⭐⭐⭐⭐⭐ 快速 | ⭐⭐ 需要代理 |
| 配置复杂度 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 简单 |
| 免费额度 | ⭐⭐⭐⭐ 1000分钟/月 | ⭐⭐⭐⭐⭐ 2000分钟/月 |
| 生态集成 | ⭐⭐⭐ Gitee自家 | ⭐⭐⭐⭐⭐ 丰富 |
| 文档质量 | ⭐⭐⭐ 中文 | ⭐⭐⭐⭐⭐ 完善 |

## 如果切换到 GitHub Actions

### 配置文件示例

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup JDK
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Build Backend
        run: |
          cd backend
          ./gradlew test
          ./gradlew build

      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /root/alfred
            git pull origin main
            cd backend/deploy
            docker build -t alfred-backend:latest .
            docker-compose up -d

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Build Frontend
        run: |
          cd frontend
          npm install
          npm run build

      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /root/alfred
            git pull origin main
            cd frontend
            npm install
            npm run build
            rm -rf deploy/web/*
            cp -r dist/* deploy/web/
            cd deploy
            docker build -t alfred-frontend:latest .
            docker-compose up -d
```

### 切换步骤

1. **创建 GitHub 仓库**
   ```bash
   # 添加 GitHub remote
   git remote add github https://github.com/YOUR_NAME/alfred.git
   ```

2. **配置 Secrets**
   - Settings → Secrets and variables → Actions
   - 添加：`SSH_HOST`, `SSH_USER`, `SSH_KEY`

3. **推送代码**
   ```bash
   git push github main
   ```

4. **启用 Actions**
   - GitHub 会自动检测并运行 workflow

## 迁移建议

### 保持双仓库同步

```bash
# 同时推送到 Gitee 和 GitHub
git remote set-url --add --push origin https://gitee.com/YOUR/alfred.git
git remote set-url --add --push origin https://github.com/YOUR/alfred.git

# 一次推送，两个仓库
git push origin main
```

### CI/CD 选择

- **国内团队** → Gitee Go（当前方案）
- **国际化团队** → GitHub Actions
- **同时使用** → Gitee 用于国内部署，GitHub 用于国际发布

## 总结

当前使用 **Gitee Go** 是最佳选择：
- ✅ 团队在国内
- ✅ 服务器在国内
- ✅ 访问速度快
- ✅ 配置已就绪

如果未来需要国际化，可以考虑：
- 保留 Gitee Go 用于国内
- 新增 GitHub Actions 用于海外
