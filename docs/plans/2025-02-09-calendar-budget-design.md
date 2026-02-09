# 日历预算系统设计文档

**日期**: 2025-02-09
**状态**: ✅ 已完成 (2026-02-09)
**实施**: 后端 `GET /api/v1/budgets/calendar` 接口已实现

## 1. 概述

### 核心概念
- **4个维度独立预算**: 日/周/月/年，每个维度可独立设置预算
- **层级聚合**: 父周期预算 = 子周期聚合 + 本周期特有内容
- **灵活同步**: 可选择性应用到未来的同规则周期
- **侧边栏详情**: 点击任意周期打开抽屉查看和编辑

### 目标
提供直观的日历界面，让用户可以方便地为任意时间周期设置和查看预算。

## 2. 用户界面

### 2.1 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  预算管理                                    [视图切换]  │
│  [📅 日视图] [📆 周视图] [📅 月视图] [📆 年视图]         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  日历区域（占60%）     │  详情抽屉（占40%）              │
│  - 可滚动查看         │  - 固定显示                     │
│  - 点击任意单元格     │  - 实时更新                     │
│                       │                                 │
└─────────────────────────────────────────────────────────┘
```

### 2.2 日历单元格显示

**日视图单元格**:
```
┌──────────┐
│    9     │  日期
│ ━━━━━━   │  进度条（75%填充）
│¥150/¥200 │  已用/预算
│  75%     │  百分比
└──────────┘
```

**周/月/年视图单元格**: 显示聚合数据
- 周视图: 本周总额 "¥1050/¥1400"
- 月视图: 本月总额 "¥4500/¥6000"
- 年视图: 本年总额 "¥54000/¥72000"

**颜色编码**:
- 绿色 `< 80%`: 正常
- 黄色 `≥ 80%`: 接近限额
- 红色 `≥ 100%`: 超支

### 2.3 详情抽屉

点击任意日期/周/月/年后，右侧滑出详情面板：

```
┌─────────────────────────────┐
│ 2月9日 周日        [×]      │
├─────────────────────────────┤
│ 📊 总预算                   │
│   • 日预算: ¥100            │
│   • 周预算聚合: ¥700        │
│   • 本周特有: ¥200          │
│   • 总计: ¥900              │
│                             │
│ 📈 消费进度                 │
│   ████████░░ 72%           │
│   已用: ¥650 / ¥900        │
│   ⚠️ 接近限额               │
│                             │
│ 📂 分类预算                 │
│   🍔 餐饮    ¥80/¥100  80% │
│   🚗 交通    ¥50/¥50   100%│
│   🎮 娱乐    ¥200/¥300 67% │
│   [+ 添加预算]              │
│                             │
│ 🔄 同步设置                 │
│   ☑ 应用到所有未来工作日    │
│   ☐ 应用到所有未来周末      │
│                             │
│ [取消]          [保存]      │
└─────────────────────────────┘
```

## 3. 交互逻辑

### 3.1 视图切换

用户可通过顶部按钮切换：
- **日视图**: 显示当月所有日期，可左右切换月份
- **周视图**: 显示当月所有周，可左右切换月份
- **月视图**: 显示当年所有月，可左右切换年份
- **年视图**: 显示多年视图

### 3.2 点击单元格

1. 点击任意日期/周/月/年
2. 右侧滑出详情抽屉
3. 显示该周期的：
   - 预算层级关系（子周期聚合 + 本周期特有）
   - 消费进度
   - 分类预算明细
4. 可编辑预算金额
5. 可选择"应用到未来同规则周期"

### 3.3 编辑预算

**默认行为**:
- 只编辑当前选中的周期
- 不影响其他周期

**同步按钮**:
- "应用到所有未来工作日"
- "应用到所有未来周末"
- "应用到本月剩余日期"
- **重要**: 只影响今天之后的日期，不影响历史

### 3.4 层级关系

**周预算构成**:
```
周预算 = 7天日预算总和 + 周特有预算
```

**月预算构成**:
```
月预算 = 4周周预算总和 + 月特有预算
```

**年预算构成**:
```
年预算 = 12月月预算总和 + 年特有预算
```

**编辑子周期时的处理**:
- 修改日预算 → 自动更新父周期的聚合金额
- 显示提示："2月9日预算已更新，本周总预算已调整为 ¥950"

## 4. 数据结构

### 4.1 前端类型定义

```typescript
// 日历单元格数据
interface CalendarCell {
  date: string;           // ISO日期
  period: 'day' | 'week' | 'month' | 'year';
  budget: number;         // 预算金额
  used: number;           // 已用金额
  percentage: number;     // 使用百分比
  status: 'normal' | 'warning' | 'over';
  categoryBudgets?: CategoryBudget[];
}

