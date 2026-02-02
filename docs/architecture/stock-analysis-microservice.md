# 股票分析微服务架构设计

## 架构概述

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React :3000)                   │
│  • SSE订阅实时数据和LLM流式分析                           │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│         Spring Boot (:8080) - API网关 & 业务编排        │
│  • 统一认证授权 (JWT)                                    │
│  • 统一LLM调用 (不同业务提供不同数据源+提示词)            │
│  • SSE流式返回                                          │
│  • 从PostgreSQL读取历史数据                              │
└─────────────────────────────────────────────────────────┘
        ↓                    ↓                    ↓
   PostgreSQL          Python微服务          LLM API
   (:5432)            (:8001)            (通义千问)
   • 历史K线           • 定时拉取K线
   • 技术指标缓存      • 实时数据获取
   • 股票基本信息      • 技术指标计算
                      • 数据清洗
```

## 职责划分

### Spring Boot (主后端)
**核心职责：业务编排和API网关**

1. **认证授权**：JWT统一管理所有API
2. **LLM统一调用**：
   - 记账分析：提供交易数据 + 财务提示词
   - 健康分析：提供健康数据 + 医疗提示词
   - 骑行分析：提供骑行数据 + 训练提示词
   - **股票分析**：提供股票数据 + 投资提示词

3. **数据查询**：
   - 从PostgreSQL读取历史K线（定时任务已拉取）
   - 读取缓存的技术指标（1小时有效期）
   - 组装完整数据返回前端

4. **流式响应**：使用SSE推送实时数据和LLM分析

### Python微服务
**核心职责：数据处理和计算**

1. **定时任务**（每天收盘后执行）：
   - 拉取自选股列表的所有K线数据
   - 存储到PostgreSQL
   - 计算并缓存技术指标

2. **实时计算**：
   - 拉取实时行情（价格、成交量等）
   - 计算技术指标（MACD、RSI、KDJ等）
   - 返回给Spring Boot

3. **数据清洗**：
   - 统一数据格式
   - 处理缺失值
   - 数据质量检查

### PostgreSQL
**数据存储**

1. **stock_klines**：历史K线数据
2. **stock_indicators**：技术指标缓存
3. **stock_info**：股票基本信息
4. **user_stocks**：用户自选股

## API设计

### 前端调用流程

```
GET /api/v1/stocks/600000/overview  (HTTP)
→ 快速返回：基本信息 + 最新K线（从DB）

GET /api/v1/stocks/600000/realtime  (SSE)
→ 流式推送：
  1. 实时行情（调用Python）
  2. 技术指标（调用Python）
  3. LLM分析（Spring Boot调用LLM，流式返回）
```

### Python微服务API

```python
# 定时任务调用（内部）
POST /internal/sync-klines
→ 拉取今日K线数据

# 实时计算
POST /api/stock/calculate
→ 计算技术指标
→ 返回：{indicators: {...}, realtime: {...}}

# 实时数据
POST /api/stock/realtime
→ 获取实时行情
```

## 数据流

### 场景1：查看股票概览（无需实时数据）
```
前端 → Spring Boot → PostgreSQL
     ← 基本信息+最新K线
```

### 场景2：实时分析（需要最新数据）
```
前端 → Spring Boot → Python微服务
     ← SSE流式推送：
       1. 实时行情
       2. 技术指标
       3. LLM流式分析
```

### 场景3：定时任务（每天收盘后）
```
定时任务 → Python微服务 → Baostock/AkShare
         → PostgreSQL (存储K线)
         → PostgreSQL (缓存指标)
```

## 技术栈

- **前端**: React + SSE (EventSource)
- **网关**: Spring Boot + WebFlux (SSE支持)
- **计算**: Python + FastAPI + Pandas
- **存储**: PostgreSQL
- **AI**: 通义千问 API (OpenAI兼容)

## 实施计划

1. ✅ Python微服务基础框架
2. ✅ Spring Boot代理层
3. ⏳ PostgreSQL数据库设计
4. ⏳ Python定时任务
5. ⏳ SSE流式响应
6. ⏳ 前端SSE订阅
