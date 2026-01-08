# 记账功能 API 文档

> **版本**: v1.0
> **更新时间**: 2026-01-07
> **状态**: ✅ 开发完成，待测试

## 📋 功能概述

记账功能提供完整的个人财务管理能力，支持：

- ✅ **账户管理**：多账户（银行卡、现金、支付宝、微信等）
- ✅ **交易记录**：收入、支出、转账、借贷（4种类型）
- ✅ **分类管理**：支持层级分类（父子分类）
- ✅ **标签系统**：自定义标签，多对多关系
- ✅ **图片上传**：交易凭证图片
- ✅ **统计分析**：时间维度、分类维度、趋势分析
- ✅ **预算管理**：设置预算、跟踪使用、超预算预警

---

## 🔑 认证说明

所有API都需要JWT认证，在请求头中携带：

```http
Authorization: Bearer {your_token}
```

或者通过Cookie携带（后端自动处理）

---

## 📊 核心数据模型

### 1. 账户 (Account)

账户代表用户的资金存储位置。

```typescript
interface Account {
  id: number;
  name: string;              // 账户名称，如"招商银行"、"现金"
  account_type: string;      // 类型：bank_card, cash, alipay, wechat, credit_card
  account_number?: string;   // 账号（可选，如卡号后4位）
  balance: number;           // 当前余额
  currency: string;          // 货币类型，默认"CNY"
  icon?: string;             // 图标标识
  color?: string;            // 颜色代码（HEX）
  is_default: boolean;       // 是否为默认账户
  notes?: string;            // 备注
  created_at: string;        // ISO 8601格式
}
```

### 2. 分类 (Category)

分类用于组织交易，支持层级结构。

```typescript
interface Category {
  id: number;
  name: string;              // 分类名称
  type: 'income' | 'expense'; // 分类类型
  parent_id?: number;        // 父分类ID（用于子分类）
  icon?: string;             // 图标标识
  color?: string;            // 颜色代码
  is_system: boolean;        // 是否为系统默认分类
  sort_order: number;        // 排序顺序
  subcategories?: Category[]; // 子分类列表
}
```

**默认分类**（新用户自动创建）：

**收入分类**：
- 工资、奖金、投资收益、兼职、礼金、其他收入

**支出分类**（含子分类）：
- 餐饮（早餐、午餐、晚餐、零食、外卖）
- 交通（公交、地铁、出租车、加油、停车）
- 购物（日用品、服装、电子产品、家电）
- 居住（房租、水电费、燃气费、物业费）
- 娱乐（电影、KTV、游戏、旅游）
- 医疗（挂号、药品、体检、保险）
- 教育（学费、书籍、培训、考证）
- 通讯（话费、宽带、流量）
- 人情（礼物、红包、请客）
- 其他支出

### 3. 交易 (Transaction)

交易是核心数据模型，记录所有资金流动。

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
  tags?: string[];           // 标签列表
  image_count: number;       // 图片数量
  created_at: string;
}

type TransactionType =
  | 'income'    // 收入
  | 'expense'   // 支出
  | 'transfer'  // 转账
  | 'loan_in'   // 借入
  | 'loan_out'  // 借出
  | 'repayment' // 还款
```

### 4. 预算 (Budget)

预算用于跟踪分类支出。

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
  period: 'monthly' | 'yearly' | 'weekly' | 'daily';
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

**响应示例**：

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
        "created_at": "2026-01-07T12:00:00Z"
      },
      {
        "id": 2,
        "name": "支付宝",
        "account_type": "alipay",
        "balance": 200.50,
        "currency": "CNY",
        "is_default": false,
        "created_at": "2026-01-07T12:00:00Z"
      }
    ],
    "total_balance": 5200.50
  }
}
```

#### 1.2 创建账户

```http
POST /api/v1/accounts
Content-Type: application/json
```

**请求体**：

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

**account_type 可选值**：
- `bank_card` - 银行卡
- `cash` - 现金
- `alipay` - 支付宝
- `wechat` - 微信
- `credit_card` - 信用卡

