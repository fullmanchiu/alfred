# Alfred - 个人助手

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Alfred 是一个全栈个人管理应用，集成记账、健康数据、骑行追踪、AI 对话等功能。

## 📁 项目结构

```
Alfred/
├── backend/                 # Spring Boot (Kotlin) 后端
│   ├── src/main/           # 源代码
│   ├── deploy/             # 部署配置
│   └── src/test/           # 测试
├── frontend/                # React (TypeScript) 前端
│   ├── src/                # 源代码
│   ├── deploy/             # 部署配置
│   └── public/             # 静态资源
├── stock-analysis-service/ # Python 微服务（AI/数据处理）
│   ├── api/                # FastAPI 接口
│   ├── modules/            # 业务模块
│   ├── deploy/             # 部署配置
│   └── prompts/            # AI 提示词
└── docs/                   # 文档
```

## 🏗️ 部署架构

Alfred 采用**统一的部署架构**：所有服务都使用"构建产物 + 基础镜像"模式

| 服务 | 构建产物 | 基础镜像 | 部署方式 |
|------|---------|---------|---------|
| 后端 | `app.jar` | `alfred-backend` | 挂载到容器 |
| 前端 | `dist.tar.gz` | `alfred-frontend` (nginx) | 挂载到容器 |
| Python微服务 | `stock-service.tar.gz` | `alfred-stock-service` | 挂载到容器 |

**优势**：
- ✅ 构建快速（不需要构建完整镜像）
- ✅ 部署简单（下载代码包 → 解压 → 重启）
- ✅ 架构统一（所有服务部署流程一致）

## 🚀 快速开始

### 后端启动 (Spring Boot)

```bash
cd backend
./gradlew bootRun      # 启动，端口 8080
```

### 前端启动 (React)

```bash
cd frontend
npm run dev           # 启动，端口 3000
```

## 📚 文档

- [TODO.md](TODO.md) - **开发进度和功能清单**（推荐首先查看）
- [AGENTS.md](AGENTS.md) - AI Agent 开发指南
- [CLAUDE.md](CLAUDE.md) - 项目开发规范
- [backend/README.md](backend/README.md) - 后端详细文档
- [frontend/README.md](frontend/README.md) - 前端详细文档

## 🛠️ 技术栈

### 后端
- **框架**: Spring Boot 3.5.9
- **语言**: Kotlin 1.9.25
- **数据库**: PostgreSQL 16.3
- **ORM**: Spring Data JPA
- **迁移**: Flyway
- **认证**: JWT (io.jsonwebtoken:jjwt:0.12.3)
- **缓存**: Redis
- **文档**: SpringDoc OpenAPI 3

### 前端
- **框架**: React 18
- **语言**: TypeScript
- **UI**: Ant Design 5.x
- **路由**: React Router 7
- **HTTP**: Axios
- **构建**: Vite 6.x

## 📝 开发指南

请参考 [AGENTS.md](AGENTS.md) 获取详细的开发指南，包括：
- 代码风格
- 构建和测试命令
- 本地化要求
- Git 工作流

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)
# Test deploy v4
