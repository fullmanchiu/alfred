# 预算功能设计文档

> **版本**: v1.0
> **日期**: 2026-02-08
> **状态**: ✅ 已完成 (2026-02-09)
> **实施**: Spring Boot + React 前端实现

---

## 1. 需求概述

### 1.1 核心目标
- **预算分配** - 规划收入如何分配到各个分类
- **支出监控** - 实时查看各分类的支出情况
- **超支控制** - 设置预算上限，超支时提醒

### 1.2 关键需求
1. **层级预算** - 子分类独立预算，但总和受父分类控制
2. **多周期支持** - 日/周/月/年预算，独立设置，支持循环
3. **独立判断** - 各周期独立计算，互不影响
4. **灵活配置** - 支持工作日/周末模式，不设置也不影响记账
5. **消费内容差异** - 日预算不管房租，月预算才管

---

## 2. 数据模型设计

### 2.1 Budget 实体

```kotlin
@Entity
@Table(name = "budgets")
data class Budget(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "category_id", nullable = false)
    val categoryId: Long,

    @Column(nullable = false, precision = 10, scale = 2)
    val amount: BigDecimal,  // 预算金额

    @Column(nullable = false, length = 20)
    val period: String,  // daily, weekly, monthly, yearly

    @Column(name = "pattern", length = 50)
    val pattern: String = "all",  // all, workday, weekend

    @Column(name = "alert_threshold", nullable = false)
    val alertThreshold: Double = 80.0,  // 预警百分比 (0-100)

    @Column(name = "is_recurring", nullable = false)
    val isRecurring: Boolean = true,  // 是否循环

    @Column(name = "start_date", nullable = false)
    val startDate: LocalDateTime,

    @Column(name = "end_date")
    val endDate: LocalDateTime? = null,

    @Column(nullable = false)
    val isActive: Boolean = true,

    @Column(name = "created_at")
    var createdAt: LocalDateTime? = null,

    @Column(name = "updated_at")
    var updatedAt: LocalDateTime? = null
)
```

### 2.2 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `userId` | Long | 用户ID |
| `categoryId` | Long | 分类ID（关联到最小粒度：子分类） |
| `amount` | BigDecimal | 预算金额 |
| `period` | String | 周期类型：daily/weekly/monthly/yearly |
| `pattern` | String | 生效模式：all=每天, workday=工作日, weekend=周末 |
| `alertThreshold` | Double | 预警阈值百分比（默认80%时提醒） |
| `isRecurring` | Boolean | 是否自动循环（如每月1号重置） |
| `startDate` | LocalDateTime | 预算开始时间 |
| `endDate` | LocalDateTime | 预算结束时间（可选） |
| `isActive` | Boolean | 是否启用 |

### 2.3 使用示例

```
餐饮-早餐:
  - 日预算(workday): ¥30  (周一到周五)
  - 日预算(weekend): ¥50  (周六日)
  - 周预算: ¥400  (聚餐、外卖)
  - 月预算: ¥2000 (加上房租、水电等)
```

---

## 3. 核心计算逻辑

### 3.1 预算使用计算

**核心原则**：每个周期独立计算，互不影响

**计算步骤**：
1. 根据当前时间确定周期范围（如本周一到周日）
2. 检查预算的`pattern`是否匹配（workday只算周一到周五）
3. 查询该周期内该分类的所有交易
4. 计算已用金额、剩余金额、使用百分比
5. 对比`alertThreshold`判断是否需要预警

### 3.2 代码实现

```kotlin
fun calculateBudgetUsage(budget: Budget, currentDate: LocalDate): BudgetUsage {
    // 1. 确定周期范围
    val (start, end) = when (budget.period) {
        "daily" -> currentDate to currentDate
        "weekly" -> getWeekRange(currentDate)
        "monthly" -> getMonthRange(currentDate)
        "yearly" -> getYearRange(currentDate)
        else -> throw IllegalArgumentException("Invalid period")
    }

    // 2. 过滤匹配pattern的日期
    val applicableDates = filterDatesByPattern(start..end, budget.pattern)

    // 3. 查询交易
    val transactions = transactionRepository.findByCategoryAndDateRange(
        budget.categoryId,
        applicableDates.first(),
        applicableDates.last()
    )

    // 4. 计算使用情况
    val usedAmount = transactions.sumOf { it.amount }
    val remaining = budget.amount - usedAmount
    val percentage = (usedAmount / budget.amount * 100).toDouble()

    return BudgetUsage(
        budgetId = budget.id!!,
        usedAmount = usedAmount,
        remainingAmount = remaining,
        usagePercentage = percentage,
        isOverBudget = usedAmount > budget.amount,
        isNearLimit = percentage >= budget.alertThreshold
    )
}

fun filterDatesByPattern(range: ClosedRange<LocalDate>, pattern: String): List<LocalDate> {
    return when (pattern) {
        "all" -> range.toList()
        "workday" -> range.filter { it.dayOfWeek.value < 6 }  // 周一到周五
        "weekend" -> range.filter { it.dayOfWeek.value >= 6 }  // 周六日
        else -> range.toList()
    }
}
```

