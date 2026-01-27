# CLAUDE.md - Alfred 项目指南

本文件定义 Alfred 项目的特定规范和配置。通用开发规范见 `~/.claude/CLAUDE.md`。

---

## 协作约定

**称呼**
- 在本项目中，用户被称为 **"旅行者"**
- 体现协作、探索、共同前进的伙伴关系
- 每次回答应使用此称呼开场或自然融入

---

## 项目核心原则

**技术迁移**
- 后端正在从 Python FastAPI 迁移到 Spring Boot (Kotlin)
- **所有新功能必须在 Spring Boot 开发**
- Python Backend 仅作为参考，待完全迁移后删除

**前后端同步**
- 后端接口变更必须同步更新前端
- 修改响应格式 → 更新 ApiService 和模型
- 修改请求参数 → 更新前端调用代码

---

## 快速启动

### Backend (Spring Boot) - 主要后端
```bash
cd backend && ./gradlew bootRun  # 端口 8080
```

### Frontend (React)
```bash
cd frontend && npm run dev       # 端口 3000
```

### Frontend Flutter (备份)
```bash
cd frontend.flutter && flutter run -d chrome
```

### Backend Python (备份)
```bash
cd backend.python && uvicorn app.main:app --reload  # 端口 8000
```

---

## 架构概览

```
Frontend (React)
    ↓ REST API
Backend (Spring Boot) ←→ PostgreSQL (主要)
Frontend.flutter (备份)
Backend.python (备份)
```

**组件说明**：
- `backend/` - Spring Boot (Kotlin) 主要后端，标准分层架构
- `frontend/` - React (TypeScript) 主要前端
- `frontend.flutter/` - Flutter 跨平台前端（备份）
- `backend.python/` - Python FastAPI 后端（备份）

---

## API 配置

- 开发环境：`http://localhost:8080` (Spring Boot)
- 生产环境：`http://YOUR_BACKEND_SERVER:8080`
- Swagger UI：`http://localhost:8080/swagger-ui.html`
- 前端配置：`frontend/src/utils/config.ts`

---

## 项目目录结构

### Spring Boot (backend/)
```
backend/
├── src/main/kotlin/com/colafan/alfred/
│   ├── controller/      # API 层
│   ├── service/         # 业务逻辑
│   ├── repository/      # 数据访问
│   ├── entity/          # 数据模型
│   ├── dto/             # 数据传输对象
│   └── config/          # 配置类
├── src/main/resources/
│   ├── application.yml  # 应用配置
│   └── db/migration/    # 数据库迁移（Flyway）
└── src/test/kotlin/com/colafan/alfred/  # 测试
```

### Frontend (frontend/)
```
frontend/
├── src/
│   ├── pages/          # 页面组件
│   ├── components/     # 可复用组件
│   ├── services/       # API 调用
│   ├── utils/          # 工具函数
│   └── types/          # TypeScript 类型
└── package.yaml        # 依赖管理
```

### Python (backend.python/) - 备份
```
backend.python/
├── app/
│   ├── api/v1/          # 业务逻辑参考
│   ├── models/          # 数据结构参考
│   └── main.py          # FastAPI 应用
└── requirements.txt     # Python 依赖
```

---

## Spring Boot 开发规范

### 标准分层
```
Controller → Service → Repository → Entity
```

### URL 规范
- 基础路径：`/api/v1`
- 资源命名：复数名词 `/api/v1/accounts`, `/api/v1/categories`
- 嵌套资源：`/api/v1/users/{id}/accounts`

### JPA 实体规范
- 字段注释使用中文
- 表名使用蛇形命名（自动映射）
- 关系字段使用懒加载
- 必须包含 `@Id` 和审计字段（createdAt, updatedAt）

### 测试规范
- 位置：`backend/src/test/kotlin/com/colafan/alfred/`
- 集成测试使用 `@SpringBootTest` + `MockMvc`
- 单元测试使用 `@ExtendWith(MockKExtension::class)`

**API测试必须使用测试脚本**
- ✅ 编写shell脚本(`scripts/test_*.sh`)进行API测试
- ✅ 脚本内使用curl命令发送请求
- ❌ **禁止直接在bash工具中执行curl命令测试API**
- ❌ 禁止使用wget命令测试API
- ❌ 禁止手动点击界面测试

**测试脚本位置：** `scripts/test_*.sh`

