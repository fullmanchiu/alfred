# 记账功能 API 接口文档

> **文档版本**: v2.0
> **最后更新**: 2025-01-08
> **维护团队**: 后端开发团队
> **参考文档**: `/Alfred/docs/api/accounting_feature.md`

---

## 📋 文档说明

本文档详细定义了记账功能的所有后端API接口，包括请求格式、响应格式、错误处理等。

**目标读者**: 前端开发团队、测试团队
**API Base URL**: `{BASE_URL}/api/v1`

---

## 🔐 认证说明

### JWT Token 认证

所有API需要在请求头中携带 JWT Token：

```http
Authorization: Bearer {access_token}
```

**获取Token方式**:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "test_user",
  "password": "password123"
}
```

**认证流程**:
1. 用户登录后获取 access_token
2. 前端将 token 存储在本地
3. 每次API请求在 Header 中携带 token
4. Token 过期后返回 401，前端需跳转到登录页

---

## 📊 核心数据模型

### 1. Account（账户）

```typescript
interface Account {
  id: number;
  name: string;              // 账户名称，如"招商银行"
  account_type: string;      // 类型：bank_card | cash | alipay | wechat | credit_card
  account_number?: string;   // 账号（可选）
  balance: number;           // 当前余额
  currency: string;          // 货币类型，默认"CNY"
  icon?: string;             // 图标标识
  color?: string;            // 颜色代码（HEX）
  is_default: boolean;       // 是否为默认账户
  notes?: string;            // 备注
  created_at: string;        // ISO 8601格式
}
```

---

### 2. Transaction（交易）

```typescript
interface Transaction {
  id: number;
  type: TransactionType;     // 交易类型
  amount: number;            // 金额
  from_account?: {           // 转出账户（支出/转账/借出）
    id: number;
    name: string;
  };
  to_account?: {             // 转入账户（收入/转账/借入）
    id: number;
    name: string;
  };
  category?: {               // 交易分类
    id: number;
    name: string;
    icon?: string;
  };
  transaction_date: string;  // 交易时间（ISO 8601）
  notes?: string;            // 备注
  location?: string;         // 交易地点
  tags?: Tag[];              // 标签列表
  image_count: number;       // 图片数量
  created_at: string;
}

type TransactionType =
  | 'income'    // 收入
  | 'expense'   // 支出
  | 'transfer'  // 转账
  | 'loan_in'   // 借入
  | 'loan_out'  // 借出
  | 'repayment'; // 还款
```

---

### 3. Category（分类）

```typescript
interface Category {
  id: number;
  name: string;              // 分类名称
  type: 'income' | 'expense'; // 分类类型
  parent_id?: number;        // 父分类ID
  icon?: string;             // 图标标识
  color?: string;            // 颜色代码
  is_system: boolean;        // 是否为系统默认分类
  sort_order: number;        // 排序顺序
  subcategories?: Category[]; // 子分类列表
}
```

---

### 4. Budget（预算）

```typescript
interface Budget {
  id: number;
  category: {
    id: number;
    name: string;
    icon?: string;
    color?: string;
  };
  amount: number;            // 预算金额
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  alert_threshold: number;   // 预警阈值（0-100百分比）
  start_date: string;
  end_date?: string;
}
```

---

## 🚀 API 端点详解

### 一、账户管理 API

#### 1.1 获取账户列表

```http
GET /api/v1/accounts
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": 1,
        "name": "招商银行",
        "account_type": "bank_card",
        "account_number": "1234",
        "balance": 5000.00,
        "currency": "CNY",
        "icon": "bank",
        "color": "#1890ff",
        "is_default": true,
        "notes": "工资卡",
        "created_at": "2026-01-08T12:00:00Z"
      }
    ],
    "total_balance": 5000.00
  }
}
```

---

#### 1.2 创建账户

```http
POST /api/v1/accounts
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "招商银行",
  "account_type": "bank_card",
  "account_number": "1234",
  "initial_balance": 5000.0,
  "currency": "CNY",
  "icon": "bank",
  "color": "#1890ff",
  "notes": "工资卡",
  "is_default": true
}
```

**account_type 可选值**:
- `bank_card` - 银行卡
- `cash` - 现金
- `alipay` - 支付宝
- `wechat` - 微信
- `credit_card` - 信用卡

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "招商银行",
    "balance": 5000.0
  },
  "message": "账户创建成功"
}
```

