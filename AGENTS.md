# AGENTS.md - Alfred 开发指南

**面向 AI Agent 的项目开发指南**

## 核心原则

**中文优先**：所有对话、分析、代码注释、用户界面必须使用中文

## 项目架构

### 组件说明
- `backend/` - Spring Boot (Kotlin) 主要后端
- `frontend/` - React (TypeScript) 主要前端
- `backend.python/` - Python FastAPI 备份（已废弃）
- `frontend.flutter/` - Flutter 跨平台前端（已废弃）

### 技术栈
- **Spring Boot**: Kotlin, PostgreSQL, JWT, Flyway, Redis
- **React**: TypeScript, Ant Design, Vite, React Router
- **Python**: FastAPI, SQLAlchemy (备份参考)

---

## 快速启动

### Spring Boot 后端
```bash
cd backend
./gradlew bootRun      # 启动，端口 8080
./gradlew test         # 测试
./gradlew build        # 构建
```

### React 前端
```bash
cd frontend
npm install            # 安装依赖
npm run dev           # 启动，端口 3000
npm run build         # 构建
```

### Python 后端（参考）
```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # 端口 8000
```

**注意：必须使用 Python 3.13（3.14 不兼容 pydantic-core）**

---

## 代码规范

### Python (FastAPI)
- 导入：标准库 → 第三方 → 本地
- 命名：`snake_case`（变量/函数），`PascalCase`（类）
- API 路由：中文 prefix 和 tags
- 错误处理：`app/core/exceptions.py`

### Dart (Flutter)
- 导入：Dart SDK → Flutter → 第三方 → 本地
- 命名：`camelCase`（变量/函数），`PascalCase`（类）
- 文件：`snake_case.dart`
- 模型：fromJson, toJson, copyWith

### Kotlin (Spring Boot)
- 标准 Kotlin 风格
- JPA 实体字段中文注释
- 分层：Controller → Service → Repository

---

## RESTful API 规范

### URL 设计
- 名词复数：`/api/accounts`, `/api/users`
- 层级关系：`/api/users/{id}/accounts`
- 小写字母 + 连字符：`/api/user-preferences`

### HTTP 方法
- GET - 查询（幂等）
- POST - 创建
- PUT - 完整更新（幂等）
- PATCH - 部分更新（幂等）
- DELETE - 删除（幂等）

### 响应格式
```json
// 成功
{"success": true, "data": {...}, "message": "操作成功"}

// 错误
{"success": false, "message": "错误描述", "error": {"code": "ERROR_CODE", "message": "详细"}}
```

### 状态码
- 200/201/204 - 成功
- 400/401/403/404/409 - 客户端错误
- 500 - 服务器错误

---

## 重要文件

### Spring Boot
- `src/main/kotlin/com/colafan/alfred/controller/` - API 层
- `src/main/kotlin/com/colafan/alfred/service/` - 业务逻辑
- `src/main/kotlin/com/colafan/alfred/entity/` - 数据模型
- `src/main/kotlin/com/colafan/alfred/repository/` - 数据访问
- `src/main/resources/db/migration/` - 数据库迁移

### Frontend
- `lib/main.dart` - 应用入口
- `lib/services/api_service.dart` - API 调用
- `lib/models/` - 数据模型
- `lib/screens/` - 页面组件

### Python (参考)
- `app/main.py` - 应用入口
- `app/api/v1/` - API 路由
- `app/models/` - 数据模型
- `app/services/` - 业务逻辑

---

## 后端开发强制要求

### 1. 必须测试验证
- 使用测试账号调用接口
- 验证成功/失败场景
- 初始化功能需注册新账号完整测试

### 2. 必须符合规范
- RESTful 设计
- 标准分层架构
- 中文注释
- 完善错误处理

### 3. 必须同步前端
- 响应格式变更 → 更新 ApiService 和模型
- 请求参数变更 → 更新前端调用

### 4. 提交前检查
- ✅ 接口已测试通过
- ✅ 前端已同步（如需）
- ✅ 代码符合规范
- ✅ 无测试数据和调试代码

---

## API 配置

- 开发：`http://localhost:8080` (Spring Boot)
- 生产：`http://110.42.222.64:8080`
- 配置：`frontend/lib/config/app_config.dart`

---

## 本地化要求

- 用户界面：中文
- 日期：2025年1月8日
- 货币：¥1,234.56
- 数字：千位分隔符
- 相对时间："今天"、"3天前"
- 编码：UTF-8

---

## Git 工作流

- 功能分支开发
- 中文提交信息
- 提交前运行测试
- 不提交 `.env`

---

## 特殊功能

### FIT 文件处理
- 支持 Garmin/运动设备 FIT 文件
- 提取活动数据（心率、速度、距离）

### 第三方集成
- 高德地图：活动地点和轨迹
- OpenAI API：健身洞察和分析
- Redis：会话和缓存

### 数据库迁移
- Spring Boot：Flyway（V1__, V2__ 脚本）
- FastAPI：手动 SQL 或 Alembic

---

## 常见问题

- **端口冲突**：Spring Boot 8080, FastAPI 8000
- **Python 版本**：必须 3.13
- **迁移参考**：Spring Boot 代码参考 Python 实现

---

## 相关文档

- `README.md` - 项目概述
- `docs/` - 架构和 API 文档