**运行测试**：
```bash
cd alfred

# 运行所有测试
./gradlew test

# 运行单个测试类
./gradlew test --tests "com.colafan.alfred.AuthControllerTest"

# 运行单个测试方法
./gradlew test --tests "com.colafan.alfred.AuthControllerTest.should return token"

# 查看测试报告
open build/reports/tests/test/index.html
```

**测试示例**：
- `AuthControllerTest.kt` - 认证接口测试
- `AccountControllerTest.kt` - 账户接口测试

---

## Flutter 开发规范

### 状态管理
- 使用 Provider 模式
- 全局状态：`lib/providers/`
- 页面状态：局部 Provider 或 StatefulWidget

### 模型类规范
```dart
class TransactionModel {
  final String id;
  final double amount;
  // ...

  TransactionModel({
    required this.id,
    required this.amount,
    // ...
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) { ... }
  Map<String, dynamic> toJson() { ... }
  TransactionModel copyWith({ ... }) { ... }
}
```

### API 调用
- 统一使用 `lib/services/api_service.dart`
- 统一错误处理
- JWT Token 自动管理

---

## 测试账号

**重要提示**：这些账号仅用于开发测试，数据可能随时被重置或删除。

| 账号 | 密码 | 用途 |
|------|------|------|
| test003 | test003 | 通用测试（含默认系统分类） |
| lance | lance123 | 个人测试账号 |

### 在测试中使用认证

**方式1：真实登录获取token（推荐）**
```kotlin
@SpringBootTest
@AutoConfigureMockMvc
class AccountControllerTest {

    private lateinit var token: String

    @BeforeEach
    fun setup() {
        // 登录获取token
        val result = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"username":"test003","password":"test003"}"""))
            .andExpect(status().isOk)
            .andReturn()

        val response = mapper.readTree(result.response.contentAsString)
        token = response.path("data").path("token").asText()
    }

    @Test
    fun testApi() {
        mockMvc.perform(get("/api/v1/accounts")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
    }
}
```

**方式2：使用 Spring Security 测试工具**
```kotlin
@Test
@WithMockUser(username = "test003")
fun testWithMockUser() {
    mockMvc.perform(get("/api/v1/accounts"))
        .andExpect(status().isOk)
}
```

### 手动验证 API

- Swagger UI（推荐）：`http://localhost:8080/swagger-ui.html`
- Postman/Insomnia 等图形化工具

---

## 关键技术栈

### 后端
- **框架**：Spring Boot 3.5.9
- **语言**：Kotlin 1.9.25
- **数据库**：PostgreSQL
- **ORM**：Spring Data JPA
- **迁移**：Flyway
- **认证**：JWT (io.jsonwebtoken:jjwt:0.12.3)
- **缓存**：Redis
- **文档**：SpringDoc OpenAPI 3
- **测试**：JUnit 5, MockK, MockMvc

### 前端
- **框架**：Flutter 3.x
- **状态管理**：Provider
- **UI设计**：Material Design 3
- **HTTP客户端**：dio
- **本地存储**：shared_preferences

### 后端参考（Python）
- **框架**：FastAPI
- **ORM**：SQLAlchemy
- **Python版本**：3.13（3.14 不兼容 pydantic-core）

---

## 数据库迁移

- 工具：Flyway
- 位置：`alfred/src/main/resources/db/migration/`
- 命名规范：`V{version}__{description}.sql`
- 示例：`V1__create_users_table.sql`

---

## 常见问题

### 端口冲突
- Spring Boot: 8080
- FastAPI: 8000
- PostgreSQL: 5432

### Python 环境
- 必须使用 Python 3.13
- 3.14 不兼容 pydantic-core

### 迁移参考
- Spring Boot 代码可参考 Python 实现
- 位置：`backend/app/api/v1/`
- 完成迁移后删除 `backend/` 目录

---

## 序列化命名规范

**重要**：前后端保持一致，使用驼峰命名法（camelCase）

```json
// ✅ 正确
{"userName": "test", "accountBalance": 100.0}

// ❌ 错误
{"user_name": "test", "account_balance": 100.0}
```

---

## 相关文档

- `README.md` - 项目概述
- `~/.claude/CLAUDE.md` - 通用开发规范
- `AGENTS.md` - Agent 使用指南
- `TODO.md` - 待办事项
