# 开发和部署指南

## 1. 项目概述

ColaFit 是一个个人健身追踪应用，用于记录体重、分析骑行 FIT 文件并提供 AI 洞察。

## 2. 开发环境设置

### 2.1 系统要求

#### 2.1.1 后端开发
- **操作系统**: Linux, macOS, Windows
- **Python**: 3.8+
- **虚拟环境**: venv 或 conda

#### 2.1.2 前端开发
- **操作系统**: Linux, macOS, Windows
- **Flutter SDK**: 3.0+
- **Dart SDK**: 3.0+
- **IDE**: Android Studio 或 VS Code

### 2.2 依赖安装

#### 2.2.1 后端依赖

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Linux/macOS
source .venv/bin/activate
# Windows
.venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

#### 2.2.2 前端依赖

```bash
# 进入前端目录
cd frontend

# 安装 Flutter 依赖
flutter pub get

# 检查 Flutter 环境
flutter doctor
```

## 3. 开发流程

### 3.1 后端开发

#### 3.1.1 启动开发服务器

```bash
cd backend

# 激活虚拟环境（如果未激活）
source .venv/bin/activate

# 启动 FastAPI 开发服务器
uvicorn app.main:app --reload

# 服务器将在 http://localhost:8000 运行
```

#### 3.1.2 API 文档

启动服务器后，可以访问以下地址查看 API 文档：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

#### 3.1.3 代码规范

- 使用 PEP 8 代码风格
- 运行 `flake8` 检查代码质量
- 运行 `black` 格式化代码

### 3.2 前端开发

#### 3.2.1 启动开发应用

```bash
cd frontend

# 启动 Flutter 开发应用
flutter run

# 或指定平台
flutter run -d chrome  # Web
flutter run -d android  # Android
flutter run -d ios  # iOS
```

#### 3.2.2 代码规范

- 遵循 Dart 官方代码风格
- 运行 `flutter analyze` 检查代码质量
- 运行 `flutter format` 格式化代码

#### 3.2.3 热重载

Flutter 支持热重载，修改代码后按下 `r` 键即可重新加载应用，按下 `R` 键可进行热重启。

## 4. 数据库设置

### 4.1 SQLite 数据库

ColaFit 默认使用 SQLite 数据库，数据库文件将自动创建在 `backend/data/` 目录下。

### 4.2 数据库迁移

目前项目使用 SQLAlchemy 自动创建表结构，无需手动迁移。

### 4.3 测试数据

可以通过 API 或直接操作数据库添加测试数据。

## 5. 测试指南

### 5.1 后端测试

#### 5.1.1 运行单元测试

```bash
cd backend

# 激活虚拟环境
source .venv/bin/activate

# 运行测试
pytest
```

#### 5.1.2 API 测试

可以使用以下工具测试 API：
- **Postman**: 可视化 API 测试工具
- **curl**: 命令行工具
- **Swagger UI**: http://localhost:8000/docs

### 5.2 前端测试

#### 5.2.1 运行单元测试

```bash
cd frontend

# 运行 Flutter 测试
flutter test
```

#### 5.2.2 集成测试

```bash
cd frontend

# 运行集成测试
flutter drive --target=test_driver/integration_test.dart
```

#### 5.2.3 UI 测试

```bash
cd frontend

# 运行 UI 测试
flutter test integration_test
```

## 6. 部署指南

### 6.1 后端部署

#### 6.1.1 生产环境依赖

```bash
cd backend

# 安装生产依赖
pip install -r requirements.txt
```

#### 6.1.2 使用 Gunicorn 部署

```bash
cd backend

# 激活虚拟环境
source .venv/bin/activate

# 启动 Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

#### 6.1.3 使用 Docker 部署

1. 创建 `Dockerfile`：

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. 构建并运行 Docker 容器：

```bash
cd backend

docker build -t colafit-backend .
docker run -d -p 8000:8000 colafit-backend
```

### 6.2 前端部署

#### 6.2.1 构建 Web 应用

```bash
cd frontend

# 构建 Web 应用
flutter build web

# 构建产物将位于 build/web/ 目录
```

#### 6.2.2 构建移动应用

```bash
# 构建 Android APK
flutter build apk

# 构建 iOS IPA
flutter build ios
```

#### 6.2.3 部署到服务器

1. 将构建产物上传到服务器
2. 使用 Nginx 或 Apache 配置静态文件服务
3. 配置反向代理（如果需要）

### 6.3 环境变量配置

#### 6.3.1 后端环境变量

在 `backend/app/core/config.py` 中配置：

```python
# 高德地图 API 密钥
AMAP_API_KEY = "your_amap_api_key"
AMAP_API_SECRET = "your_amap_api_secret"