**响应示例**：

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

#### 1.3 更新账户

```http
PUT /api/v1/accounts/{account_id}
Content-Type: application/json
```

**请求体**（所有字段可选）：

```json
{
  "name": "招商银行（改名）",
  "is_default": false,
  "icon": "bank2",
  "notes": "备注更新"
}
```

#### 1.4 删除账户

```http
DELETE /api/v1/accounts/{account_id}
```

⚠️ **注意**：这是软删除，账户会被标记为`is_active=false`，历史数据不会丢失。

---

### 二、分类管理 API

#### 2.1 获取分类列表

```http
GET /api/v1/categories?type=expense
```

**查询参数**：
- `type` (可选): `income` 或 `expense`，筛选分类类型

**响应示例**：

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
          "icon": null,
          "color": null,
          "is_system": true,
          "parent_id": 1,
          "sort_order": 0,
          "subcategories": []
        },
        {
          "id": 12,
          "name": "午餐",
          "type": "expense",
          "icon": null,
          "color": null,
          "is_system": true,
          "parent_id": 1,
          "sort_order": 0,
          "subcategories": []
        }
      ]
    }
  ]
}
```

#### 2.2 创建分类

```http
POST /api/v1/categories
Content-Type: application/json
```

**请求体**：

```json
{
  "name": "宠物",
  "type": "expense",
  "parent_id": null,
  "icon": "pet",
  "color": "#722ed1"
}
```

#### 2.3 更新分类

```http
PUT /api/v1/categories/{category_id}
Content-Type: application/json
```

**请求体**（所有字段可选）：

```json
{
  "name": "宠物用品",
  "color": "#9254de"
}
```

#### 2.4 删除分类

```http
DELETE /api/v1/categories/{category_id}
```

⚠️ **注意**：系统默认分类（`is_system=true`）不能删除。

---

### 三、交易管理 API

#### 3.1 创建交易

```http
POST /api/v1/transactions
Content-Type: application/json
```

**请求体**：

```json
{
  "type": "expense",
  "amount": 50.0,
  "from_account_id": 1,
  "category_id": 12,
  "transaction_date": "2026-01-07T12:00:00Z",
  "tags": ["午餐", "工作日"],
  "notes": "公司楼下餐厅",
  "location": "朝阳区xxx",
  "merchant": "麦当劳"
}
```

**字段说明**：

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
| related_transaction_id | number | ❌ | 关联交易ID（还款时关联原借贷） |

**不同交易类型的要求**：

- **收入 (income)**：必须提供`to_account_id`
- **支出 (expense)**：必须提供`from_account_id`
- **转账 (transfer)**：必须提供`from_account_id`和`to_account_id`，且两者不同
- **借入 (loan_in)**：必须提供`to_account_id`
- **借出 (loan_out)**：必须提供`from_account_id`
- **还款 (repayment)**：可选提供`related_transaction_id`关联原借贷

**响应示例**：

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

💡 **提示**：创建交易时会自动更新相关账户的余额。

#### 3.2 获取交易列表

```http
GET /api/v1/transactions?type=expense&category_id=12&page=1&page_size=20
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ❌ | 交易类型筛选 |
| category_id | number | ❌ | 分类筛选 |
| account_id | number | ❌ | 账户筛选（查询该账户的所有交易） |
| start_date | date | ❌ | 开始日期（YYYY-MM-DD） |
| end_date | date | ❌ | 结束日期（YYYY-MM-DD） |
| tag | string | ❌ | 按标签筛选 |
| page | number | ❌ | 页码，默认1 |
| page_size | number | ❌ | 每页数量，默认20，最大100 |

**响应示例**：

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
        "transaction_date": "2026-01-07T12:00:00Z",
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

#### 3.3 获取交易详情

```http
GET /api/v1/transactions/{transaction_id}
```

**响应示例**：