---

#### 1.3 更新账户

```http
PUT /api/v1/accounts/{account_id}
Content-Type: application/json
```

**请求体**（所有字段可选）:
```json
{
  "name": "招商银行（改名）",
  "is_default": false,
  "notes": "备注更新"
}
```

---

#### 1.4 删除账户

```http
DELETE /api/v1/accounts/{account_id}
```

⚠️ **注意**: 软删除，账户会被标记为`is_active=false`，历史数据不会丢失。

---

### 二、分类管理 API

#### 2.1 获取分类列表

```http
GET /api/v1/categories?type=expense
```

**查询参数**:
- `type` (可选): `income` 或 `expense`，筛选分类类型

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "餐饮",
      "type": "expense",
      "icon": "food",
      "color": "#ff4d4f",
      "is_system": true,
      "parent_id": null,
      "sort_order": 0,
      "subcategories": [
        {
          "id": 11,
          "name": "早餐",
          "type": "expense",
          "parent_id": 1
        }
      ]
    }
  ]
}
```

---

#### 2.2 创建分类

```http
POST /api/v1/categories
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "宠物",
  "type": "expense",
  "parent_id": null,
  "icon": "pet",
  "color": "#722ed1"
}
```

---

#### 2.3 更新分类

```http
PUT /api/v1/categories/{category_id}
Content-Type: application/json
```

⚠️ **注意**: 系统默认分类（`is_system=true`）不能修改名称和类型。

---

#### 2.4 删除分类

```http
DELETE /api/v1/categories/{category_id}
```

⚠️ **注意**: 系统默认分类不能删除。

---

### 三、交易管理 API

#### 3.1 创建交易

```http
POST /api/v1/transactions
Content-Type: application/json
```

**请求体**:
```json
{
  "type": "expense",
  "amount": 50.0,
  "from_account_id": 1,
  "category_id": 12,
  "transaction_date": "2026-01-08T12:00:00Z",
  "tags": ["午餐", "工作日"],
  "notes": "公司楼下餐厅",
  "location": "朝阳区xxx",
  "merchant": "麦当劳"
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ✅ | 交易类型：income, expense, transfer, loan_in, loan_out, repayment |
| amount | number | ✅ | 金额（必须>0） |
| from_account_id | number | ⚠️ | 支出/转账必填 |
| to_account_id | number | ⚠️ | 收入/转账必填 |
| category_id | number | ❌ | 分类ID |
| transaction_date | string | ❌ | 交易时间（ISO 8601），默认当前时间 |
| tags | string[] | ❌ | 标签列表 |
| notes | string | ❌ | 备注 |
| location | string | ❌ | 交易地点 |
| merchant | string | ❌ | 商户名称 |
| receipt_number | string | ❌ | 收据号 |

**不同交易类型的要求**:
- **收入 (income)**：必须提供`to_account_id`
- **支出 (expense)**：必须提供`from_account_id`
- **转账 (transfer)**：必须提供`from_account_id`和`to_account_id`，且两者不同
- **借入 (loan_in)**：必须提供`to_account_id`
- **借出 (loan_out)**：必须提供`from_account_id`
- **还款 (repayment)**：可选提供`related_transaction_id`关联原借贷

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "expense",
    "amount": 50.0
  },
  "message": "交易创建成功"
}
```

---

#### 3.2 获取交易列表

```http
GET /api/v1/transactions?type=expense&category_id=12&page=1&page_size=20
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ❌ | 交易类型筛选 |
| category_id | number | ❌ | 分类筛选 |
| account_id | number | ❌ | 账户筛选 |
| start_date | date | ❌ | 开始日期（YYYY-MM-DD） |
| end_date | date | ❌ | 结束日期（YYYY-MM-DD） |
| tag | string | ❌ | 按标签筛选 |
| page | number | ❌ | 页码，默认1 |
| page_size | number | ❌ | 每页数量，默认20 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "type": "expense",
        "amount": 50.0,
        "from_account": {
          "id": 1,
          "name": "招商银行"
        },
        "to_account": null,
        "category": {
          "id": 12,
          "name": "午餐",
          "icon": "food"
        },
        "transaction_date": "2026-01-08T12:00:00Z",
        "notes": "公司楼下餐厅",
        "location": "朝阳区xxx",
        "tags": ["午餐", "工作日"],
        "image_count": 1
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 45
    }
  }
}
```

---

#### 3.3 获取交易详情

```http
GET /api/v1/transactions/{transaction_id}
```

---

#### 3.4 更新交易

```http
PUT /api/v1/transactions/{transaction_id}
Content-Type: application/json
```

⚠️ **注意**: 不允许修改金额和账户（避免余额计算混乱）。

---

#### 3.5 删除交易

```http
DELETE /api/v1/transactions/{transaction_id}
```

💡 **提示**: 删除交易时会自动恢复相关账户的余额。

---

### 四、预算管理 API

#### 4.1 获取预算列表

```http
GET /api/v1/budgets?period=monthly
```

**查询参数**:
- `period` (可选): `monthly`, `yearly`, `weekly`, `daily`

---

#### 4.2 创建预算

```http
POST /api/v1/budgets
Content-Type: application/json
```

**请求体**:
```json
{
  "category_id": 1,
  "amount": 2000.0,
  "period": "monthly",
  "alert_threshold": 80.0
}
```

---

### 五、统计分析 API

#### 5.1 获取统计概览

```http
GET /api/v1/statistics/overview?period=month
```

**查询参数**:
- `period`: `week`, `month`, `year`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "month",
    "start_date": "2025-12-08T00:00:00Z",
    "end_date": "2026-01-07T23:59:59Z",
    "income_total": 8000.0,
    "expense_total": 3500.0,
    "net_savings": 4500.0,
    "category_breakdown": [
      {
        "name": "餐饮",
        "icon": "food",
        "color": "#ff4d4f",
        "total": 1200.0
      }
    ]
  }
}
```

