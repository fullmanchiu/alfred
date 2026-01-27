# 后端 API 文档

## 1. API 概述

### 1.1 基础 URL
- **开发环境**: `http://localhost:8000`
- **生产环境**: `http://YOUR_BACKEND_SERVER:8000`

### 1.2 版本控制
- API 版本号通过 URL 前缀 `/api/v1/` 实现

### 1.3 认证机制
- 使用 JWT 令牌进行认证
- 令牌可以通过请求头 `Authorization: Bearer <token>` 传递
- 或通过 Cookie `access_token` 传递

### 1.4 响应格式

所有 API 响应遵循统一格式：

```json
{
  "success": true,  // 或 false
  "data": {},       // 响应数据
  "message": ""     // 可选的消息
}
```

## 2. 认证 API

### 2.1 注册

**URL**: `/api/v1/auth/register`
**方法**: `POST`
**描述**: 注册新用户

**请求体**:

```json
{
  "username": "string",  // 用户名
  "password": "string",  // 密码
  "email": "string"      // 邮箱（可选）
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "test_user",
      "email": "test@example.com",
      "nickname": "test_user"
    },
    "token": {
      "access_token": "string",
      "token_type": "bearer",
      "expires_in": 3600
    }
  }
}
```

### 2.2 登录

**URL**: `/api/v1/auth/login`
**方法**: `POST`
**描述**: 用户登录

**请求体**:

```json
{
  "username": "string",  // 用户名或邮箱
  "password": "string"   // 密码
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "test_user",
      "email": "test@example.com",
      "nickname": "test_user"
    },
    "token": {
      "access_token": "string",
      "token_type": "bearer",
      "expires_in": 3600
    }
  }
}
```

### 2.3 登出

**URL**: `/api/v1/auth/logout`
**方法**: `POST`
**描述**: 用户登出

**响应**:

```json
{
  "success": true,
  "message": "已登出"
}
```

### 2.4 获取当前用户

**URL**: `/api/v1/auth/me`
**方法**: `GET`
**描述**: 获取当前登录用户信息