// 分类预算
interface CategoryBudget {
  categoryId: number;
  categoryName: string;
  budget: number;
  used: number;
  percentage: number;
}
```

### 4.2 后端API需求

**新增API**:
- `GET /api/v1/budgets/calendar?view=day&date=2025-02-09` - 获取日历数据
- `GET /api/v1/budgets/hierarchy?date=2025-02-09` - 获取预算层级关系
- `POST /api/v1/budgets/sync` - 同步预算到未来周期

**修改现有API**:
- `GET /api/v1/budgets/usage` - 返回数据增加层级信息

## 5. 技术实现

### 5.1 前端组件

```
BudgetCalendar/
├── index.tsx              # 主组件
├── CalendarGrid.tsx       # 日历网格
├── CalendarCell.tsx       # 单元格
├── DetailDrawer.tsx       # 详情抽屉
├── ViewSwitcher.tsx       # 视图切换器
└── types.ts               # 类型定义
```

### 5.2 日历库选择

推荐使用:
- **Ant Design Calendar**: 基础日历组件
- **date-fns**: 日期处理（周/月/年范围计算）
- **dayjs**: 已在项目使用，继续使用

### 5.3 状态管理

使用React Query + useState:
```typescript
const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('day');
const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
const [drawerVisible, setDrawerVisible] = useState(false);

const { data: calendarData } = useCalendarData(view, selectedDate);
```

## 6. 后端实现

### 6.1 新增Service

```kotlin
@Service
class BudgetCalendarService {
    fun getCalendarData(userId: Long, view: String, date: LocalDate): List<CalendarCellDto>
    fun getBudgetHierarchy(userId: Long, date: LocalDate): BudgetHierarchyDto
    fun syncToFuturePeriods(request: SyncBudgetRequest): List<Budget>
}
```

### 6.2 数据结构

```kotlin
data class CalendarCellDto(
    val date: LocalDate,
    val period: String,
    val budget: BigDecimal,
    val used: BigDecimal,
    val percentage: Double,
    val status: String
)

data class BudgetHierarchyDto(
    val date: LocalDate,
    val dayBudget: BigDecimal,
    val weekBudgetAggregate: BigDecimal,
    val weekSpecific: BigDecimal,
    val monthBudgetAggregate: BigDecimal,
    val monthSpecific: BigDecimal,
    val totalBudget: BigDecimal
)
```

## 7. 实施步骤

### Phase 1: 前端基础UI
1. 创建BudgetCalendar组件
2. 实现4种视图的日历网格
3. 实现单元格样式和进度条
4. 实现视图切换

### Phase 2: 详情抽屉
1. 创建DetailDrawer组件
2. 实现预算层级展示
3. 实现分类预算列表
4. 实现编辑表单

### Phase 3: 后端API
1. 实现getCalendarData API
2. 实现getBudgetHierarchy API
3. 实现syncToFuturePeriods API
4. 编写单元测试

### Phase 4: 联调与优化
1. 前后端联调
2. 性能优化（懒加载、缓存）
3. 错误处理
4. 用户体验优化

## 8. 待确认问题

1. 是否需要预算模板功能？（预设常见预算配置）
2. 历史数据如何处理？是否允许编辑过去日期的预算？
3. 是否需要预算提醒功能？（接近限额时推送通知）
