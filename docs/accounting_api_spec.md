# 记账功能 API 接口文档

> **文档版本**: v2.1
> **最后更新**: 2026-02-09
> **后端实现**: Spring Boot (Kotlin)
> **维护团队**: 后端开发团队
> **参考文档**: `/Alfred/docs/api/accounting_feature.md`

---

## 📋 文档说明

本文档详细定义了记账功能的所有后端API接口，包括请求格式、响应格式、错误处理等。

**技术栈**: Spring Boot 3.5.9 + Kotlin 1.9.25
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

## 🚀 v2.0 新增API接口

### 七、搜索API

#### 7.1 基础搜索

```http
GET /api/v1/transactions/search?q={keyword}
```

**查询参数**:
- `q` (必填): 搜索关键词

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "type": "expense",
        "amount": 50.0,
        "notes": "公司楼下餐厅",
        "merchant": "麦当劳",
        "tags": ["午餐", "工作日"]
      }
    ],
    "total": 1
  }
}
```

**搜索范围**: 商户名称、备注、标签

---

#### 7.2 高级搜索

```http
POST /api/v1/transactions/search/advanced
Content-Type: application/json
```

**请求体**:
```json
{
  "keyword": "午餐",
  "amount_min": 10.0,
  "amount_max": 100.0,
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "category_id": 12,
  "account_id": 1,
  "tags": ["工作日"]
}
```

**字段说明**:
- `keyword`: 搜索关键词（可选）
- `amount_min`: 最小金额（可选）
- `amount_max`: 最大金额（可选）
- `start_date`: 开始日期（可选）
- `end_date`: 结束日期（可选）
- `category_id`: 分类ID（可选）
- `account_id`: 账户ID（可选）
- `tags`: 标签列表（可选）

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "type": "expense",
        "amount": 50.0,
        "transaction_date": "2026-01-08T12:00:00Z",
        "notes": "公司楼下餐厅",
        "merchant": "麦当劳",
        "tags": ["午餐", "工作日"],
        "category": {
          "id": 12,
          "name": "午餐",
          "icon": "food"
        },
        "from_account": {
          "id": 1,
          "name": "招商银行"
        }
      }
    ],
    "total": 1
  }
}
```

---

### 八、数据导出API

#### 8.1 导出交易数据

```http
GET /api/v1/export/transactions?start_date={}&end_date={}&format={}
```

**查询参数**:
- `start_date` (可选): 开始日期（YYYY-MM-DD）
- `end_date` (可选): 结束日期（YYYY-MM-DD）
- `format` (必填): 导出格式（excel 或 csv）

**响应**:
- Excel: 返回 .xlsx 文件
- CSV: 返回 .csv 文件

**响应头**:
```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=transactions_20260108.xlsx
```

💡 **提示**: 不指定日期范围时，默认导出全部交易数据。

---

### 九、数据备份API

#### 9.1 创建备份

```http
POST /api/v1/backup/create
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "backup_id": "backup_20260112_143022",
    "created_at": "2026-01-12T14:30:22Z",
    "size": "2.5MB"
  },
  "message": "备份创建成功"
}
```

**说明**:
- 自动备份当前用户的所有记账数据
- 备份文件格式: `backup_YYYYMMDD_HHMMSS`

---

#### 9.2 获取备份列表

```http
GET /api/v1/backup/list
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "backup_id": "backup_20260112_143022",
        "created_at": "2026-01-12T14:30:22Z",
        "size": "2.5MB"
      },
      {
        "backup_id": "backup_20260111_120000",
        "created_at": "2026-01-11T12:00:00Z",
        "size": "2.4MB"
      }
    ]
  }
}
```

---

#### 9.3 恢复备份

```http
POST /api/v1/backup/restore
Content-Type: application/json
```

**请求体**:
```json
{
  "backup_id": "backup_20260112_143022"
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "backup_id": "backup_20260112_143022",
    "restored_at": "2026-01-12T15:00:00Z"
  },
  "message": "备份恢复成功"
}
```

⚠️ **注意**: 恢复备份会覆盖当前数据，操作不可逆。

---

### 十、定期交易API

#### 10.1 获取定期交易列表

```http
GET /api/v1/recurring-transactions
```

**查询参数**:
- `is_active` (可选): true/false，筛选启用状态

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "房租",
      "amount": 3000.0,
      "type": "expense",
      "category": {
        "id": 4,
        "name": "居住",
        "icon": "home"
      },
      "account": {
        "id": 1,
        "name": "招商银行"
      },
      "period": "monthly",
      "next_date": "2026-02-01T00:00:00Z",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 10.2 创建定期交易

```http
POST /api/v1/recurring-transactions
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "房租",
  "amount": 3000.0,
  "type": "expense",
  "category_id": 4,
  "from_account_id": 1,
  "period": "monthly",
  "start_date": "2026-01-01T00:00:00Z",
  "note": "每月1号交房租"
}
```

