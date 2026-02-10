# 多货币记账与单货币预算兼容性设计

**日期**: 2026-02-11
**作者**: Claude & 旅行者
**状态**: 设计完成，待实施

---

## 1. 总体设计原则

### 核心理念
**单货币存储，多货币展示**

- 预算统一以人民币(CNY)存储和计算
- 交易记录支持多货币，但自动转换为CNY进行预算计算
- 前端展示时支持按当前汇率切换显示币种

### 设计优势
- 预算系统保持简单，无需重构核心逻辑
- 历史数据不受汇率波动影响
- 用户可以多货币记账，预算计算统一透明
- 汇率采用懒加载策略，按需获取

---

## 2. 数据库设计

### 2.1 汇率表 (exchange_rates)

```sql
CREATE TABLE exchange_rates (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    from_currency VARCHAR(3) NOT NULL,  -- USD, HKD, EUR, JPY 等
    to_currency VARCHAR(3) NOT NULL,    -- 目前固定为 CNY
    rate DECIMAL(10,6) NOT NULL,        -- 1 from_currency = X CNY
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, from_currency, to_currency)
);

CREATE INDEX idx_exchange_rates_date ON exchange_rates(date);
CREATE INDEX idx_exchange_rates_currency ON exchange_rates(from_currency, to_currency);
```

**字段说明**:
- `date`: 汇率生效日期
- `from_currency`: 原始币种（ISO 4217标准）
- `rate`: 汇率，例如 USD→CNY 为 7.2
- `UNIQUE约束`: 确保同一天同一币种对只有一条记录

### 2.2 交易表修改 (transactions)

**新增字段**:
```sql
ALTER TABLE transactions ADD COLUMN exchange_rate DECIMAL(10,6);
ALTER TABLE transactions ADD COLUMN cny_amount DECIMAL(12,2);
```

**字段说明**:
- `exchange_rate`: 记账时的汇率（1外币 = X CNY）
- `cny_amount`: 交易金额的CNY等值（用于预算计算）
- 原 `amount` 字段保留原始货币金额
- 原 `currency` 字段保持不变

### 2.3 预算表 (budgets)

**无需修改**: 继续以CNY存储和计算

---

## 3. 后端API设计

### 3.1 汇率管理接口

#### 获取汇率列表
```
GET /api/v1/exchange-rates?from=USD&start=2026-02-01&end=2026-02-11
```

响应:
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-02-11",
      "fromCurrency": "USD",
      "toCurrency": "CNY",
      "rate": 7.2345
    }
  ]
}
```

#### 批量创建/更新汇率
```
POST /api/v1/exchange-rates/batch
Content-Type: application/json

{
  "rates": [
    {
      "date": "2026-02-11",
      "fromCurrency": "USD",
      "toCurrency": "CNY",
      "rate": 7.2345
    }
  ]
}
```

#### 获取当前汇率
```
GET /api/v1/exchange-rates/current?from=USD
```

响应:
```json
{
  "success": true,
  "data": {
    "fromCurrency": "USD",
    "toCurrency": "CNY",
    "rate": 7.2345,
    "date": "2026-02-11"
  }
}
```

### 3.2 预算接口修改

#### 获取预算层级（支持显示货币切换）
```
GET /api/v1/budgets/hierarchy?date=2026-02-11&period=month&displayCurrency=HKD
```

新增参数:
- `displayCurrency` (可选): 显示货币，默认 CNY

响应增加字段:
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "categoryName": "餐饮",
        "amount": 1000.0,
        "used": 600.0,
        "percentage": 60.0,
        "currency": "CNY",
        "displayAmount": 1087.0,      // 新增：显示货币等值
        "displayUsed": 652.2,         // 新增：已使用显示货币等值
        "displayCurrency": "HKD",     // 新增：显示货币
        "exchangeRate": 1.087         // 新增：使用的汇率
      }
    ],
    "summary": {
      "totalBudget": 5000.0,
      "totalUsed": 3000.0,
      "displayTotalBudget": 5435.0,  // 新增
      "displayTotalUsed": 3261.0,    // 新增
      "displayCurrency": "HKD"       // 新增
    }
  }
}
```