---

#### 5.2 获取预算统计

```http
GET /api/v1/statistics/budget
```

---

### 六、图片上传 API

#### 6.1 上传交易图片

```http
POST /api/v1/transactions/{transaction_id}/images
Content-Type: multipart/form-data
```

**请求体**:
- `files`: 图片文件数组（支持批量上传）

---

#### 6.2 删除交易图片

```http
DELETE /api/v1/transactions/{transaction_id}/images/{image_id}
```

---

## ⚠️ 错误处理

### 错误响应格式

所有API在出错时返回以下格式：

```json
{
  "detail": "错误信息描述"
}
```

### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（token无效或过期） |
| 403 | 禁止访问（尝试删除系统分类等） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误示例

**400 Bad Request**:
```json
{
  "detail": "必须指定支出账户"
}
```

**403 Forbidden**:
```json
{
  "detail": "系统默认分类不能删除"
}
```

---

## 🧪 测试环境

### Base URL
```
开发环境: http://localhost:8000/api/v1
测试环境: https://api-test.example.com/api/v1
生产环境: https://api.example.com/api/v1
```

### 测试账号
```
用户名: test_user
密码: password123
```

---

## 📝 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v2.0 | 2025-01-08 | 前后端对接完成，API响应格式统一 |
| v1.0 | 2025-01-07 | 初始版本 |

---

## 🔗 相关文档

- [需求文档](/docs/accounting_requirements.md)
- [待办事项](/docs/accounting_todos.md)
- [后端详细文档](/Alfred/docs/api/accounting_feature.md)