```json
{
  "success": true,
  "data": {
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
      "name": "午餐"
    },
    "transaction_date": "2026-01-07T12:00:00Z",
    "notes": "公司楼下餐厅",
    "location": "朝阳区xxx",
    "merchant": "麦当劳",
    "receipt_number": "MC20260107001",
    "tags": [
      {
        "id": 1,
        "name": "午餐",
        "color": "#ff4d4f"
      },
      {
        "id": 2,
        "name": "工作日",
        "color": "#1890ff"
      }
    ],
    "images": [
      {
        "id": 1,
        "file_path": "transaction_images/user1/2026_01_07/abc123.jpg",
        "file_name": "receipt.jpg",
        "uploaded_at": "2026-01-07T12:05:00Z"
      }
    ],
    "created_at": "2026-01-07T12:00:00Z"
  }
}
```

#### 3.4 更新交易

```http
PUT /api/v1/transactions/{transaction_id}
Content-Type: application/json
```

**请求体**（所有字段可选）：

```json
{
  "category_id": 13,
  "transaction_date": "2026-01-07T12:30:00Z",
  "notes": "备注更新",
  "location": "地点更新",
  "tags": ["午餐", "加班"]
}
```

⚠️ **注意**：不允许修改金额和账户（避免余额计算混乱）。

#### 3.5 删除交易

```http
DELETE /api/v1/transactions/{transaction_id}
```

💡 **提示**：删除交易时会自动恢复相关账户的余额。

---

### 四、预算管理 API

#### 4.1 获取预算列表

```http
GET /api/v1/budgets?period=monthly
```

**查询参数**：
- `period` (可选): `monthly`, `yearly`, `weekly`, `daily`

**响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category": {
        "id": 1,
        "name": "餐饮",
        "icon": "food",
        "color": "#ff4d4f"
      },
      "amount": 2000.0,
      "period": "monthly",
      "alert_threshold": 80.0,
      "start_date": "2026-01-01T00:00:00Z",
      "end_date": null
    }
  ]
}
```

#### 4.2 创建预算

```http
POST /api/v1/budgets
Content-Type: application/json
```

**请求体**：

```json
{
  "category_id": 1,
  "amount": 2000.0,
  "period": "monthly",
  "alert_threshold": 80.0
}
```

**字段说明**：
- `category_id`: 分类ID（必须是expense类型）
- `amount`: 预算金额
- `period`: 预算周期
- `alert_threshold`: 预警阈值（0-100），当使用达到此百分比时触发警告

⚠️ **注意**：每个分类每个周期只能有一个预算。

#### 4.3 更新预算

```http
PUT /api/v1/budgets/{budget_id}
Content-Type: application/json
```

**请求体**（所有字段可选）：

```json
{
  "amount": 2500.0,
  "alert_threshold": 85.0
}
```

#### 4.4 删除预算

```http
DELETE /api/v1/budgets/{budget_id}
```

---

### 五、统计分析 API

#### 5.1 获取统计概览

```http
GET /api/v1/statistics/overview?period=month
```

**查询参数**：
- `period`: `week`, `month`, `year`

**响应示例**：

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
      },
      {
        "name": "交通",
        "icon": "transport",
        "color": "#ff7a45",
        "total": 500.0
      },
      {
        "name": "购物",
        "icon": "shopping",
        "color": "#ffa940",
        "total": 800.0
      }
    ]
  }
}
```

#### 5.2 获取趋势分析

```http
GET /api/v1/statistics/trend?type=expense&granularity=daily&months=6
```

**查询参数**：
- `type`: `income` 或 `expense`，分析的收入或支出
- `granularity`: `daily`, `weekly`, `monthly`，时间粒度
- `months`: 分析最近几个月的数据，默认6

**响应示例（按天）**：

```json
{
  "success": true,
  "data": {
    "type": "expense",
    "granularity": "daily",
    "trend": [
      {
        "period": "2025-12-01",
        "total": 150.0
      },
      {
        "period": "2025-12-02",
        "total": 200.0
      },
      {
        "period": "2025-12-03",
        "total": 180.5
      }
    ]
  }
}
```