**period 可选值**:
- `daily` - 每日
- `weekly` - 每周
- `monthly` - 每月
- `yearly` - 每年

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "房租",
    "next_date": "2026-02-01T00:00:00Z"
  },
  "message": "定期交易创建成功"
}
```

---

#### 10.3 更新定期交易

```http
PUT /api/v1/recurring-transactions/{id}
Content-Type: application/json
```

**请求体**（所有字段可选）:
```json
{
  "amount": 3500.0,
  "is_active": false
}
```

**可更新字段**:
- `name`
- `amount`
- `category_id`
- `account_id`
- `period`
- `is_active`
- `note`

---

#### 10.4 删除定期交易

```http
DELETE /api/v1/recurring-transactions/{id}
```

💡 **提示**: 删除定期交易不会影响已生成的交易记录。

---

#### 10.5 查看已生成的交易

```http
GET /api/v1/recurring-transactions/{id}/instances
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "recurring_transaction": {
      "id": 1,
      "name": "房租"
    },
    "instances": [
      {
        "id": 101,
        "amount": 3000.0,
        "transaction_date": "2026-01-01T00:00:00Z",
        "status": "generated"
      },
      {
        "id": 102,
        "amount": 3000.0,
        "transaction_date": "2026-02-01T00:00:00Z",
        "status": "scheduled"
      }
    ]
  }
}
```

**status 状态**:
- `generated` - 已生成
- `scheduled` - 已计划（待生成）

---

### 十一、债务API

#### 11.1 获取所有债款关系

```http
GET /api/v1/debts
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "i_owe": [
      {
        "person_name": "张三",
        "total_amount": 5000.0,
        "paid_amount": 2000.0,
        "remaining_amount": 3000.0,
        "transaction_count": 3
      }
    ],
    "owe_me": [
      {
        "person_name": "李四",
        "total_amount": 1000.0,
        "paid_amount": 500.0,
        "remaining_amount": 500.0,
        "transaction_count": 2
      }
    ]
  }
}
```

**说明**:
- `i_owe`: 我欠别人的（借入的债务）
- `owe_me`: 别人欠我的（借出的债务）

---

#### 11.2 获取与某人的债款详情

```http
GET /api/v1/debts/{person_name}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "person_name": "张三",
    "relationship": "i_owe",
    "total_amount": 5000.0,
    "paid_amount": 2000.0,
    "remaining_amount": 3000.0,
    "transactions": [
      {
        "id": 1,
        "type": "loan_in",
        "amount": 5000.0,
        "transaction_date": "2026-01-01T00:00:00Z",
        "notes": "借款"
      },
      {
        "id": 2,
        "type": "repayment",
        "amount": 2000.0,
        "transaction_date": "2026-01-15T00:00:00Z",
        "notes": "部分还款"
      }
    ]
  }
}
```

**relationship 值**:
- `i_owe` - 我欠此人
- `owe_me` - 此人欠我

---

#### 11.3 结清债款

```http
POST /api/v1/debts/{id}/settle
Content-Type: application/json
```

**请求体**:
```json
{
  "settle_amount": 3000.0,
  "note": "结清剩余欠款"
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "transaction_id": 3,
    "remaining_amount": 0.0
  },
  "message": "债款已结清"
}
```

💡 **提示**:
- `settle_amount` 为可选，不指定时默认结清全部剩余金额
- 系统会自动创建还款交易记录

---

### 十二、账单提醒API

#### 12.1 获取账单提醒列表

```http
GET /api/v1/bill-reminders
```

**查询参数**:
- `status` (可选): upcoming/paid/overdue

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "信用卡还款",
      "amount": 5000.0,
      "due_date": "2026-01-20T00:00:00Z",
      "account": {
        "id": 1,
        "name": "招商银行信用卡"
      },
      "category": {
        "id": 10,
        "name": "还款"
      },
      "reminder_days": 3,
      "status": "upcoming",
      "is_recurring": true,
      "recurring_period": "monthly"
    }
  ]
}
```

**status 状态**:
- `upcoming` - 即将到期
- `paid` - 已支付
- `overdue` - 已逾期

---

#### 12.2 创建账单提醒

```http
POST /api/v1/bill-reminders
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "信用卡还款",
  "amount": 5000.0,
  "due_date": "2026-01-20T00:00:00Z",
  "account_id": 1,
  "category_id": 10,
  "reminder_days": 3,
  "is_recurring": true,
  "recurring_period": "monthly"
}
```