### 3.3 父分类总预算计算

```kotlin
fun calculateParentCategoryBudget(parentCategoryId: Long, period: String, currentDate: LocalDate): BigDecimal {
    // 获取所有子分类的预算
    val childBudgets = budgetRepository.findByParentCategoryAndPeriod(parentCategoryId, period, currentDate)

    // 汇总所有子分类的已用金额
    var totalUsed = BigDecimal.ZERO
    childBudgets.forEach { budget ->
        val usage = calculateBudgetUsage(budget, currentDate)
        totalUsed += usage.usedAmount
    }

    return totalUsed
}
```

---

## 4. API接口设计

### 4.1 创建预算

```
POST /api/v1/budgets

Request:
{
  "categoryId": 123,
  "amount": 2000.00,
  "period": "monthly",
  "pattern": "all",
  "alertThreshold": 80.0,
  "isRecurring": true,
  "startDate": "2026-02-01",
  "endDate": null
}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "categoryId": 123,
    "amount": 2000.00,
    "period": "monthly",
    "pattern": "all",
    "alertThreshold": 80.0,
    "isRecurring": true,
    "startDate": "2026-02-01T00:00:00",
    "isActive": true
  }
}
```

### 4.2 获取所有预算（带使用情况）

```
GET /api/v1/budgets?includeUsage=true

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "categoryId": 123,
      "categoryName": "餐饮-早餐",
      "amount": 2000.00,
      "period": "monthly",
      "pattern": "all",
      "usedAmount": 850.00,
      "remainingAmount": 1150.00,
      "usagePercentage": 42.5,
      "isOverBudget": false,
      "isNearLimit": false,
      "alertThreshold": 80.0,
      "isRecurring": true,
      "startDate": "2026-02-01",
      "isActive": true
    }
  ]
}
```

### 4.3 更新预算

```
PUT /api/v1/budgets/{id}

Request:
{
  "amount": 2500.00,
  "alertThreshold": 75.0
}

Response:
{
  "success": true,
  "data": { ... }
}
```

### 4.4 删除预算

```
DELETE /api/v1/budgets/{id}

Response:
{
  "success": true,
  "message": "预算删除成功"
}
```

---

## 5. 前端UI设计

### 5.1 页面结构

```
预算管理页面
├── 顶部统计卡片
│   ├── 本月总预算
│   ├── 本月已支出
│   └── 预算使用率
├── 预算列表（按周期分组）
│   ├── 日预算组
│   │   ├── 餐饮-早餐(workday) - ¥30/天 [====....] 66%
│   │   └── 交通-地铁(workday) - ¥10/天 [==.....] 40%
│   ├── 周预算组
│   │   └── 娱乐-聚餐(weekend) - ¥200/周 [=======.] 75%
│   └── 月预算组
│       ├── 餐饮-总额 - ¥2000/月 [====....] 42%
│       └── 房租水电 - ¥3000/月 [==.....] 33%
└── 添加预算按钮
```

### 5.2 预算卡片组件

```tsx
<Card>
  <div className="flex justify-between items-center">
    <Space>
      <span>{categoryName}</span>
      <Tag color={periodColor}>{periodLabel}</Tag>
      {pattern !== 'all' && <Tag>{patternLabel}</Tag>}
    </Space>
    <Space>
      <EditButton onClick={handleEdit} />
      <DeleteButton onClick={handleDelete} />
    </Space>
  </div>

  <Progress
    percent={usagePercentage}
    strokeColor={progressColor}
    showInfo={true}
  />

  <div className="flex justify-between text-sm">
    <span>已用: ¥{usedAmount.toFixed(2)}</span>
    <span>剩余: ¥{remainingAmount.toFixed(2)}</span>
  </div>

  {isNearLimit && (
    <Alert type="warning" message="接近预算限额" />
  )}

  {isOverBudget && (
    <Alert type="error" message={`已超支 ¥${(usedAmount - amount).toFixed(2)}`} />
  )}
</Card>
```