**响应**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "test_user",
    "email": "test@example.com",
    "nickname": "test_user"
  }
}
```

## 3. 用户 API

### 3.1 获取用户资料

**URL**: `/api/v1/user/profile`
**方法**: `GET`
**描述**: 获取用户详细资料

**响应**:

```json
{
  "id": 1,
  "username": "test_user",
  "nickname": "测试用户",
  "phone": "13800138000",
  "email": "test@example.com",
  "location": "北京",
  "gender": "男",
  "created_at": "2025-01-01T00:00:00"
}
```

### 3.2 更新用户资料

**URL**: `/api/v1/user/profile`
**方法**: `PUT`
**描述**: 更新用户资料

**请求体**:

```json
{
  "nickname": "string",  // 昵称（可选）
  "phone": "string",     // 手机号（可选）
  "email": "string",     // 邮箱（可选）
  "location": "string",  // 所在地（可选）
  "gender": "string"      // 性别（可选）
}
```

**响应**:

```json
{
  "success": true,
  "message": "更新成功"
}
```

### 3.3 修改密码

**URL**: `/api/v1/user/password`
**方法**: `POST`
**描述**: 修改用户密码

**请求体**:

```json
{
  "current_password": "string",  // 当前密码
  "new_password": "string"       // 新密码
}
```

**响应**:

```json
{
  "success": true,
  "message": "密码已更新"
}
```

## 4. 上传 API

### 4.1 上传 FIT 文件

**URL**: `/api/v1/upload`
**方法**: `POST`
**描述**: 上传 FIT 文件，支持多文件上传

**请求体**:

- `files`: 多个 FIT 文件（表单数据）

**响应**:

```json
{
  "success": true,
  "uploaded_count": 1,
  "activities": [
    {
      "id": 1,
      "name": "update/fit/test_user/2025_01_01/activity.fit"
    }
  ]
}
```

### 4.2 批量上传并合并运动记录

**URL**: `/api/v1/upload/batch`
**方法**: `POST`
**描述**: 批量上传 FIT 文件，可选择合并为一条运动记录

**请求体**:

- `files`: 多个 FIT 文件（表单数据）
- `merge`: 是否合并（布尔值，可选，默认为 false）

**响应**:

```json
{
  "success": true,
  "uploaded_count": 2,
  "activities": [
    {
      "id": 1,
      "name": "update/fit/test_user/2025_01_01/activity1.fit"
    },
    {
      "id": 2,
      "name": "update/fit/test_user/2025_01_01/activity2.fit"
    }
  ]
}
```

## 5. 活动 API

### 5.1 获取运动记录列表

**URL**: `/api/v1/activities`
**方法**: `GET`
**描述**: 获取用户的运动记录列表，支持分页和筛选

**查询参数**:

- `type`: 运动类型筛选（可选）
- `page`: 页码（可选，默认为 1）
- `page_size`: 每页数量（可选，默认为 20，最大为 100）

**响应**:

```json
{
  "stats": {
    "total_activities": 10,
    "total_distance": 100000,
    "total_duration": 3600,
    "total_elevation": 500
  },
  "activities": [
    {
      "id": 1,
      "name": "update/fit/test_user/2025_01_01/activity.fit",
      "type": "cycling",
      "distance": 10000,
      "duration": 3600,
      "avg_speed": 10,
      "total_elevation": 50,
      "created_at": "2025-01-01T00:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 10
  }
}
```

### 5.2 获取运动记录详情

**URL**: `/api/v1/activities/{activity_id}`
**方法**: `GET`
**描述**: 获取指定运动记录的详细信息，包括 GPS 轨迹点和分段数据

**路径参数**:

- `activity_id`: 活动 ID

**响应**:

```json
{
  "id": 1,
  "name": "update/fit/test_user/2025_01_01/activity.fit",
  "type": "cycling",
  "distance": 10000,
  "duration": 3600,
  "avg_speed": 10,
  "max_speed": 20,
  "total_elevation": 50,
  "avg_heart_rate": 150,
  "max_heart_rate": 180,
  "avg_power": 200,
  "max_power": 400,
  "avg_cadence": 80,
  "calories": 500,
  "start_time": "2025-01-01T10:00:00",
  "end_time": "2025-01-01T11:00:00",
  "created_at": "2025-01-01T00:00:00",
  "points": [
    {
      "time": "2025-01-01T10:00:00",
      "latitude": 39.9042,
      "longitude": 116.4074,
      "speed": 10,
      "heart_rate": 150,
      "power": 200,
      "cadence": 80,
      "elevation": 50
    }
  ],
  "laps": [
    {
      "lap_index": 1,
      "start_time": "2025-01-01T10:00:00",
      "elapsed_time": 1800,
      "distance": 5000,
      "avg_heart_rate": 145,
      "avg_power": 190,
      "avg_speed": 9.5
    }
  ]
}
```

## 6. 健康 API

### 6.1 获取最新的健康数据

**URL**: `/api/v1/health/profile`
**方法**: `GET`
**描述**: 获取用户最新的健康数据

**响应**:

```json
{
  "data": {
    "id": 1,
    "height": 175,
    "weight": 70,
    "body_fat": 20,
    "muscle_rate": 30,
    "water_rate": 50,
    "bone_mass": 5,
    "protein_rate": 15,
    "bmr": 1500,
    "visceral_fat": 5,
    "bmi": 22.86,
    "created_at": "2025-01-01T00:00:00"
  },
  "message": "获取健康数据成功",
  "status": "success"
}
```

### 6.2 创建健康数据

**URL**: `/api/v1/health/profile`
**方法**: `POST`
**描述**: 创建新的健康数据记录

**请求体**:

```json
{
  "height": 175,       // 身高(cm)（可选）
  "weight": 70,        // 体重(kg)（可选）
  "body_fat": 20,      // 体脂率(%)（可选）
  "muscle_rate": 30,   // 肌肉率(%)（可选）
  "water_rate": 50,    // 水分率(%)（可选）
  "bone_mass": 5,      // 骨量(kg)（可选）
  "protein_rate": 15,  // 蛋白质率(%)（可选）
  "bmr": 1500,         // 基础代谢(kcal)（可选）
  "visceral_fat": 5,   // 内脏脂肪等级（可选）
  "bmi": 22.86         // 体质指数（可选，会自动计算）
}
```

**响应**:

```json
{
  "data": {
    "id": 1,
    "height": 175,
    "weight": 70,
    "body_fat": 20,
    "muscle_rate": 30,
    "water_rate": 50,
    "bone_mass": 5,
    "protein_rate": 15,
    "bmr": 1500,
    "visceral_fat": 5,
    "bmi": 22.86,
    "created_at": "2025-01-01T00:00:00"
  },
  "message": "创建健康数据成功",
  "status": "success"
}
```

### 6.3 更新健康数据

**URL**: `/api/v1/health/profile`
**方法**: `PUT`
**描述**: 更新健康数据（创建新记录）

**请求体**:

```json
{
  "weight": 69,        // 体重(kg)（可选）
  "body_fat": 19.5     // 体脂率(%)（可选）
}
```

**响应**:

```json
{
  "data": {
    "id": 2,
    "height": 175,     // 继承上次记录的身高
    "weight": 69,
    "body_fat": 19.5,
    "muscle_rate": 30, // 继承上次记录的肌肉率
    "water_rate": 50,  // 继承上次记录的水分率
    "bone_mass": 5,    // 继承上次记录的骨量
    "protein_rate": 15, // 继承上次记录的蛋白质率
    "bmr": 1500,        // 继承上次记录的基础代谢
    "visceral_fat": 5,  // 继承上次记录的内脏脂肪等级
    "bmi": 22.57,       // 自动计算的BMI
    "created_at": "2025-01-02T00:00:00"
  },
  "message": "添加健康记录成功",
  "status": "success"
}
```

### 6.4 删除健康数据

**URL**: `/api/v1/health/profile`
**方法**: `DELETE`
**描述**: 删除健康数据

**响应**:

```json
{
  "data": {},
  "message": "健康数据已删除",
  "status": "success"
}
```

### 6.5 获取健康数据历史记录

**URL**: `/api/v1/health/history`
**方法**: `GET`
**描述**: 获取用户的所有健康数据记录

**响应**:

```json
{
  "data": [
    {
      "id": 2,
      "height": 175,
      "weight": 69,
      "body_fat": 19.5,
      "muscle_rate": 30,
      "water_rate": 50,
      "bone_mass": 5,
      "protein_rate": 15,
      "bmr": 1500,
      "visceral_fat": 5,
      "bmi": 22.57,
      "created_at": "2025-01-02T00:00:00"
    },
    {
      "id": 1,
      "height": 175,
      "weight": 70,
      "body_fat": 20,
      "muscle_rate": 30,
      "water_rate": 50,
      "bone_mass": 5,
      "protein_rate": 15,
      "bmr": 1500,
      "visceral_fat": 5,
      "bmi": 22.86,
      "created_at": "2025-01-01T00:00:00"
    }
  ],
  "message": "获取健康数据历史记录成功",
  "status": "success"
}
```

## 7. 错误处理

### 7.1 常见错误码

| 状态码 | 描述 | 示例消息 |
|--------|------|----------|
| 400 | 请求参数错误 | "用户名或邮箱已存在" |
| 401 | 未认证或认证失败 | "无效或过期的令牌" |
| 403 | 权限不足 | "没有权限访问此资源" |
| 404 | 资源不存在 | "运动记录不存在" |
| 500 | 服务器内部错误 | "服务器内部错误" |

### 7.2 错误响应格式

```json
{
  "detail": "错误消息"
}
```

## 8. 示例使用

### 8.1 注册用户

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "password123", "email": "test@example.com"}'
```

### 8.2 登录并获取令牌

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "password123"}'
```

### 8.3 使用令牌访问受保护资源

```bash
curl -X GET "http://localhost:8000/api/v1/activities" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8.4 上传 FIT 文件

```bash
curl -X POST "http://localhost:8000/api/v1/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/activity.fit"
```

## 9. 健康检查

**URL**: `/health`
**方法**: `GET`
**描述**: 检查服务健康状态

**响应**:

```json
{
  "status": "ok",
  "service": "Cycling POC API",
  "version": "1.0.0"
}
```