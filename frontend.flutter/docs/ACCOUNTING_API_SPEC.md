# 记账功能 API 接口文档

> **版本**: v1.0
> **更新时间**: 2025-01-07
> **状态**: 开发中

## 概述

本文档描述了 ColaFit 应用中记账功能所需的后端 API 接口。记账功能支持用户记录日常收支、管理分类、设置预算，并查看统计分析。

---

## 基础信息

### API 基础 URL

```
Base URL: {BASE_URL}/api/v1
```

### 认证方式

所有接口需要在请求头中携带 JWT Token：

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

**未授权处理**:
- 返回 `401 Unauthorized` 时，前端会清除本地 token 并跳转到登录页

---

## 一、记账记录接口

### 1.1 获取记账记录列表

**接口**: `GET /transactions`

**功能**: 获取用户的记账记录列表，支持多种筛选条件和分页

**请求参数 (Query Params)**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `type` | string | 否 | 收支类型筛选 | `income` / `expense` |
| `category_id` | integer | 否 | 分类 ID 筛选 | `1` |
| `start_date` | string | 否 | 开始日期 (YYYY-MM-DD) | `2025-01-01` |
| `end_date` | string | 否 | 结束日期 (YYYY-MM-DD) | `2025-01-31` |
| `min_amount` | float | 否 | 最小金额 | `100.00` |
| `max_amount` | float | 否 | 最大金额 | `1000.00` |
| `keyword` | string | 否 | 搜索关键词（备注字段） | `午餐` |
| `page` | integer | 否 | 页码，默认 1 | `1` |
| `page_size` | integer | 否 | 每页数量，默认 20 | `20` |

**响应示例**:

```json
{
  "transactions": [
    {
      "id": 1,
      "amount": 50.00,
      "type": "expense",
      "category_id": 1,
      "note": "午餐",
      "date": "2025-01-07",
      "tags": null,
      "created_at": "2025-01-07T12:00:00Z",
      "updated_at": "2025-01-07T12:00:00Z"
    },
    {
      "id": 2,
      "amount": 8000.00,
      "type": "income",
      "category_id": 4,
      "note": "一月份工资",
      "date": "2025-01-01",
      "tags": ["工资", "收入"],
      "created_at": "2025-01-01T09:00:00Z",
      "updated_at": "2025-01-01T09:00:00Z"
    }
  ],
  "total": 2,
  "page": 1,
  "page_size": 20
}
```

---

### 1.2 创建记账记录

**接口**: `POST /transactions`

**功能**: 创建新的记账记录

**请求体 (Request Body)**:

```json
{
  "amount": 50.00,
  "type": "expense",
  "category_id": 1,
  "date": "2025-01-07",
  "note": "午餐",
  "tags": ["餐饮"]
}
```

**字段说明**:

| 字段名 | 类型 | 必填 | 说明 | 约束 |
|--------|------|------|------|------|
| `amount` | float | 是 | 金额 | 必须 > 0 |
| `type` | string | 是 | 收支类型 | `income` 或 `expense` |
| `category_id` | integer | 是 | 分类 ID | 必须存在且类型匹配 |
| `date` | string | 是 | 日期 | 格式: YYYY-MM-DD |
| `note` | string | 否 | 备注 | 最大长度 500 |
| `tags` | array | 否 | 标签数组 | 字符串数组 |

**响应示例**:

```json
{
  "data": {
    "id": 3,
    "amount": 50.00,
    "type": "expense",
    "category_id": 1,
    "note": "午餐",
    "date": "2025-01-07",
    "tags": ["餐饮"],
    "created_at": "2025-01-07T12:30:00Z",
    "updated_at": "2025-01-07T12:30:00Z"
  },
  "message": "记录创建成功"
}
```

---

### 1.3 更新记账记录

**接口**: `PUT /transactions/{id}`

**功能**: 更新指定的记账记录

**路径参数**:
- `id`: 记账记录 ID

**请求体**:

```json
{
  "amount": 60.00,
  "type": "expense",
  "category_id": 1,
  "date": "2025-01-07",
  "note": "午餐加了鸡腿",
  "tags": ["餐饮", "美味"]
}
```

**字段说明**: 同创建接口，所有字段可选，只更新提供的字段

**响应示例**:

```json
{
  "data": {
    "id": 3,
    "amount": 60.00,
    "type": "expense",
    "category_id": 1,
    "note": "午餐加了鸡腿",
    "date": "2025-01-07",
    "tags": ["餐饮", "美味"],
    "created_at": "2025-01-07T12:30:00Z",
    "updated_at": "2025-01-07T12:35:00Z"
  },
  "message": "记录更新成功"
}
```

---

### 1.4 删除记账记录

**接口**: `DELETE /transactions/{id}`

**功能**: 删除指定的记账记录

**路径参数**:
- `id`: 记账记录 ID

**响应示例**:

```json
{
  "message": "记录删除成功"
}
```

---

### 1.5 获取记账统计

**接口**: `GET /transactions/stats`

**功能**: 获取记账统计数据，包括总收入、总支出、结余、分类占比等

**请求参数 (Query Params)**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `type` | string | 否 | 收支类型筛选 | `income` / `expense` |
| `period` | string | 否 | 统计周期 | `daily` / `weekly` / `monthly` / `yearly` |
| `start_date` | string | 否 | 开始日期 (YYYY-MM-DD) | `2025-01-01` |
| `end_date` | string | 否 | 结束日期 (YYYY-MM-DD) | `2025-01-31` |
| `category_id` | integer | 否 | 分类 ID 筛选 | `1` |

**响应示例**:

```json
{
  "total_income": 8000.00,
  "total_expense": 1500.50,
  "balance": 6499.50,
  "transaction_count": 25,
  "by_category": {
    "餐饮": {
      "amount": 500.00,
      "count": 15,
      "percentage": 33.3
    },
    "交通": {
      "amount": 200.00,
      "count": 5,
      "percentage": 13.3
    },
    "购物": {
      "amount": 800.50,
      "count": 5,
      "percentage": 53.4
    }
  },
  "by_date": [
    {
      "date": "2025-01-01",
      "income": 0.00,
      "expense": 50.00
    },
    {
      "date": "2025-01-02",
      "income": 0.00,
      "expense": 30.00
    }
  ]
}
```

---

## 二、分类管理接口

### 2.1 获取分类列表

**接口**: `GET /categories`

**功能**: 获取用户的分类列表，支持按类型筛选

**请求参数 (Query Params)**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `type` | string | 否 | 分类类型筛选 | `income` / `expense` |

**响应示例**:

```json
{
  "categories": [
    {
      "id": 1,
      "name": "餐饮",
      "type": "expense",
      "icon": "restaurant",
      "color": "#FF5722",
      "sort_order": 1,
      "is_default": true
    },
    {
      "id": 2,
      "name": "交通",
      "type": "expense",
      "icon": "directions_car",
      "color": "#2196F3",
      "sort_order": 2,
      "is_default": true
    },
    {
      "id": 3,
      "name": "工资",
      "type": "income",
      "icon": "attach_money",
      "color": "#4CAF50",
      "sort_order": 1,
      "is_default": true
    }
  ]
}
```

**默认分类说明**:

系统应自动为每个新用户创建以下默认分类：