### 5.3 添加预算表单

```tsx
<Form layout="vertical">
  <Form.Item
    name="categoryId"
    label="分类"
    rules={[{ required: true }]}
  >
    <Select>
      {expenseCategories.map(cat => (
        <Select.Option key={cat.id} value={cat.id}>
          {cat.name}
        </Select.Option>
      ))}
    </Select>
  </Form.Item>

  <Form.Item
    name="period"
    label="周期"
    rules={[{ required: true }]}
  >
    <Select>
      <Select.Option value="daily">日预算</Select.Option>
      <Select.Option value="weekly">周预算</Select.Option>
      <Select.Option value="monthly">月预算</Select.Option>
      <Select.Option value="yearly">年预算</Select.Option>
    </Select>
  </Form.Item>

  <Form.Item
    name="amount"
    label="预算金额"
    rules={[{ required: true }]}
  >
    <Input type="number" prefix="¥" />
  </Form.Item>

  <Form.Item
    name="pattern"
    label="生效模式"
  >
    <Select defaultValue="all">
      <Select.Option value="all">所有日期</Select.Option>
      <Select.Option value="workday">仅工作日</Select.Option>
      <Select.Option value="weekend">仅周末</Select.Option>
    </Select>
  </Form.Item>

  <Form.Item
    name="alertThreshold"
    label="预警阈值"
  >
    <Slider min={50} max={100} marks={{ 50: '50%', 80: '80%', 100: '100%' }} />
  </Form.Item>

  <Form.Item
    name="isRecurring"
    label="自动循环"
    valuePropName="checked"
  >
    <Switch checkedChildren="是" unCheckedChildren="否" />
  </Form.Item>
</Form>
```

### 5.4 进度条颜色逻辑

```typescript
function getProgressColor(percentage: number, isOverBudget: boolean): string {
  if (isOverBudget || percentage >= 100) return 'var(--color-error)';
  if (percentage >= 80) return 'var(--color-warning)';
  return 'var(--color-success)';
}
```

---

## 6. 财务主页集成

### 6.1 预算进度卡片

在 `/finance` 页面添加预算进度区域：

```tsx
<Card title="预算进度" style={{ marginBottom: 'var(--spacing-lg)' }}>
  {isLoading ? (
    <Spin />
  ) : budgetUsage.length === 0 ? (
    <Empty description="暂无预算" />
  ) : (
    <Space direction="vertical" style={{ width: '100%' }}>
      {budgetUsage.slice(0, 3).map(usage => (
        <div key={usage.budgetId}>
          <div className="flex justify-between">
            <span>{usage.categoryName}</span>
            <span>{usage.usagePercentage.toFixed(1)}%</span>
          </div>
          <Progress
            percent={Math.min(usage.usagePercentage, 100)}
            strokeColor={getProgressColor(usage.usagePercentage, usage.isOverBudget)}
            size="small"
          />
        </div>
      ))}
      <Button type="link" onClick={() => navigate('/finance/budgets')}>
        查看全部预算 →
      </Button>
    </Space>
  )}
</Card>
```

### 6.2 本周预算卡片

```tsx
<Card title="本周预算">
  {weeklyBudgets.length === 0 ? (
    <div>🚧 预算功能开发中</div>
  ) : (
    <div>
      <Statistic
        title="本周总预算"
        value={weeklyTotal}
        suffix="¥"
      />
      <Progress
        percent={weeklyUsagePercentage}
        strokeColor={getProgressColor(weeklyUsagePercentage, false)}
      />
      <div>剩余: ¥{weeklyRemaining.toFixed(2)}</div>
    </div>
  )}
</Card>
```

---

## 7. 实施计划

### 7.1 阶段一：后端基础（1天）

**任务清单**：
- [ ] 修改Budget实体，添加`pattern`字段
- [ ] 创建BudgetUsage DTO
- [ ] 实现预算使用计算逻辑
- [ ] 实现Budget API（CRUD）
- [ ] 添加预算查询接口（包含使用情况）
- [ ] 编写单元测试