**字段说明**:
- `reminder_days`: 提前几天提醒
- `is_recurring`: 是否定期账单
- `recurring_period`: 定期周期（monthly/yearly）

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "信用卡还款",
    "due_date": "2026-01-20T00:00:00Z"
  },
  "message": "账单提醒创建成功"
}
```

---

#### 12.3 更新账单提醒

```http
PUT /api/v1/bill-reminders/{id}
Content-Type: application/json
```

**请求体**（所有字段可选）:
```json
{
  "amount": 5500.0,
  "reminder_days": 5
}
```

**可更新字段**:
- `name`
- `amount`
- `due_date`
- `account_id`
- `category_id`
- `reminder_days`
- `is_active`

---

#### 12.4 删除账单提醒

```http
DELETE /api/v1/bill-reminders/{id}
```

---

### 十三、仪表盘API

#### 13.1 获取仪表盘数据

```http
GET /api/v1/dashboard
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "today_expense": 128.5,
    "month_expense": 3500.0,
    "month_income": 8000.0,
    "budget_progress": [
      {
        "category": {
          "id": 1,
          "name": "餐饮",
          "icon": "restaurant",
          "color": "#FF5722"
        },
        "budget_amount": 2000.0,
        "spent": 1650.5,
        "percentage": 82.53,
        "is_over_budget": false
      }
    ],
    "upcoming_bills": [
      {
        "id": 1,
        "name": "信用卡还款",
        "due_date": "2026-01-20T00:00:00Z",
        "amount": 5000.0,
        "days_until_due": 8
      }
    ]
  }
}
```

**数据说明**:
- `today_expense`: 今日支出
- `month_expense`: 本月支出
- `month_income`: 本月收入
- `budget_progress`: 预算进度列表
- `upcoming_bills`: 即将到期的账单提醒

---

### 十四、统计增强API

#### 14.1 同比环比分析

```http
GET /api/v1/statistics/comparison?period=month
```

**查询参数**:
- `period`: month/year

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "current": {
      "period": "2026-01",
      "income": 8000.0,
      "expense": 3500.0,
      "net": 4500.0
    },
    "last": {
      "period": "2025-12",
      "income": 8000.0,
      "expense": 4200.0,
      "net": 3800.0
    },
    "last_year": {
      "period": "2025-01",
      "income": 7500.0,
      "expense": 3000.0,
      "net": 4500.0
    },
    "comparison": {
      "income_change": 0.0,
      "expense_change": -16.67,
      "net_change": 18.42
    }
  }
}
```

**comparison 说明**:
- `income_change`: 收入变化百分比
- `expense_change`: 支出变化百分比
- `net_change`: 净储蓄变化百分比
- 负数表示减少，正数表示增加

---

#### 14.2 收支预测

```http
GET /api/v1/statistics/prediction?months=3
```

**查询参数**:
- `months`: 预测未来几个月（默认3，最大12）

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "period": "2026-02",
        "predicted_income": 8000.0,
        "predicted_expense": 3700.0,
        "confidence": 0.85
      },
      {
        "period": "2026-03",
        "predicted_income": 8000.0,
        "predicted_expense": 3600.0,
        "confidence": 0.80
      }
    ]
  }
}
```

**confidence 说明**:
- 预测置信度（0-1）
- 基于历史数据和定期交易计算
- 值越高表示预测越准确

---

#### 14.3 消费习惯洞察

```http
GET /api/v1/statistics/insights
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "weekday_vs_weekend",
        "title": "周末消费更高",
        "description": "周末的平均消费比工作日高30%",
        "value": 30.0,
        "recommendation": "注意控制周末支出"
      },
      {
        "type": "top_category",
        "title": "餐饮支出最多",
        "description": "本月餐饮支出占总支出的35%",
        "value": 35.0,
        "recommendation": "建议减少外出就餐频率"
      }
    ]
  }
}
```

**insight 类型**:
- `weekday_vs_weekend` - 工作日vs周末消费对比
- `top_category` - 最大支出类别
- `spending_trend` - 消费趋势分析
- `budget_health` - 预算健康度

---

#### 14.4 异常消费检测

```http
GET /api/v1/statistics/anomalies?threshold=2
```

**查询参数**:
- `threshold`: 标准差阈值，默认2

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "anomalies": [
      {
        "id": 42,
        "date": "2026-01-05T12:00:00Z",
        "amount": 5000.0,
        "category": "购物",
        "notes": "购买家电",
        "deviation": 3.5,
        "reason": "金额超出平均值3.5个标准差"
      }
    ]
  }
}
```

**说明**:
- 基于统计方法检测异常消费
- `deviation` 表示偏离平均值的程度（标准差倍数）
- `threshold` 越小，检测越敏感

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
开发环境: http://localhost:8080/api/v1 (Spring Boot)
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
| v2.1 | 2026-02-09 | 更新为 Spring Boot 后端实现，所有 API 已实现并可用 |
| v2.0 | 2025-01-12 | 新增v2.0功能：搜索、导出、备份、定期交易、债务追踪、账单提醒、仪表盘、统计增强 |
| v2.0 | 2025-01-08 | 前后端对接完成，API响应格式统一 |
| v1.0 | 2025-01-07 | 初始版本 |

---

## 🔗 相关文档

- [需求文档](/docs/accounting_requirements.md)
- [待办事项](/docs/accounting_todos.md)
- [后端详细文档](/Alfred/docs/api/accounting_feature.md)