# OpenAI API 密钥
OPENAI_API_KEY = "your_openai_api_key"

# JWT 密钥
SECRET_KEY = "your_jwt_secret_key"
```

#### 6.3.2 前端环境变量

在 `frontend/lib/config/app_config.dart` 中配置：

```dart
// API 服务器配置
static const String _baseUrl = 'http://localhost:8000';

// 生产环境地址
static const String _productionBaseUrl = 'http://YOUR_BACKEND_SERVER:8000';

// 是否为生产环境
static const bool _isProduction = true;
```

## 7. CI/CD 流程

### 7.1 持续集成

建议使用以下工具设置 CI 流程：
- **GitHub Actions**
- **GitLab CI**
- **Jenkins**

### 7.2 CI 流程示例

1. 代码提交到 GitHub
2. GitHub Actions 自动运行测试
3. 如果测试通过，自动构建应用
4. 部署到测试环境

### 7.3 持续部署

对于生产环境，建议使用手动触发的 CD 流程：
1. 代码合并到主分支
2. 运行完整测试套件
3. 手动审核
4. 部署到生产环境

## 8. 监控与日志

### 8.1 后端监控

- 使用 `prometheus` 和 `grafana` 监控服务器性能
- 使用 `sentry` 监控错误

### 8.2 日志管理

- 后端日志默认输出到控制台
- 可以配置日志文件
- 建议使用 `ELK Stack` 或 `Loki` 集中管理日志

### 8.3 健康检查

可以通过以下端点检查服务健康状态：
- http://localhost:8000/health

## 9. 常见问题解答

### 9.1 后端问题

#### 9.1.1 端口被占用

**问题**: 启动服务器时提示端口 8000 已被占用

**解决方案**: 
1. 查找占用端口的进程：
   ```bash
   lsof -i :8000  # macOS/Linux
   netstat -ano | findstr :8000  # Windows
   ```

2. 杀死占用端口的进程：
   ```bash
   kill -9 PID  # macOS/Linux
   taskkill /PID PID /F  # Windows
   ```

3. 或使用其他端口：
   ```bash
   uvicorn app.main:app --reload --port 8001
   ```

#### 9.1.2 依赖冲突

**问题**: 安装依赖时出现版本冲突

**解决方案**: 
1. 使用虚拟环境隔离依赖
2. 更新依赖版本：
   ```bash
   pip install --upgrade package_name
   ```
3. 或使用 `requirements.txt` 中指定的版本

### 9.2 前端问题

#### 9.2.1 Flutter 构建失败

**问题**: 构建 Flutter 应用时失败

**解决方案**: 
1. 运行 `flutter doctor` 检查环境
2. 清理构建缓存：
   ```bash
   flutter clean
   ```
3. 重新获取依赖：
   ```bash
   flutter pub get
   ```

#### 9.2.2 WebView 不工作

**问题**: WebView 组件在某些平台上不工作

**解决方案**: 
1. 检查 `webview_flutter` 版本
2. 查看控制台日志获取详细错误信息
3. 确保已添加必要的权限

### 9.3 数据库问题

#### 9.3.1 数据库连接失败

**问题**: 无法连接到 SQLite 数据库

**解决方案**: 
1. 检查数据库文件路径是否正确
2. 确保应用有读写数据库文件的权限
3. 重新创建数据库文件

## 10. 开发最佳实践

### 10.1 代码组织

- 遵循项目现有的目录结构
- 每个文件只包含一个主要功能
- 保持代码简洁，避免重复

### 10.2 测试

- 为所有新功能编写测试
- 定期运行测试套件
- 使用测试覆盖率工具检查测试覆盖情况

### 10.3 文档

- 为所有公共 API 编写文档
- 为复杂功能编写详细文档
- 保持文档与代码同步

### 10.4 安全

- 不将敏感信息硬编码到代码中
- 使用环境变量存储配置
- 定期更新依赖，修复安全漏洞

## 11. 协作指南

### 11.1 Git 工作流程

1. Fork 仓库
2. 创建功能分支：
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. 提交代码：
   ```bash
   git add .
   git commit -m "Add your feature"
   ```
4. 推送分支：
   ```bash
   git push origin feature/your-feature-name
   ```
5. 创建 Pull Request

### 11.2 代码审查

- 所有代码变更都需要经过审查
- 审查者应检查代码质量、功能完整性和安全性
- 至少需要一个批准才能合并代码

### 11.3 版本管理

- 使用语义化版本控制
- 定期发布新版本
- 维护 CHANGELOG.md

## 12. 总结

本指南提供了 ColaFit 项目的开发和部署流程，帮助开发者快速上手项目。遵循这些指南可以确保项目的质量和可维护性。

如果遇到问题，请参考常见问题解答或在项目仓库中提交 Issue。