**验收标准**：
- [x] 可以创建/更新/删除预算
- [x] 可以查询预算及使用情况
- [x] 计算逻辑准确（日/周/月/年）
- [x] pattern过滤正确（workday/weekend）
- [x] 所有测试通过

### 7.2 阶段二：前端基础（1天）

**任务清单**：
- [ ] 修改前端Budget类型定义
- [ ] 创建预算列表页面（按周期分组）
- [ ] 创建添加/编辑预算表单
- [ ] 实现预算进度可视化
- [ ] 实现预算删除功能
- [ ] 添加空状态和加载状态

**验收标准**：
- [x] 可以查看预算列表（按周期分组显示）
- [x] 可以添加新预算
- [x] 可以编辑现有预算
- [x] 可以删除预算
- [x] 预算进度条显示正确
- [x] 超支警告正常显示

### 7.3 阶段三：高级功能（1天）

**任务清单**：
- [ ] 实现父分类总预算显示（手动计算）
- [ ] 添加超支预警提示
- [ ] 财务主页集成预算卡片
- [ ] 本周预算卡片显示
- [ ] 优化UI和交互

**验收标准**：
- [x] 父分类总预算计算正确
- [x] 超支预警及时提醒
- [x] 财务主页显示预算进度
- [x] 用户体验流畅

### 7.4 总计工作量

**预计时间**：2-3天
- 后端：1天
- 前端：1-2天

---

## 8. 测试用例

### 8.1 预算计算测试

```kotlin
@Test
fun `should calculate daily budget correctly`() {
    val budget = Budget(
        categoryId = 1,
        amount = BigDecimal.valueOf(100),
        period = "daily",
        pattern = "all"
    )

    val usage = calculateBudgetUsage(budget, LocalDate.of(2026, 2, 8))

    assertEquals(0, usage.usedAmount)
    assertEquals(100, usage.remainingAmount)
    assertEquals(0.0, usage.usagePercentage)
}

@Test
fun `should filter workday pattern correctly`() {
    val budget = Budget(
        categoryId = 1,
        amount = BigDecimal.valueOf(100),
        period = "weekly",
        pattern = "workday"
    )

    val usage = calculateBudgetUsage(budget, LocalDate.of(2026, 2, 8)) // 周日

    // 周日不应该计入workday预算
    assertEquals(0, usage.usedAmount)
}
```

### 8.2 E2E测试脚本

```bash
#!/bin/bash
# test_budgets.sh

TOKEN=$(cat /tmp/token.txt)

# 1. 创建预算
echo "=== 创建预算 ==="
curl -X POST "http://localhost:8080/api/v1/budgets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 1,
    "amount": 2000.00,
    "period": "monthly",
    "pattern": "all",
    "alertThreshold": 80.0,
    "isRecurring": true,
    "startDate": "2026-02-01"
  }'

# 2. 查询预算
echo -e "\n=== 查询预算 ==="
curl -X GET "http://localhost:8080/api/v1/budgets?includeUsage=true" \
  -H "Authorization: Bearer $TOKEN"

# 3. 更新预算
echo -e "\n=== 更新预算 ==="
curl -X PUT "http://localhost:8080/api/v1/budgets/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500.00
  }'

# 4. 删除预算
echo -e "\n=== 删除预算 ==="
curl -X DELETE "http://localhost:8080/api/v1/budgets/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 9. 未来扩展

### 9.1 可能的增强功能

1. **预算模板** - 一键应用预设的预算配置（如"学生预算"、"家庭预算"）
2. **预算分析报告** - 月度预算执行情况分析
3. **预算建议** - AI根据历史数据推荐预算金额
4. **多账户预算** - 为不同账户设置独立预算
5. **预算共享** - 家庭成员共享预算（如夫妻共同管理家庭预算）

### 9.2 技术优化方向

1. **缓存优化** - Redis缓存预算使用情况，减少查询压力
2. **异步计算** - 大数据量时使用后台任务计算预算
3. **实时更新** - WebSocket推送预算变化
4. **数据归档** - 历史预算数据定期归档

---

## 10. 参考文档

- [后端API规范](/docs/accounting_api_spec.md)
- [前端类型定义](/frontend/src/types/index.ts)
- [数据库迁移脚本](/backend/src/main/resources/db/migration/)