**支出分类**:
- 餐饮 (restaurant, #FF5722)
- 交通 (directions_car, #2196F3)
- 购物 (shopping_cart, #9C27B0)
- 娱乐 (movie, #E91E63)
- 医疗 (local_hospital, #F44336)
- 教育 (school, #00BCD4)
- 其他 (category, #9E9E9E)

**收入分类**:
- 工资 (attach_money, #4CAF50)
- 奖金 (card_giftcard, #FF9800)
- 投资 (trending_up, #009688)
- 其他 (category, #9E9E9E)

---

### 2.2 创建分类

**接口**: `POST /categories`

**功能**: 创建新的自定义分类

**请求体**:

```json
{
  "name": "健身",
  "type": "expense",
  "icon": "fitness_center",
  "color": "#FF4081",
  "sort_order": 10
}
```

**字段说明**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `name` | string | 是 | 分类名称，最大长度 20 |
| `type` | string | 是 | 分类类型，`income` 或 `expense` |
| `icon` | string | 否 | 图标名称（Material Icons） |
| `color` | string | 否 | 颜色值（十六进制） |
| `sort_order` | integer | 否 | 排序序号 |

**响应示例**:

```json
{
  "data": {
    "id": 10,
    "name": "健身",
    "type": "expense",
    "icon": "fitness_center",
    "color": "#FF4081",
    "sort_order": 10,
    "is_default": false
  },
  "message": "分类创建成功"
}
```

---

### 2.3 更新分类

**接口**: `PUT /categories/{id}`

**功能**: 更新指定的分类信息

**路径参数**:
- `id`: 分类 ID

**请求体**:

```json
{
  "name": "健身运动",
  "icon": "fitness_center",
  "color": "#FF4081",
  "sort_order": 10
}
```

**注意**:
- 不允许修改 `type` 字段
- 默认分类（`is_default=true`）不允许修改 `name` 和 `type`

**响应示例**:

```json
{
  "data": {
    "id": 10,
    "name": "健身运动",
    "type": "expense",
    "icon": "fitness_center",
    "color": "#FF4081",
    "sort_order": 10,
    "is_default": false
  },
  "message": "分类更新成功"
}
```

---

### 2.4 删除分类

**接口**: `DELETE /categories/{id}`

**功能**: 删除指定的分类

**路径参数**:
- `id`: 分类 ID

**限制**:
- 默认分类（`is_default=true`）不允许删除
- 如果该分类下有记账记录，需要考虑是否允许删除或级联处理

**响应示例**:

```json
{
  "message": "分类删除成功"
}
```

**错误响应** (尝试删除默认分类):

```json
{
  "detail": "默认分类不能删除"
}
```

---

## 三、预算管理接口

### 3.1 获取预算列表

**接口**: `GET /budgets`

**功能**: 获取用户的预算设置列表

**请求参数 (Query Params)**:

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `period` | string | 否 | 预算周期筛选 | `daily` / `weekly` / `monthly` / `yearly` |

**响应示例**:

```json
{
  "budgets": [
    {
      "id": 1,
      "category_id": 1,
      "category_name": "餐饮",
      "amount": 1000.00,
      "period": "monthly",
      "start_date": "2025-01-01",
      "end_date": null,
      "used_amount": 500.00,
      "remaining_amount": 500.00,
      "progress_percentage": 50.0,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-07T12:00:00Z"
    },
    {
      "id": 2,
      "category_id": 2,
      "category_name": "交通",
      "amount": 500.00,
      "period": "monthly",
      "start_date": "2025-01-01",
      "end_date": null,
      "used_amount": 200.00,
      "remaining_amount": 300.00,
      "progress_percentage": 40.0,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-07T12:00:00Z"
    }
  ]
}
```

**字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `used_amount` | float | 已使用金额（根据当前周期内的支出计算） |
| `remaining_amount` | float | 剩余金额 |
| `progress_percentage` | float | 使用进度百分比 (0-100) |

---

### 3.2 创建预算

**接口**: `POST /budgets`

**功能**: 创建新的预算设置

**请求体**:

```json
{
  "category_id": 1,
  "amount": 1000.00,
  "period": "monthly",
  "start_date": "2025-01-01",
  "end_date": null
}
```

**字段说明**:

| 字段名 | 类型 | 必填 | 说明 | 约束 |
|--------|------|------|------|------|
| `category_id` | integer | 是 | 分类 ID | 必须是支出分类 |
| `amount` | float | 是 | 预算金额 | 必须 > 0 |
| `period` | string | 是 | 预算周期 | `daily` / `weekly` / `monthly` / `yearly` |
| `start_date` | string | 是 | 开始日期 | 格式: YYYY-MM-DD |
| `end_date` | string | 否 | 结束日期 | 格式: YYYY-MM-DD，为空表示无限期 |

**响应示例**:

```json
{
  "data": {
    "id": 3,
    "category_id": 1,
    "amount": 1000.00,
    "period": "monthly",
    "start_date": "2025-01-01",
    "end_date": null,
    "created_at": "2025-01-07T12:00:00Z",
    "updated_at": "2025-01-07T12:00:00Z"
  },
  "message": "预算创建成功"
}
```

---

### 3.3 更新预算

**接口**: `PUT /budgets/{id}`

**功能**: 更新指定的预算设置

**路径参数**:
- `id`: 预算 ID

**请求体**:

```json
{
  "amount": 1200.00,
  "period": "monthly",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31"
}
```

**响应示例**:

```json
{
  "data": {
    "id": 3,
    "category_id": 1,
    "amount": 1200.00,
    "period": "monthly",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "created_at": "2025-01-07T12:00:00Z",
    "updated_at": "2025-01-07T12:30:00Z"
  },
  "message": "预算更新成功"
}
```

---

### 3.4 删除预算

**接口**: `DELETE /budgets/{id}`

**功能**: 删除指定的预算设置

**路径参数**:
- `id`: 预算 ID

**响应示例**:

```json
{
  "message": "预算删除成功"
}
```

---

## 四、错误响应规范

所有接口在出错时应返回以下格式：

```json
{
  "detail": "错误信息描述"
}
```

### 常见错误码

| HTTP 状态码 | 说明 | 示例 |
|------------|------|------|
| `400` | 请求参数错误 | 金额小于等于 0 |
| `401` | 未授权 | Token 无效或过期 |
| `403` | 禁止访问 | 尝试删除默认分类 |
| `404` | 资源不存在 | 记账记录不存在 |
| `500` | 服务器内部错误 | 数据库错误 |

### 错误示例

```json
{
  "detail": "分类不存在"
}
```

```json
{
  "detail": "金额必须大于 0"
}
```

```json
{
  "detail": "登录已过期，请重新登录"
}
```

---

## 五、数据模型

### 5.1 Transaction (记账记录)

```json
{
  "id": 1,
  "amount": 50.00,
  "type": "expense",
  "category_id": 1,
  "note": "午餐",
  "date": "2025-01-07",
  "tags": ["餐饮"],
  "created_at": "2025-01-07T12:00:00Z",
  "updated_at": "2025-01-07T12:00:00Z"
}
```

### 5.2 Category (分类)

```json
{
  "id": 1,
  "name": "餐饮",
  "type": "expense",
  "icon": "restaurant",
  "color": "#FF5722",
  "sort_order": 1,
  "is_default": true
}
```

### 5.3 Budget (预算)

```json
{
  "id": 1,
  "category_id": 1,
  "amount": 1000.00,
  "period": "monthly",
  "start_date": "2025-01-01",
  "end_date": null,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-07T12:00:00Z"
}
```

---

## 六、开发优先级

### 第一阶段 (MVP - 最小可行产品)

必须实现的接口：

1. ✅ **记账记录 CRUD**
   - `POST /transactions` - 创建记录
   - `GET /transactions` - 获取列表（带筛选）
   - `PUT /transactions/{id}` - 更新记录
   - `DELETE /transactions/{id}` - 删除记录
   - `GET /transactions/stats` - 获取统计

2. ✅ **分类管理**
   - `GET /categories` - 获取列表
   - `POST /categories` - 创建分类
   - `PUT /categories/{id}` - 更新分类
   - `DELETE /categories/{id}` - 删除分类

3. ✅ **默认分类初始化**
   - 用户注册时自动创建默认分类

### 第二阶段 (增强功能)

4. ⏳ **预算管理**
   - `GET /budgets` - 获取列表
   - `POST /budgets` - 创建预算
   - `PUT /budgets/{id}` - 更新预算
   - `DELETE /budgets/{id}` - 删除预算

---

## 七、测试数据示例

### 测试用户

```json
{
  "username": "test_user",
  "password": "password123"
}
```

### 测试记账记录

```json
[
  {
    "amount": 50.00,
    "type": "expense",
    "category_id": 1,
    "date": "2025-01-07",
    "note": "午餐"
  },
  {
    "amount": 30.00,
    "type": "expense",
    "category_id": 2,
    "date": "2025-01-07",
    "note": "地铁"
  },
  {
    "amount": 8000.00,
    "type": "income",
    "category_id": 3,
    "date": "2025-01-01",
    "note": "一月份工资"
  }
]
```

---

## 八、附录

### A. 支持的图标列表 (Material Icons)

**常用图标**:
- `restaurant` - 餐饮
- `directions_car` - 交通
- `shopping_cart` - 购物
- `movie` - 娱乐
- `local_hospital` - 医疗
- `school` - 教育
- `fitness_center` - 健身
- `attach_money` - 工资
- `card_giftcard` - 奖金
- `trending_up` - 投资
- `category` - 其他

### B. 常用颜色值

```json
{
  "red": "#F44336",
  "orange": "#FF9800",
  "amber": "#FFC107",
  "green": "#4CAF50",
  "teal": "#009688",
  "blue": "#2196F3",
  "purple": "#9C27B0",
  "grey": "#9E9E9E"
}
```

---

## 九、联系与反馈

如有疑问或需要澄清，请随时联系前端开发团队。

**前端技术栈**:
- Flutter 3.0+
- Material 3 Design
- HTTP 客户端: `http` package

**关键文件**:
- API 服务: `lib/services/api_service.dart`
- 数据模型: `lib/models/`
- 前端路由: `/accounting`, `/categories`, `/budgets`

---

**最后更新**: 2025-01-07
**文档版本**: v1.0
