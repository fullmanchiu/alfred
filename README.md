# Alfred - 个人助手

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Alfred 是一个全栈个人管理应用，集成记账、健康数据、骑行追踪、AI 对话等功能。

## ✨ 核心功能

- **记账管理** - 交易记录、分类管理、多币种支持（CNY/HKD/USD/EUR/MOP）
- **预算管理** - 多周期预算、使用分析、日历视图
- **统计分析** - 多维度图表、AI 智能分析
- **账户管理** - 金融账户、多币种账户、转账功能
- **健康档案** - 健康数据记录、BMI 计算
- **骑行追踪** - FIT 文件解析、GPS 轨迹展示
- **股票分析** - 自选股、技术分析、AI 报告
- **AI 对话** - 智能财务建议、消费分析
- **任务调度** - 定时任务、周期性任务、执行历史

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
├── py-service/             # Python 微服务（AI/数据处理）
│   ├── api/                # FastAPI 接口
│   ├── modules/            # 业务模块
│   ├── websocket/          # WebSocket 服务端
│   ├── dto/                # 数据传输对象
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

### Python 微服务启动 (FastAPI)

```bash
cd py-service
source venv/bin/activate
python main.py        # 启动，端口 8001
```

## 🔌 服务间通讯

Java 后端与 Python 微服务之间通过 **WebSocket** 进行双向通讯：

```
┌─────────────────────────────────────────────────┐
│              WebSocket 持久连接                  │
│  Java (8080) ←─────────────→ Python (8001)      │
│      客户端                  服务端              │
└─────────────────────────────────────────────────┘
```

**消息格式：**
```json
{
  "type": "request | response | notification",
  "requestId": "uuid",
  "payload": { ... }
}
```

**特性：**
- 双向对等通讯（任何一方可主动发起）
- 自动重连（指数退避，最大 30 秒）
- 心跳机制（每 30 秒）
- 请求-响应关联（requestId）
- 离线消息队列

## ⏰ 任务调度系统

Alfred 内置了一个强大的任务调度系统，支持创建定时任务、周期性任务和一次性任务。

### 功能特性

- **多种调度方式**
  - Cron 表达式：支持标准 Cron 语法（如 `0 15 * * *` 表示每天 15:00）
  - 固定间隔：按秒数间隔执行（如 `3600` 表示每小时执行一次）

- **任务类型**
  - `sync_klines`: 股票 K 线数据同步
  - `calculate_indicators`: 技术指标计算
  - `hello`: 测试任务

- **实时监控**
  - WebSocket 实时推送任务状态
  - 执行历史记录查询
  - 失败重试机制

### 使用方式

#### 前端界面

访问 `http://localhost:3009/tasks` 可以：
- 查看所有定时任务
- 创建新任务（选择类型、调度规则）
- 立即执行任务
- 查看执行历史
- 启用/禁用任务

#### API 接口

**创建任务**
```bash
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "daily_sync",
    "taskType": "sync_klines",
    "scheduleType": "cron",
    "cronExpr": "0 15 * * *",
    "enabled": true
  }'
```

**立即执行任务**
```bash
curl -X POST http://localhost:8080/api/v1/tasks/execute \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "daily_sync",
    "taskType": "sync_klines"
  }'
```

**获取执行历史**
```bash
curl "http://localhost:8080/api/v1/tasks/executions?taskName=daily_sync&limit=10"
```

### 架构说明

任务调度系统采用三层架构：

```
Frontend (React)
    ↓ HTTP
Backend (Spring Boot)
    ↓ WebSocket
Python (FastAPI + APScheduler)
    ↓ HTTP
Backend → PostgreSQL
```

- **前端**: React + Ant Design，提供任务管理界面
- **Java 后端**: Spring Boot，负责数据持久化和 API
- **Python 微服务**: FastAPI + APScheduler，负责任务调度和执行
- **数据库**: PostgreSQL，存储任务配置和执行记录

### 测试

运行端到端测试：
```bash
./scripts/test_task_system_e2e.sh
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
- **迁移**: Flyway（36个迁移文件）
- **认证**: JWT (io.jsonwebtoken:jjwt:0.12.3)
- **缓存**: Redis
- **文档**: SpringDoc OpenAPI 3
- **测试**: JUnit 5 + MockK + MockMvc

### 前端
- **框架**: React 18
- **语言**: TypeScript（严格模式）
- **UI**: Ant Design 5.x
- **路由**: React Router 7
- **HTTP**: Axios
- **构建**: Vite 6.x
- **数据管理**: React Query

### Python 微服务
- **框架**: FastAPI
- **语言**: Python 3.9
- **通讯**: WebSocket（与 Java 后端双向通讯）
- **数据**: Pandas, NumPy
- **数据库**: PostgreSQL（通过 Java 后端）

## 📊 项目规模

- **后端**: 17个Controller、18个Service、19个Entity
- **前端**: 18个页面组件
- **API**: RESTful + SSE流式响应
- **数据库**: 14张核心表、36个迁移文件

## 📝 开发指南

请参考 [AGENTS.md](AGENTS.md) 获取详细的开发指南，包括：
- 代码风格
- 构建和测试命令
- 本地化要求
- Git 工作流

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)
