# 股票信息查看功能设计文档

**日期**: 2025-02-19
**作者**: Claude & User
**状态**: 已批准，待实现

## 1. 目标

打造一个**专业股票分析工具**，提供股票搜索、K线图表展示、股票详情等功能。

## 2. 整体架构

### 2.1 技术栈
- **前端**: React + TypeScript + Ant Design + TradingView Lightweight Charts
- **后端**: Spring Boot (Kotlin) + PostgreSQL
- **数据源**: 现有 baostock 数据库

### 2.2 页面结构

| 路由 | 页面 | 功能 |
|------|------|------|
| `/stocks` | 自选股管理 | 现有页面，保留 |
| `/stocks/search` | 股票搜索列表 | **新增** |
| `/stocks/chart/:code` | K线图表 | **新增** |
| `/stocks/detail/:code` | 股票详情 | **新增** |

## 3. 后端 API 设计

### 3.1 股票搜索 API
```
GET /api/v1/stocks/search?keyword=xxx

Response:
{
  "success": true,
  "data": {
    "stocks": [
      {
        "code": "600000",
        "name": "浦发银行",
        "market": "sh",
        "industry": "银行",
        "latestPrice": 10.5,
        "changePercent": 2.3,
        "volume": 1000000
      }
    ]
  }
}
```

### 3.2 K线数据 API
```
GET /api/v1/stocks/{code}/klines?period=day&limit=500

Response:
{
  "success": true,
  "data": {
    "code": "600000",
    "name": "浦发银行",
    "klines": [
      {
        "timestamp": 1704067200000,
        "open": 10.2,
        "high": 10.5,
        "low": 10.1,
        "close": 10.4,
        "volume": 1000000
      }
    ]
  }
}
```

### 3.3 股票详情 API
```
GET /api/v1/stocks/{code}/detail

Response:
{
  "success": true,
  "data": {
    "info": { /* 基本信息 */ },
    "realtime": { /* 实时行情 */ },
    "indicators": { /* 技术指标 */ }
  }
}
```

## 4. 前端组件设计

### 4.1 新增组件

| 组件 | 路径 | 功能 |
|------|------|------|
| StockChart | `components/StockChart.tsx` | TradingView 图表封装 |
| StockSearch | `pages/StockSearch.tsx` | 股票搜索列表页 |
| StockDetail | `pages/StockDetail.tsx` | 股票详情页 |

### 4.2 StockChart 组件

**功能**：
- K线蜡烛图展示
- 时间范围切换（1月/3月/6月/1年/全部）
- 技术指标叠加（MA 5/10/20）
- 成交量柱状图
- 缩放、拖拽、十字光标

**Props**：
```typescript
interface StockChartProps {
  code: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
}
```

### 4.3 API 服务扩展

```typescript
// frontend/src/services/api.ts
getStockSearch(keyword: string): Promise<StockSearchResponse>;
getStockKlines(code: string, period: string, limit: number): Promise<KlineResponse>;
getStockDetail(code: string): Promise<StockDetailResponse>;
```

### 4.4 类型定义

```typescript
// frontend/src/types/stock.ts
interface StockSearchItem {
  code: string;
  name: string;
  market: string;
  industry: string;
  latestPrice: number;
  changePercent: number;
  volume: number;
}

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockDetail {
  info: StockInfo;
  realtime: StockRealtime;
  indicators: StockIndicators;
}
```

## 5. TradingView 图表集成

### 5.1 依赖安装
```bash
npm install lightweight-charts
```

### 5.2 数据格式转换

后端 K线数据 → TradingView 格式：
```typescript
{
  time: 1704067200,     // Unix timestamp (秒)
  open: 10.2,
  high: 10.5,
  low: 10.1,
  close: 10.4,
  volume: 1000000
}
```

### 5.3 图表布局
- 主图：K线蜡烛 + MA 线
- 副图：成交量（底部）
- 响应式：自适应容器宽度

## 6. 错误处理

### 6.1 数据加载失败
- 图表显示"数据加载失败，请重试"
- 提供重新加载按钮

### 6.2 无数据情况
- 显示"该股票暂无K线数据"
- 引导用户同步数据

### 6.3 搜索无结果
- 显示"未找到匹配的股票"
- 提供股票代码格式提示

## 7. 实现计划

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 1 | 后端：添加 3 个新 API 端点 | 2 小时 |
| 2 | 前端：创建 StockChart 组件 | 3 小时 |
| 3 | 前端：创建 StockSearch 页面 | 2 小时 |
| 4 | 前端：创建 StockDetail 页面 | 2 小时 |
| 5 | 路由配置和测试 | 1 小时 |

**总计：约 10 小时**

## 8. 数据库

使用现有表结构：
- `stock_info` - 股票基本信息
- `stock_klines` - K线历史数据

无需新增表。

## 9. 后续优化

自选股页面优化（第四阶段）：
- 添加 K线 快速预览
- 批量操作功能
- 自定义排序和筛选