### 3.3 交易接口修改

#### 创建交易（自动获取汇率）
```
POST /api/v1/transactions
Content-Type: application/json

{
  "categoryId": 123,
  "amount": 100.0,
  "currency": "USD",
  "transactionDate": "2026-02-11T10:00:00"
}
```

**后端处理逻辑**:
1. 接收交易请求
2. 如果 `currency !== 'CNY'`，查询当日汇率
   - 如果存在，使用该汇率
   - 如果不存在，调用外部API获取并存储
3. 计算 `cny_amount = amount * exchange_rate`
4. 存储交易记录

---

## 4. 前端设计

### 4.1 首页汇率展示

**位置**: 首页或财务首页顶部

**显示内容**:
```
常用汇率 (2026-02-11)
USD/CNY: 7.2345  HKD/CNY: 0.9213  EUR/CNY: 7.8123
```

**功能**:
- 显示常用币种对CNY的当日汇率
- 可点击查看更多币种
- 可配置"关注币种"列表

### 4.2 预算展示货币切换

**UI组件**:
```tsx
<CurrencySwitcher
  currentCurrency="HKD"
  onCurrencyChange={(currency) => setDisplayCurrency(currency)}
  currencies={['CNY', 'HKD', 'USD', 'EUR']}
/>
```

**位置**: 预算页面右上角

**行为**:
- 切换货币后，所有预算金额按当前汇率重新计算显示
- 预算本身的CNY值不变，仅展示数值变化
- 显示 "(约 HKD 10,870)" 标识

### 4.3 交易记录智能显示

**显示逻辑**:
- 原始货币 = CNY: 仅显示 "¥100.00"
- 原始货币 ≠ CNY: 显示 "$14.00 USD (¥101.28 CNY)"
- 汇率悬停提示: "汇率: 1 USD = 7.234 CNY (2026-02-11)"

**交易表单优化**:
- 货币选择: 支持常用币种快速选择
- 汇率预览: 选择外币后显示当前汇率和CNY等值
- 汇率来源提示: "数据来源: 中国银行外汇牌价"

---

## 5. 核心业务逻辑

### 5.1 交易创建流程

```
用户提交交易
    ↓
检查货币类型
    ↓
外币? ──是──→ 查询当日汇率表
    |           ↓
    |       存在? ──是──→ 使用该汇率
    |           |
    |          否
    |           ↓
    |       调用外部API获取汇率
    |           ↓
    |       存储到汇率表
    |           ↓
    否          ←── 使用该汇率
    ↓
计算 cny_amount = amount × exchange_rate
    ↓
存储交易记录
    ↓
返回结果
```

**代码示例** (Kotlin):
```kotlin
fun createTransaction(dto: TransactionDto, userId: Long): TransactionDto {
    val exchangeRate = if (dto.currency != "CNY") {
        exchangeRateService.getOrCreateRate(
            date = dto.transactionDate.toLocalDate(),
            fromCurrency = dto.currency,
            toCurrency = "CNY"
        )
    } else {
        BigDecimal.ONE
    }

    val cnyAmount = dto.amount.multiply(exchangeRate)

    val transaction = Transaction(
        amount = dto.amount,
        currency = dto.currency,
        exchangeRate = exchangeRate,
        cnyAmount = cnyAmount,
        // ... 其他字段
    )

    return transactionRepository.save(transaction).toDto()
}
```

### 5.2 预算计算流程

```
获取预算周期
    ↓
查询所有相关交易
    ↓
按分类分组
    ↓
使用 cny_amount 汇总（不是 amount!）
    ↓
计算预算使用率 = SUM(cny_amount) / budget.amount
    ↓
如果指定了 displayCurrency
    ↓
获取当前日期汇率
    ↓
转换所有金额为显示货币
    ↓
返回结果
```

