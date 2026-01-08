# Alfred - 智能健身助手

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Alfred 是一个全栈健身管理应用，提供活动追踪、记账、健身数据管理等功能。

## 📁 项目结构

```
Alfred/
├── backend/           # FastAPI Python 后端
│   ├── app/          # 应用主代码
│   ├── tests/        # 测试
│   └── docs/         # 后端文档
├── frontend/          # Flutter 跨平台前端
│   ├── lib/          # Dart 代码
│   ├── android/      # Android 平台
│   ├── ios/          # iOS 平台
│   ├── web/          # Web 平台
│   └── ...
├── docs/              # 共享文档
├── shared/            # 共享数据
└── AGENTS.md         # AI Agent 开发指南
```

## 🚀 快速开始

### 后端启动

```bash
cd backend
source build/envsetup.sh  # 设置环境
cola -r                   # 启动服务器
```

### 前端启动

```bash
cd frontend
flutter run
```

## 📚 文档

- [AGENTS.md](AGENTS.md) - AI Agent 开发指南
- [backend/README.md](backend/README.md) - 后端详细文档
- [frontend/README.md](frontend/README.md) - 前端详细文档

## 🛠️ 技术栈

### 后端
- **框架**: FastAPI
- **数据库**: SQLite (可迁移到 PostgreSQL)
- **认证**: JWT
- **其他**: fitparse (FIT 文件处理), OpenAI API, 阿里云短信

### 前端
- **框架**: Flutter
- **状态管理**: Provider
- **UI**: Material Design 3
- **平台**: iOS, Android, macOS, Linux, Windows, Web

## 📝 开发指南

请参考 [AGENTS.md](AGENTS.md) 获取详细的开发指南，包括：
- 代码风格
- 构建和测试命令
- 本地化要求
- Git 工作流

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)