**响应示例（按月）**：

```json
{
  "success": true,
  "data": {
    "type": "expense",
    "granularity": "monthly",
    "trend": [
      {
        "period": "2025-08",
        "total": 5800.0
      },
      {
        "period": "2025-09",
        "total": 6200.0
      },
      {
        "period": "2025-10",
        "total": 5500.0
      }
    ]
  }
}
```

#### 5.3 获取预算统计

```http
GET /api/v1/statistics/budget
```

返回当前月份所有预算的使用情况。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "period": "2026-01",
    "budgets": [
      {
        "category": {
          "id": 1,
          "name": "餐饮",
          "icon": "food",
          "color": "#ff4d4f"
        },
        "budget_amount": 2000.0,
        "spent": 1650.5,
        "remaining": 349.5,
        "percentage": 82.53,
        "is_over_budget": false,
        "alert_triggered": true
      },
      {
        "category": {
          "id": 2,
          "name": "交通",
          "icon": "transport",
          "color": "#ff7a45"
        },
        "budget_amount": 500.0,
        "spent": 650.0,
        "remaining": -150.0,
        "percentage": 130.0,
        "is_over_budget": true,
        "alert_triggered": true
      }
    ]
  }
}
```

**字段说明**：
- `budget_amount`: 预算金额
- `spent`: 已支出金额
- `remaining`: 剩余金额（可能为负，表示超预算）
- `percentage`: 使用百分比
- `is_over_budget`: 是否超预算
- `alert_triggered`: 是否触发预警（>= alert_threshold）

---

### 六、图片上传 API

#### 6.1 上传交易图片

```http
POST /api/v1/transactions/{transaction_id}/images
Content-Type: multipart/form-data
```

**请求体**：
- `files`: 图片文件数组（支持批量上传）

**示例（使用FormData）**：

```javascript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);