**关键点**: 预算计算始终使用 `cny_amount`，确保一致性

### 5.3 汇率懒加载策略

**场景1: 记账时**
- 用户选择外币 → 检查当日汇率
- 不存在 → 调用外部API → 存储

**场景2: 查看历史交易**
- 交易已包含 `exchange_rate` 字段
- 直接使用存储的汇率，无需额外查询

**场景3: 预算切换显示货币**
- 查询当前日期汇率
- 如果不存在，懒加载获取

**外部汇率API选项**:
1. 中国银行外汇牌价（推荐，权威）
2. exchangerate-api.io
3._currency API（免费额度）

---

## 6. 实施步骤

### Phase 1: 数据库和后端基础

**任务清单**:
- [ ] 创建 `exchange_rates` 表迁移脚本
- [ ] 修改 `transactions` 表添加字段
- [ ] 实现 `ExchangeRateService` 服务
- [ ] 实现汇率外部API调用
- [ ] 修改 `TransactionService` 创建逻辑
- [ ] 编写单元测试和集成测试
- [ ] API测试脚本验证

**预计时间**: 2-3天

### Phase 2: 预算系统兼容

**任务清单**:
- [ ] 修改 `BudgetService` 使用 `cny_amount` 计算
- [ ] 添加 `displayCurrency` 参数支持
- [ ] 实现货币转换逻辑
- [ ] 更新预算层级API响应
- [ ] 测试预算计算准确性
- [ ] 性能测试和优化

**预计时间**: 1-2天

### Phase 3: 前端UI和用户体验

**任务清单**:
- [ ] 首页汇率展示组件
- [ ] 预算页面货币切换器
- [ ] 交易列表智能显示
- [ ] 交易表单汇率预览
- [ ] 关注币种配置
- [ ] 端到端测试
- [ ] 用户文档编写

**预计时间**: 2-3天

---

## 7. 测试策略和边界情况

### 测试场景1: 基础多货币记账
**输入**: 创建100美元交易
**预期**:
- `amount = 100.00`, `currency = "USD"`
- `exchange_rate = 7.2345`, `cny_amount = 723.45`
- 预算按723.45元计算

### 测试场景2: 历史汇率缺失
**输入**: 查看历史USD交易，当日汇率不存在
**预期**:
- 首次查询时自动获取并存储汇率
- 后续查询直接使用存储值

### 测试场景3: 预算货币切换
**输入**: 1000元CNY预算，切换为HKD显示（汇率0.9213）
**预期**:
- 预算显示 "HKD 1,085.49 (约)"
- 原预算值仍为CNY 1000.00

### 测试场景4: 汇率波动
**输入**: 2月1日记录100 USD（汇率7.2），2月11日查看（汇率7.4）
**预期**:
- 交易仍按创建时的7.2汇率计算 cny_amount = 720
- 预算切换显示使用当前汇率7.4

### 边界情况处理

| 情况 | 处理方式 |
|------|---------|
| 汇率表无当日数据 | 自动调用外部API获取 |
| 外部API调用失败 | 返回错误提示，禁止创建交易 |
| 用户输入不支持的币种 | 前端限制币种选择范围 |
| 同一天多次获取汇率 | 数据库UNIQUE约束自动去重 |
| 历史交易查询 | 使用记录中存储的汇率 |
| 预算期间汇率变化 | 计算使用交易创建时汇率，展示使用当前汇率 |

---

## 8. 配置和扩展性

### 支持的币种

**初始支持**:
- CNY (人民币) - 基础货币
- USD (美元)
- HKD (港币)
- EUR (欧元)
- JPY (日元)
- GBP (英镑)

**扩展方式**:
```kotlin
// 配置文件 application.yml
app:
  currency:
    supported: CNY,USD,HKD,EUR,JPY,GBP
    default: CNY
    rate-providers:
      - name: "Bank of China"
        url: "https://api.boc.com/rates"
```

