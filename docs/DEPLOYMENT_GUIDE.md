# ColaFit 项目部署指南

> **文档版本**: v1.0
> **最后更新**: 2025-01-08
> **适用平台**: Windows, macOS, Linux

---

## 📋 目录

- [环境要求](#环境要求)
- [后端部署（Alfred）](#后端部署alfred)
- [前端部署（ColaFit）](#前端部署colafit)
- [开发环境快速启动](#开发环境快速启动)
- [生产环境部署](#生产环境部署)
- [常见问题](#常见问题)

---

## 环境要求

### 后端环境要求

| 组件 | Windows | macOS/Linux | 说明 |
|------|---------|-------------|------|
| Python | 3.8+ | 3.8+ | 必需 |
| pip | 最新版 | 最新版 | Python包管理器 |
| 虚拟环境 | venv | venv | Python虚拟环境 |

### 前端环境要求

| 组件 | Windows | macOS/Linux | 说明 |
|------|---------|-------------|------|
| Flutter SDK | 3.0+ | 3.0+ | 必需 |
| Dart SDK | 3.0+ | 3.0+ | 随Flutter安装 |
| IDE | VS Code/Android Studio | VS Code/Android Studio | 推荐 |

---

## 后端部署（Alfred）

### 步骤 1: 进入项目目录

```bash
# Windows PowerShell
cd C:\Users\lance\code\Colafans\Alfred

# macOS/Linux Terminal
cd /Users/lance/code/Colafans/Alfred
```

### 步骤 2: 检查Python版本

```bash
# Windows & macOS/Linux
python --version
# 或
python3 --version
```

**要求**: Python 3.8 或更高版本

### 步骤 3: 虚拟环境管理

#### 检查虚拟环境是否存在

```bash
# Windows
dir .venv

# macOS/Linux
ls -la .venv

# 或使用Python检查
python -c "import sys; print(sys.prefix)"
```

#### 创建虚拟环境（仅首次需要）

```bash
# Windows
python -m venv .venv

# macOS/Linux
python3 -m venv .venv

# 指定Python版本（如果有多个版本）
python3.9 -m venv .venv

# 或使用虚拟环境工具（需要先安装）
# pip install virtualenv
# virtualenv .venv
```

#### 激活虚拟环境

**Windows (Command Prompt)**:
```cmd
.venv\Scripts\activate
```

**Windows (PowerShell)**:
```powershell
.venv\Scripts\Activate.ps1

# 如果遇到执行策略错误
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Windows (Git Bash)**:
```bash
source .venv/Scripts/activate
```

**macOS/Linux**:
```bash
source .venv/bin/activate
```

**激活成功标志**: 命令行前会显示 `(.venv)`

```
(.venv) C:\Users\lance\code\Colafans\Alfred>
```

#### 验证虚拟环境

```bash
# Windows & macOS/Linux
# 检查Python路径
which python
# 或
where python

# 应该显示虚拟环境中的Python
# Windows: C:\Users\lance\code\Colafans\Alfred\.venv\Scripts\python.exe
# macOS/Linux: /Users/lance/code/Colafans/Alfred/.venv/bin/python

# 检查pip版本
pip --version

# 查看已安装的包
pip list
```

#### 退出虚拟环境

```bash
# Windows & macOS/Linux
deactivate
```

#### 删除虚拟环境

```bash
# Windows
rmdir /s /q .venv

# macOS/Linux
rm -rf .venv

# 然后重新创建（见"创建虚拟环境"部分）
```

#### 重建虚拟环境（清理并重新创建）

```bash
# Windows
# 删除旧环境
rmdir /s /q .venv
# 创建新环境
python -m venv .venv
# 激活新环境
.venv\Scripts\activate
# 安装依赖
pip install -r requirements.txt

# macOS/Linux
# 删除旧环境
rm -rf .venv
# 创建新环境
python3 -m venv .venv
# 激活新环境
source .venv/bin/activate
# 安装依赖
pip install -r requirements.txt
```

#### 导出和导入依赖

```bash
# 导出当前环境的所有依赖
pip freeze > requirements.txt

# 或只导出项目直接依赖（推荐）
pip pipenv requirements > requirements.txt

# 安装依赖文件
pip install -r requirements.txt

# 升级所有依赖到最新版本
pip list --outdated
pip install --upgrade -r requirements.txt

# 批量安装时忽略错误继续安装
pip install -r requirements.txt --no-deps
```

#### 虚拟环境目录说明

```
.venv/
├── Scripts/          # Windows - 可执行文件和脚本
│   ├── activate.ps1  # PowerShell激活脚本
│   ├── activate.bat  # CMD激活脚本
│   ├── python.exe    # Python解释器
│   ├── pip.exe       # 包管理器
│   └── ...
├── bin/              # macOS/Linux - 可执行文件和脚本
│   ├── activate      # 激活脚本
│   ├── python3       # Python解释器
│   ├── pip           # 包管理器
│   └── ...
├── include/          # C头文件
├── Lib/              # Python库
│   └── site-packages/ # 安装的包
└── pyvenv.cfg        # 虚拟环境配置
```

### 步骤 4: 安装依赖

```bash
# Windows & macOS/Linux
pip install -r requirements.txt

# 如果遇到权限问题（macOS/Linux）
pip install -r requirements.txt --user
```

### 步骤 5: 环境配置

#### 创建环境变量文件

```bash
# Windows & macOS/Linux
# 复制示例配置文件
cp .env.example .env

# 或手动创建 .env 文件
```

#### 编辑 .env 文件

**Windows (PowerShell)**:
```powershell
notepad .env
# 或使用 VS Code
code .env
```

**macOS/Linux**:
```bash
nano .env
# 或使用 VS Code
code .env
```

#### 必需配置项

```env
# JWT配置（必需）
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 阿里云配置（可选 - 如需短信验证功能）
ALIYUN_ACCESS_KEY_ID=your-access-key
ALIYUN_ACCESS_KEY_SECRET=your-access-secret
ALIYUN_SMS_SIGN_NAME=your-sign-name
ALIYUN_SMS_TEMPLATE_CODE=your-template-code

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 高德地图配置（可选）
AMAP_API_KEY=your-amap-key
AMAP_API_SECRET=your-amap-secret
```

**生成安全的SECRET_KEY**:

```bash
# Python命令生成
python -c "import secrets; print(secrets.token_urlsafe(32))"

# 或使用 OpenSSL
openssl rand -hex 32
```

### 步骤 6: 数据库初始化

**项目使用SQLite，数据库文件会自动创建在 `data/` 目录**

首次运行时，表结构会自动创建。

### 步骤 7: 启动后端服务

#### 方式一：使用uvicorn（推荐开发环境）

```bash
# Windows & macOS/Linux
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**参数说明**:
- `--reload`: 代码修改自动重载
- `--host 0.0.0.0`: 监听所有网络接口
- `--port 8000`: 端口号

#### 方式二：使用构建脚本（便捷）

```bash
# Windows & macOS/Linux
source build/envsetup.sh
cola -s    # setup - 初始化
cola -r    # run - 运行
```

**注意**: `build/envsetup.sh` 是Shell脚本，Windows需要Git Bash或WSL。

#### 方式三：使用Gunicorn（生产环境）

```bash
# macOS/Linux
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000

# Windows (Gunicorn不支持Windows，使用uvicorn)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 步骤 8: 验证后端运行

```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri http://localhost:8000/api/v1/health

# macOS/Linux
curl http://localhost:8000/api/v1/health

# 或在浏览器打开
# http://localhost:8000/docs - Swagger API文档
# http://localhost:8000/redoc - ReDoc API文档
```

**预期响应**:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

---

## 前端部署（ColaFit）

### 步骤 1: 进入项目目录

```bash
# Windows PowerShell
cd C:\Users\lance\code\Colafans\ColaFit

# macOS/Linux Terminal
cd /Users/lance/code/Colafans/ColaFit
```

### 步骤 2: 检查Flutter环境

```bash
# Windows & macOS/Linux
flutter doctor
```

**预期输出**: 所有检查项显示 ✓ 或具体版本号

**解决常见问题**:

```bash
# 如果Flutter未安装
# Windows: 下载安装包 https://flutter.dev/docs/get-started/install/windows
# macOS: brew install --cask flutter

# 如果未接受Android许可（首次运行）
flutter doctor --android-licenses
```

### 步骤 3: 安装依赖

```bash
# Windows & macOS/Linux
flutter pub get
```

### 步骤 4: 配置API地址

编辑 `lib/config/app_config.dart`:

**Windows (PowerShell)**:
```powershell
code lib/config/app_config.dart
# 或
notepad lib/config/app_config.dart
```

**macOS/Linux**:
```bash
code lib/config/app_config.dart
# 或
nano lib/config/app_config.dart
```

#### 开发环境配置

```dart
class AppConfig {
  // 开发环境 - 连接本地后端
  static const bool _isProduction = false;
  static const String _baseUrl = 'http://localhost:8000';

  // 生产环境 - 连接远程服务器
  static const String _productionBaseUrl = 'http://YOUR_BACKEND_SERVER:8000';

  // 获取当前环境的base URL
  static String get baseUrl => _isProduction ? _productionBaseUrl : _baseUrl;

  // 其他配置...
}
```

### 步骤 5: 启动前端应用

#### Web版本（推荐开发）

```bash
# Windows & macOS/Linux
# Chrome浏览器
flutter run -d chrome

# Edge浏览器（Windows）
flutter run -d edge

# Safari浏览器（macOS）
flutter run -d safari
```

#### Android版本

```bash
# 查看可用设备
flutter devices

# 运行在Android设备/模拟器
flutter run -d android

# 或自动选择设备
flutter run
```

#### iOS版本（仅macOS）

```bash
# 运行在iOS模拟器
flutter run -d ios

# 或指定模拟器
flutter run -d iphone-15-pro
```

### 步骤 6: 验证前端运行

1. 应用窗口/浏览器自动打开
2. 显示登录/注册界面
3. 打开浏览器开发者工具（F12）查看Network标签
4. 尝试注册/登录，确认API请求正常

---

## 开发环境快速启动

### Windows快速启动

**准备两个终端窗口（PowerShell或CMD）**

**终端1 - 后端**:

```powershell
# 进入后端目录
cd C:\Users\lance\code\Colafans\Alfred

# 激活虚拟环境
.venv\Scripts\activate

# 启动后端
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**终端2 - 前端**:

```powershell
# 进入前端目录
cd C:\Users\lance\code\Colafans\ColaFit

# 启动前端（Web）
flutter run -d chrome
```

### macOS/Linux快速启动

**准备两个终端窗口或使用tmux**

**终端1 - 后端**:

```bash
# 进入后端目录
cd /Users/lance/code/Colafans/Alfred

# 激活虚拟环境
source .venv/bin/activate

# 启动后端
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**终端2 - 前端**:

```bash
# 进入前端目录
cd /Users/lance/code/Colafans/ColaFit

# 启动前端（Web）
flutter run -d chrome
```

### 使用tmux（macOS/Linux推荐）

```bash
# 安装tmux（如果未安装）
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# 创建新会话
tmux new-session -d -s colafit

# 启动后端
tmux send-keys -t colafit "cd /Users/lance/code/Colafans/Alfred" C-m
tmux send-keys -t colafit "source .venv/bin/activate" C-m
tmux send-keys -t colafit "uvicorn app.main:app --reload" C-m

# 分割窗口
tmux split-window -t colafit

# 启动前端
tmux send-keys -t colafit.1 "cd /Users/lance/code/Colafans/ColaFit" C-m
tmux send-keys -t colafit.1 "flutter run -d chrome" C-m

# 附加到会话
tmux attach-session -t colafit

# tmux快捷键
# Ctrl+b c - 创建新窗口
# Ctrl+b " - 分割窗口
# Ctrl+b 方向键 - 切换面板
# Ctrl+b d - 分离会话
```

---

## 生产环境部署

### 后端生产部署

#### 服务器准备

```bash
# 连接到服务器
ssh user@YOUR_BACKEND_SERVER

# 或使用密钥
ssh -i ~/.ssh/your-key.pem user@YOUR_BACKEND_SERVER
```

#### 使用Systemd服务（Linux）

**创建服务文件**:

```bash
sudo nano /etc/systemd/system/colafit-backend.service
```

**服务配置**:

```ini
[Unit]
Description=ColaFit Backend Service
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/path/to/Alfred
Environment="PATH=/path/to/Alfred/.venv/bin"
ExecStart=/path/to/Alfred/.venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**启动和管理服务**:

```bash
# 重新加载systemd配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start colafit-backend

# 设置开机自启
sudo systemctl enable colafit-backend

# 查看服务状态
sudo systemctl status colafit-backend

# 查看日志
sudo journalctl -u colafit-backend -f

# 重启服务
sudo systemctl restart colafit-backend

# 停止服务
sudo systemctl stop colafit-backend
```

#### 使用Docker部署

**创建Dockerfile**:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**构建和运行**:

```bash
# 构建镜像
docker build -t colafit-backend:latest .

# 运行容器
docker run -d \
  --name colafit-backend \
  -p 8000:8000 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  colafit-backend:latest

# 查看日志
docker logs -f colafit-backend

# 停止容器
docker stop colafit-backend

# 删除容器
docker rm colafit-backend

# 重启容器
docker restart colafit-backend
```

#### 使用Nginx反向代理

**Nginx配置**:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件
    location /static {
        alias /path/to/Alfred/app/web/static;
    }

    # API文档
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
    }
}
```

**重启Nginx**:

```bash
# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 或
sudo service nginx restart
```

### 前端生产部署

#### Web应用部署

**构建Web应用**:

```bash
# Windows & macOS/Linux
cd ColaFit

# 构建生产版本
flutter build web

# 构建产物在 build/web/ 目录
```

**部署到Nginx**:

```bash
# 将构建产物复制到服务器
scp -r build/web/* user@YOUR_FRONTEND_SERVER:/var/www/colafit/

# 或使用rsync
rsync -avz build/web/ user@YOUR_FRONTEND_SERVER:/var/www/colafit/
```

**Nginx配置**:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    root /var/www/colafit;
    index index.html;

    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 缓存控制
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Android应用部署

**构建APK**:

```bash
# Windows & macOS/Linux
cd ColaFit

# 构建APK（调试版本）
flutter build apk --debug

# 构建APK（发布版本）
flutter build apk --release

# 构建产物位置
# build/app/outputs/flutter-apk/app-release.apk
```

**构建App Bundle（推荐用于Google Play）**:

```bash
flutter build appbundle --release

# 构建产物位置
# build/app/outputs/bundle/release/app-release.aab
```

#### iOS应用部署（仅macOS）

**构建IPA**:

```bash
cd ColaFit

# 构建iOS应用（需要Xcode）
flutter build ios --release

# 使用Xcode打开项目
open ios/Runner.xcworkspace

# 在Xcode中：
# 1. 选择Signing & Capabilities
# 2. 配置开发者账号和证书
# 3. Archive
# 4. Distribute App
```

---

## 常见问题

### 后端问题

#### Q1: 端口被占用

**Windows**:
```powershell
# 查找占用端口的进程
netstat -ano | findstr :8000

# 杀死进程
taskkill /PID <进程ID> /F

# 或使用其他端口
uvicorn app.main:app --reload --port 8001
```

**macOS/Linux**:
```bash
# 查找占用端口的进程
lsof -i :8000

# 杀死进程
kill -9 <进程ID>

# 或使用其他端口
uvicorn app.main:app --reload --port 8001
```

#### Q2: 虚拟环境激活失败

**Windows PowerShell - 执行策略错误**:
```powershell
# 查看当前执行策略
Get-ExecutionPolicy

# 修改执行策略（仅当前用户）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 重新激活
.venv\Scripts\Activate.ps1
```

**macOS/Linux - 权限错误**:
```bash
# 添加执行权限
chmod +x .venv/bin/activate

# 重新激活
source .venv/bin/activate
```

#### Q3: 依赖安装失败

```bash
# 升级pip
python -m pip install --upgrade pip

# 清理缓存
pip cache purge

# 重新安装
pip install -r requirements.txt

# 或使用国内镜像源（中国）
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

#### Q4: 数据库连接错误

```bash
# 检查数据库文件权限
ls -la data/

# 确保data目录存在且有写权限
mkdir -p data
chmod 755 data

# 删除并重新创建数据库
rm data/colafit.db
# 重启服务，会自动创建新数据库
```

### 前端问题

#### Q1: Flutter环境检查失败

```bash
# 运行详细诊断
flutter doctor -v

# 常见问题：
# 1. Android SDK未安装 - 下载Android Studio
# 2. Xcode未安装（macOS） - 安装Xcode
# 3. VS Code未安装Flutter插件 - 安装Flutter扩展

# 清理Flutter缓存
flutter clean

# 重新获取依赖
flutter pub get
```

#### Q2: 无法连接到后端

**检查清单**:

1. **确认后端正在运行**:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **检查防火墙设置**:
   ```bash
   # Windows - 允许端口
   # Windows Defender -> 防火墙 -> 高级设置
   # 入站规则 -> 新建规则 -> 端口 -> 8000

   # macOS - 允许端口
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/python3
   ```

3. **检查前端API配置**:
   ```dart
   // lib/config/app_config.dart
   static const bool _isProduction = false; // 开发环境
   static const String _baseUrl = 'http://localhost:8000';
   ```

4. **清除浏览器缓存**:
   ```
   Ctrl+Shift+Delete (Windows/Linux)
   Cmd+Shift+Delete (macOS)
   ```

#### Q3: Web构建失败

```bash
# 清理构建缓存
flutter clean

# 重新获取依赖
flutter pub get

# 重新构建
flutter build web

# 如果还有问题，检查Flutter版本
flutter --version
# 考虑升级Flutter
flutter upgrade
```

#### Q4: 模拟器启动失败

**Android模拟器**:
```bash
# 列出可用模拟器
flutter emulators

# 启动指定模拟器
flutter emulators --launch <emulator_id>

# 或使用Android Studio的AVD Manager创建新模拟器
```

**iOS模拟器（macOS）**:
```bash
# 列出可用设备
flutter devices

# 启动模拟器
open -a Simulator

# 或指定设备
xcrun simctl boot "iPhone 15 Pro"
```

### 开发工具问题

#### Q1: VS Code无法调试Flutter

**安装必需扩展**:
1. Flutter
2. Dart

**配置launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Flutter: Web",
      "type": "dart",
      "request": "launch",
      "program": "lib/main.dart",
      "args": [
        "-d",
        "chrome"
      ]
    }
  ]
}
```

#### Q2: Git提交后文件权限变化

```bash
# 配置Git忽略文件权限变化
git config core.fileMode false

# 或全局配置
git config --global core.fileMode false
```

---

## 性能优化建议

### 后端优化

```bash
# 使用多worker（生产环境）
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000

# 使用Gunicorn + Uvicorn Workers
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000

# 启用日志
uvicorn app.main:app --log-level info --access-log

# 数据库连接池配置
# 编辑 app/db/database.py
```

### 前端优化

```bash
# 构建时启用优化
flutter build web --release

# 分析构建产物
flutter build web --release --analyze-size

# 拆分代码（tree-shaking自动启用）
# 优化图片资源
# 使用WebP格式
```

---

## 安全建议

### 后端安全

1. **环境变量管理**:
   - 不要将 `.env` 文件提交到Git
   - 使用强密码作为 `SECRET_KEY`
   - 定期更换密钥

2. **CORS配置**:
   ```python
   # app/main.py
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000", "https://yourdomain.com"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **数据库备份**:
   ```bash
   # 定期备份SQLite数据库
   cp data/colafit.db data/backups/colafit_$(date +%Y%m%d_%H%M%S).db
   ```

### 前端安全

1. **API密钥保护**:
   - 不要在前端代码中硬编码敏感信息
   - 使用环境变量管理配置

2. **HTTPS**:
   - 生产环境必须使用HTTPS
   - 配置SSL证书（Let's Encrypt免费）

---

## 监控和日志

### 后端日志

```bash
# 查看实时日志
tail -f logs/colafit.log

# 或使用journalctl（systemd服务）
sudo journalctl -u colafit-backend -f

# 日志级别配置
# 编辑 app/core/logging.py
```

### 前端日志

```bash
# 查看Flutter日志
flutter logs

# Web版本 - 浏览器开发者工具Console
# 移动版本 - adb logcat
adb logcat
```

---

## 备份和恢复

### 数据备份

```bash
# 备份数据库
cp data/colafit.db backups/colafit_$(date +%Y%m%d).db

# 备份配置文件
cp .env backups/.env.backup

# 完整备份
tar -czf backups/colafit_full_$(date +%Y%m%d).tar.gz Alfred/
```

### 数据恢复

```bash
# 恢复数据库
cp backups/colafit_20250108.db data/colafit.db

# 恢复配置
cp backups/.env.backup .env
```

---

## 更新和维护

### 后端更新

```bash
# 拉取最新代码
git pull origin main

# 激活虚拟环境
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows

# 更新依赖
pip install --upgrade -r requirements.txt

# 重启服务
sudo systemctl restart colafit-backend  # Linux
```

### 前端更新

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
flutter pub get

# 清理旧构建
flutter clean

# 重新构建
flutter build web --release
```

---

## 联系和支持

- **文档**: `docs/` 目录
- **问题反馈**: GitHub Issues
- **API文档**: http://localhost:8000/docs

---

**最后更新**: 2025-01-08
**文档维护**: 开发团队