await fetch(`/api/v1/transactions/${transactionId}/images`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "file_path": "transaction_images/user1/2026_01_07/abc123.jpg",
      "file_name": "receipt.jpg"
    },
    {
      "id": 2,
      "file_path": "transaction_images/user2/2026_01_07/def456.png",
      "file_name": "invoice.png"
    }
  ],
  "message": "成功上传 2 张图片"
}
```

**支持的图片格式**：所有常见图片格式（通过Content-Type `image/*`验证）

#### 6.2 删除交易图片

```http
DELETE /api/v1/transactions/{transaction_id}/images/{image_id}
```

**响应示例**：

```json
{
  "success": true,
  "message": "图片已删除"
}
```

💡 **提示**：删除图片会同时删除物理文件和数据库记录。

---

## 🎯 典型使用流程

### 场景1：新用户首次使用

1. **注册/登录**
   ```http
   POST /api/v1/auth/register
   ```

   注册成功后，系统会自动创建默认分类（收入和支出分类）。

2. **创建第一个账户**
   ```http
   POST /api/v1/accounts
   {
     "name": "现金",
     "account_type": "cash",
     "initial_balance": 1000.0,
     "is_default": true
   }
   ```

3. **记录第一笔支出**
   ```http
   POST /api/v1/transactions
   {
     "type": "expense",
     "amount": 50.0,
     "from_account_id": 1,
     "category_id": 12,  // "午餐"
     "notes": "工作午餐"
   }
   ```

### 场景2：日常记账流程

1. **查看分类列表**（让用户选择）
   ```http
   GET /api/v1/categories?type=expense
   ```

2. **创建交易记录**
   ```http
   POST /api/v1/transactions
   {
     "type": "expense",
     "amount": 128.0,
     "from_account_id": 1,
     "category_id": 3,  // "购物"
     "tags": ["日用品"],
     "notes": "超市购物"
   }
   ```

3. **上传小票图片**（可选）
   ```http
   POST /api/v1/transactions/1/images
   [FormData with files]
   ```

### 场景3：查看统计

1. **查看本月概览**
   ```http
   GET /api/v1/statistics/overview?period=month
   ```

2. **查看支出趋势**
   ```http
   GET /api/v1/statistics/trend?type=expense&granularity=daily&months=3
   ```

3. **查看预算使用情况**
   ```http
   GET /api/v1/statistics/budget
   ```

### 场景4：设置预算

1. **创建预算**
   ```http
   POST /api/v1/budgets
   {
     "category_id": 1,  // "餐饮"
     "amount": 2000.0,
     "period": "monthly",
     "alert_threshold": 80.0
   }
   ```

2. **查看预算使用**
   ```http
   GET /api/v1/statistics/budget
   ```

---

## ⚠️ 错误处理

所有API遵循统一的错误响应格式：

```json
{
  "detail": "错误信息描述"
}
```

**常见HTTP状态码**：

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（token无效或过期） |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

**常见错误示例**：

```json
// 400 Bad Request - 参数错误
{
  "detail": "必须指定支出账户"
}

// 404 Not Found - 资源不存在
{
  "detail": "交易不存在"
}

// 401 Unauthorized - 未认证
{
  "detail": "无效或过期的令牌"
}
```

---

## 💡 前端开发建议

### 1. 认证处理

建议使用axios拦截器统一处理token：

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1'
});

// 请求拦截器 - 添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 跳转到登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 2. 账户余额显示

建议在创建/删除交易后刷新账户列表以获取最新余额：

```javascript
const createTransaction = async (transactionData) => {
  await api.post('/transactions', transactionData);
  // 重新获取账户列表以更新余额
  const { data } = await api.get('/accounts');
  return data;
};
```

### 3. 分类选择器

建议实现层级分类选择器：

```javascript
// 渲染分类树
const renderCategoryTree = (categories) => {
  return categories.map(cat => (
    <CategoryItem key={cat.id}>
      {cat.name}
      {cat.subcategories && cat.subcategories.length > 0 && (
        <SubCategories>
          {renderCategoryTree(cat.subcategories)}
        </SubCategories>
      )}
    </CategoryItem>
  ));
};
```

### 4. 日期时间处理

建议使用`dayjs`或`date-fns`处理日期：

```javascript
import dayjs from 'dayjs';

// 格式化交易时间
const formatTransactionDate = (dateString) => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm');
};

// 日期范围筛选
const last7Days = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const today = dayjs().format('YYYY-MM-DD');
```

### 5. 图片上传

建议实现图片预览和进度显示：

```javascript
const uploadImages = async (transactionId, files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const { data } = await api.post(
    `/transactions/${transactionId}/images`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        // 更新进度条
      }
    }
  );
  return data;
};
```

### 6. 统计图表

建议使用ECharts或Recharts可视化统计数据：

```javascript
// 饼图 - 分类占比
const CategoryPieChart = ({ data }) => (
  <PieChart data={data.category_breakdown}>
    <Pie dataKey="total" nameKey="name" />
  </PieChart>
);

// 折线图 - 趋势分析
const TrendLineChart = ({ data }) => (
  <LineChart data={data.trend}>
    <XAxis dataKey="period" />
    <YAxis />
    <Line type="monotone" dataKey="total" />
  </LineChart>
);
```

---

## 📝 数据验证规则

### 账户类型
- 必须是：`bank_card`, `cash`, `alipay`, `wechat`, `credit_card`

### 交易类型
- 必须是：`income`, `expense`, `transfer`, `loan_in`, `loan_out`, `repayment`

### 分类类型
- 必须是：`income` 或 `expense`

### 金额
- 必须 > 0
- 精度：最多2位小数

### 预算周期
- 必须是：`monthly`, `yearly`, `weekly`, `daily`

### 预警阈值
- 范围：0-100（百分比）

---

## 🔗 相关链接

- **Swagger文档**: http://localhost:8000/docs
- **ReDoc文档**: http://localhost:8000/redoc
- **健康检查**: http://localhost:8000/health

---

## 📞 联系方式

如有问题或建议，请联系后端开发团队。