### 外部汇率API接口

```kotlin
interface ExchangeRateProvider {
    fun getRate(date: LocalDate, from: String, to: String): BigDecimal?
}

@Service
class BankOfChinaRateProvider : ExchangeRateProvider {
    // 实现中国银行API调用
}

@Service
class FallbackExchangeRateService(
    private val providers: List<ExchangeRateProvider>
) {
    fun getRateWithFallback(date: LocalDate, from: String, to: String): BigDecimal {
        return providers.firstNotNullOfOrNull {
            it.getRate(date, from, to)
        } ?: throw ExternalApiException("所有汇率API均失败")
    }
}
```

---

## 9. 数据迁移

### 现有交易数据迁移

**SQL脚本**:
```sql
-- 为现有CNY交易填充字段
UPDATE transactions
SET exchange_rate = 1.0,
    cny_amount = amount
WHERE currency = 'CNY' AND exchange_rate IS NULL;

-- 为现有外币交易（如果有）填充字段
-- 注意：需要从历史汇率表或外部API获取历史汇率
UPDATE transactions
SET exchange_rate = ?,  -- 需要从外部获取
    cny_amount = amount * ?
WHERE currency != 'CNY' AND exchange_rate IS NULL;
```

**回滚计划**:
```sql
-- 如果需要回滚
ALTER TABLE transactions DROP COLUMN exchange_rate;
ALTER TABLE transactions DROP COLUMN cny_amount;
DROP TABLE exchange_rates;
```

---

## 10. 性能优化建议

### 数据库优化
- `exchange_rates` 表建立复合索引: `(date, from_currency, to_currency)`
- 考虑 Redis 缓存当日汇率
- 批量查询历史汇率避免N+1问题

### API优化
- 预算查询时批量获取所需汇率
- 使用 React Query 缓存汇率数据
- 汇率数据变更频率低，可长时间缓存（1小时）

### 监控指标
- 汇率API调用成功率
- 汇率表查询耗时
- 预算计算响应时间

---

## 11. 风险和限制

### 已知风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 外部汇率API不稳定 | 无法创建外币交易 | 实现多个API fallback |
| 历史汇率无法获取 | 旧数据可能缺失汇率 | 提供手动录入功能 |
| 频繁货币切换 | 用户体验下降 | 缓存汇率数据 |
| 汇率波动大 | 显示金额与实际不符 | 明确标注"约" |

### 设计限制
- 预算仅支持单一货币（CNY）
- 不支持货币之间的直接兑换（需通过CNY中转）
- 历史汇率数据依赖外部API可用性

---

## 12. 未来优化方向

### 短期优化 (3个月内)
- [ ] 支持更多币种
- [ ] 汇率趋势图表
- [ ] 汇率提醒功能（突破阈值时通知）

### 中期优化 (6个月内)
- [ ] 多货币钱包（资产分布）
- [ ] 汇率损益分析
- [ ] 多语言支持

### 长期规划
- [ ] 加密货币支持
- [ ] 跨币种转账记录
- [ ] 多货币预算（独立预算池）

---

## 附录A: 技术选型

### 汇率数据源推荐

**中国银行外汇牌价** (推荐)
- 官方权威数据
- 免费API
- 更新频率: 每个工作日
- 数据准确度高

**ExchangeRate-API**
- 免费额度: 1500次/月
- 支持全球货币
- HTTPS加密
- 响应速度快

### 前端技术栈
- React Query: 汇率数据缓存
- Ant Design: UI组件
- Day.js: 日期处理
- Decimal.js: 精确数值计算

---

## 附录B: 参考资料

- ISO 4217货币代码标准
- Spring Boot多数据源配置
- PostgreSQL数据库设计最佳实践
- React性能优化指南

---

**文档版本**: 1.0
**最后更新**: 2026-02-11
**审核状态**: 待审核
