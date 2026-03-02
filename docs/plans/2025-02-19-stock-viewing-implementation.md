# 股票信息查看功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 实现专业股票分析工具，包括股票搜索列表、K线图表展示、股票详情页

**架构:** 前后端分离架构。前端通过 REST API 从后端获取股票数据，使用 TradingView Lightweight Charts 展示 K线图表。

**技术栈:**
- 前端: React + TypeScript + Ant Design + lightweight-charts
- 后端: Spring Boot (Kotlin) + PostgreSQL
- 数据源: 现有 stock_info 和 stock_klines 表

---

## 前置准备

### Step 1: 安装前端依赖

```bash
cd frontend
npm install lightweight-charts
```

验证: 检查 `frontend/package.json` 中包含 `"lightweight-charts": "^4.x"`

### Step 2: 创建前端类型定义

**文件:** `frontend/src/types/stock.ts`

```typescript
// 股票搜索结果项
export interface StockSearchItem {
  code: string;
  name: string;
  market: string;
  industry?: string;
  latestPrice?: number;
  changePercent?: number;
  volume?: number;
}

// 股票搜索响应
export interface StockSearchResponse {
  success: boolean;
  data: {
    stocks: StockSearchItem[];
  };
}

// K线数据点
export interface KlineData {
  time: number;  // Unix timestamp (秒)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// K线数据响应
export interface KlineResponse {
  success: boolean;
  data: {
    code: string;
    name: string;
    klines: KlineData[];
  };
}

// 股票基本信息
export interface StockInfo {
  code: string;
  name: string;
  market: string;
  industry?: string;
  marketCap?: number;
}

// 实时行情数据
export interface StockRealtime {
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  amount?: number;
  high?: number;
  low?: number;
  open?: number;
}

// 技术指标
export interface StockIndicators {
  ma5?: number;
  ma10?: number;
  ma20?: number;
  macd?: {
    dif?: number;
    dea?: number;
    macd?: number;
  };
  rsi?: number;
  kdj?: {
    k?: number;
    d?: number;
    j?: number;
  };
}

// 股票详情响应
export interface StockDetailResponse {
  success: boolean;
  data: {
    info: StockInfo;
    realtime?: StockRealtime;
    indicators?: StockIndicators;
  };
}

// 图表周期类型
export type ChartPeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

// 图表周期配置
export interface ChartPeriodConfig {
  key: ChartPeriod;
  label: string;
  days: number;
}
```

```bash
git add frontend/src/types/stock.ts
git commit -m "feat(stock): add stock types definition"
```

---

## 任务 1: 后端 - 股票搜索 API

### Step 1.1: 创建搜索 DTO

**文件:** `backend/src/main/kotlin/com/colafan/alfred/dto/stock/StockSearchItemDTO.kt`

```kotlin
package com.colafan.alfred.dto.stock

import java.time.LocalDateTime

data class StockSearchItemDTO(
    val code: String,
    val name: String,
    val market: String,
    val industry: String?,
    val latestPrice: Double?,
    val changePercent: Double?,
    val volume: Long?
)
```

**文件:** `backend/src/main/kotlin/com/colafan/alfred/dto/stock/StockSearchResponse.kt`

```kotlin
package com.colafan.alfred.dto.stock

data class StockSearchResponse(
    val stocks: List<StockSearchItemDTO>
)
```

```bash
cd backend && ./gradlew compileKotlin
```

### Step 1.2: 添加搜索方法到 Service

**修改文件:** `backend/src/main/kotlin/com/colafan/alfred/service/StockService.kt`

在 `StockService` 类中添加搜索方法：

```kotlin
/**
 * 搜索股票
 * 支持按代码或名称模糊搜索
 */
fun searchStocks(keyword: String): List<StockInfo> {
    return stockInfoRepository.findByCodeContainingIgnoreCaseOrNameContainingIgnoreCase(
        keyword, keyword
    )
}
```

### Step 1.3: 添加搜索 API 端点

**修改文件:** `backend/src/main/kotlin/com/colafan/alfred/controller/StockController.kt`

在 `StockController` 类中添加：

```kotlin
/**
 * 搜索股票
 */
@GetMapping("/search")
fun searchStocks(@RequestParam keyword: String): ResponseEntity<Map<String, Any>> {
    val stocks = stockService.searchStocks(keyword)

    val dtoList = stocks.map { stock ->
        StockSearchItemDTO(
            code = stock.code,
            name = stock.name,
            market = stock.market,
            industry = stock.industry,
            latestPrice = null,  // TODO: 从最新K线获取
            changePercent = null,
            volume = null
        )
    }

    return ResponseEntity.ok(mapOf(
        "success" to true,
        "data" to mapOf(
            "stocks" to dtoList
        )
    ))
}
```

```bash
cd backend && ./gradlew compileKotlin
```

### Step 1.4: 测试搜索 API

```bash
curl -s "http://localhost:8080/api/v1/stocks/search?keyword=60" | jq .
```

预期返回：包含代码或名称含 "60" 的股票列表

```bash
git add backend/src/main/kotlin/com/colafan/alfred/dto/stock/ backend/src/main/kotlin/com/colafan/alfred/service/StockService.kt backend/src/main/kotlin/com/colafan/alfred/controller/StockController.kt
git commit -m "feat(stock): add stock search API endpoint"
```

---

## 任务 2: 后端 - K线数据 API

### Step 2.1: 创建 K线 DTO

**文件:** `backend/src/main/kotlin/com/colafan/alfred/dto/stock/KlineDataDTO.kt`

```kotlin
package com.colafan.alfred.dto.stock

data class KlineDataDTO(
    val timestamp: Long,  // Unix timestamp in milliseconds
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
    val volume: Long
)
```

**文件:** `backend/src/main/kotlin/com/colafan/alfred/dto/stock/KlineResponseDTO.kt`

```kotlin
package com.colafan.alfred.dto.stock

data class KlineResponseDTO(
    val code: String,
    val name: String,
    val klines: List<KlineDataDTO>
)
```

### Step 2.2: 添加 K线查询方法到 Repository

**修改文件:** `backend/src/main/kotlin/com/colafan/alfred/repository/StockKlineRepository.kt`

添加查询方法：

```kotlin
/**
 * 查找指定股票的K线数据
 * @param code 股票代码
 * @param limit 返回记录数限制
 * @return 按交易日期升序排列的K线数据
 */
fun findByStockCodeOrderByTradeDateAsc(
    @Param("code") code: String,
    @Param("limit") limit: Int = 500
): List<StockKline>
```

**文件:** `backend/src/main/resources/db/migration/V43__add_kline_query_method.sql`

```sql
-- 添加索引以优化K线查询
CREATE INDEX idx_stock_klines_code_trade_date
ON stock_klines(stock_code, trade_date DESC);

-- 添加查询方法
-- 注：由于使用了Spring Data JPA，查询方法在Repository接口中定义
```

### Step 2.3: 添加 K线查询方法到 Service

**修改文件:** `backend/src/main/kotlin/com/colafan/alfred/service/StockService.kt`

```kotlin
/**
 * 获取股票K线数据
 * @param code 股票代码
 * @param limit 返回记录数
 * @return K线数据列表
 */
fun getStockKlines(code: String, limit: Int = 500): Pair<StockInfo, List<StockKline>> {
    val stockInfo = stockInfoRepository.findByCode(code)
        ?: throw IllegalArgumentException("股票不存在: $code")

    val klines = stockKlineRepository.findByStockCodeOrderByTradeDateAsc(code, limit)

    return stockInfo to klines
}
```

### Step 2.4: 添加 K线 API 端点

**修改文件:** `backend/src/main/kotlin/com/colafan/alfred/controller/StockController.kt`

```kotlin
/**
 * 获取股票K线数据
 */
@GetMapping("/{code}/klines")
fun getStockKlines(
    @PathVariable code: String,
    @RequestParam(defaultValue = "day") period: String,
    @RequestParam(defaultValue = "500") limit: Int
): ResponseEntity<Map<String, Any>> {
    try {
        val (stockInfo, klines) = stockService.getStockKlines(code, limit)

        val klineDtos = klines.map { kline ->
            KlineDataDTO(
                timestamp = kline.tradeDate.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),
                open = kline.open,
                high = kline.high,
                low = kline.low,
                close = kline.close,
                volume = kline.volume
            )
        }

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "data" to KlineResponseDTO(
                code = stockInfo.code,
                name = stockInfo.name,
                klines = klineDtos
            )
        ))
    } catch (e: IllegalArgumentException) {
        return ResponseEntity.status(404).body(mapOf(
            "success" to false,
            "message" to e.message
        ))
    }
}
```

```bash
cd backend && ./gradlew compileKotlin
```

### Step 2.5: 测试 K线 API

```bash
# 假设数据库中有 600000 的K线数据
curl -s "http://localhost:8080/api/v1/stocks/600000/klines?limit=10" | jq .
```

```bash
git add backend/src/main/kotlin/com/colafan/alfred/dto/stock/KlineDataDTO.kt backend/src/main/kotlin/com/colafan/alfred/dto/stock/KlineResponseDTO.kt backend/src/main/kotlin/com/colafan/alfred/repository/StockKlineRepository.kt backend/src/main/kotlin/com/colafan/alfred/service/StockService.kt backend/src/main/kotlin/com/colafan/alfred/controller/StockController.kt
git commit -m "feat(stock): add stock klines API endpoint"
```

---

## 任务 3: 后端 - 股票详情 API

### Step 3.1: 创建详情 DTO

**文件:** `backend/src/main/kotlin/com/colafan/alfred/dto/stock/StockDetailResponseDTO.kt`

```kotlin
package com.colafan.alfred.dto.stock

import com.colafan.alfred.dto.stock.StockInfoDTO

data class StockDetailResponseDTO(
    val info: StockInfoDTO,
    val realtime: Map<String, Any>?,
    val indicators: Map<String, Any>?
)
```

### Step 3.2: 添加详情查询方法到 Service

**修改文件:** `backend/src/main/kotlin/com/colafan/alfred/service/StockService.kt`

```kotlin
/**
 * 获取股票详情（整合信息）
 * @param code 股票代码
 * @return 股票详情
 */
fun getStockDetail(code: String): StockDetail {
    val stockInfo = stockInfoRepository.findByCode(code)
        ?: throw IllegalArgumentException("股票不存在: $code")

    // 获取最新K线数据作为实时行情参考
    val latestKline = stockKlineRepository
        .findTopByStockCodeOrderByTradeDateDesc(code)
        .firstOrNull()

    val realtimeData = mutableMapOf<String, Any>()
    latestKline?.let {
        realtimeData["price"] = it.close
        realtimeData["change"] = it.pctChange
        realtimeData["open"] = it.open
        realtimeData["high"] = it.high
        realtimeData["low"] = it.low
        realtimeData["volume"] = it.volume
    }

    return StockDetail(
        info = stockInfo,
        realtimeData = realtimeData
    )
}
```

### Step 3.3: 添加详情 API 端点

**修改文件:** `backend/src/main/kotlin/com/colafan/alfred/controller/StockController.kt`

```kotlin
/**
 * 获取股票详情
 */
@GetMapping("/{code}/detail")
fun getStockDetail(@PathVariable code: String): ResponseEntity<Map<String, Any>> {
    try {
        val detail = stockService.getStockDetail(code)

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "data" to detail.toDTO()
        ))
    } catch (e: IllegalArgumentException) {
        return ResponseEntity.status(404).body(mapOf(
            "success" to false,
            "message" to e.message
        ))
    }
}
```

```bash
cd backend && ./gradlew compileKotlin
```

```bash
git add backend/src/main/kotlin/com/colafan/alfred/dto/stock/StockDetailResponseDTO.kt backend/src/main/kotlin/com/colafan/alfred/service/StockService.kt backend/src/main/kotlin/com/colafan/alfred/controller/StockController.kt
git commit -m "feat(stock): add stock detail API endpoint"
```

---

## 任务 4: 前端 - API 服务扩展

### Step 4.1: 添加股票 API 方法

**修改文件:** `frontend/src/services/api.ts`

在 `ApiService` 类中添加：

```typescript
/**
 * 搜索股票
 */
async getStockSearch(keyword: string): Promise<{ success: boolean; data: { stocks: StockSearchItem[] } }> {
  return this.client.get(`/stocks/search`, { params: { keyword } });
}

/**
 * 获取股票K线数据
 */
async getStockKlines(code: string, period: string = 'day', limit: number = 500): Promise<{
  success: boolean;
  data: {
    code: string;
    name: string;
    klines: KlineData[]
  }
}> {
  return this.client.get(`/stocks/${code}/klines`, { params: { period, limit } });
}

/**
 * 获取股票详情
 */
async getStockDetail(code: string): Promise<{
  success: boolean;
  data: StockDetail
}> {
  return this.client.get(`/stocks/${code}/detail`);
}
```

确保导入类型：
```typescript
import type {
  StockSearchItem,
  KlineData,
  StockDetail
} from '../types/stock';
```

```bash
cd frontend && npm run build
```

```bash
git add frontend/src/services/api.ts frontend/src/types/stock.ts
git commit -m "feat(stock): add stock API methods"
```

---

## 任务 5: 前端 - StockChart 组件

### Step 5.1: 创建 StockChart 组件

**文件:** `frontend/src/components/StockChart.tsx`

```typescript
import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType } from 'lightweight-charts';
import { Card, Spin, Alert, Button, Select } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { KlineData, ChartPeriod } from '@/types/stock';

interface StockChartProps {
  code: string;
  name: string;
  period?: ChartPeriod;
  onPeriodChange?: (period: ChartPeriod) => void;
}

const periodOptions: { key: ChartPeriod; label: string; days: number }[] = [
  { key: '1M', label: '1月', days: 30 },
  { key: '3M', label: '3月', days: 90 },
  { key: '6M', label: '6月', days: 180 },
  { key: '1Y', label: '1年', days: 365 },
  { key: 'ALL', label: '全部', days: 3650 },
];

const StockChart: React.FC<StockChartProps> = ({ code, name, period = '1Y', onPeriodChange }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Bar'> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<ChartPeriod>(period);

  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    chart.priceScale().applyOptions({
      alignLabels: true,
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // 加载数据
  useEffect(() => {
    loadKlineData(currentPeriod);
  }, [code, currentPeriod]);

  const loadKlineData = async (period: ChartPeriod) => {
    if (!seriesRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const periodConfig = periodOptions.find(p => p.key === period);
      const limit = periodConfig?.days || 365;

      const response = await fetch(`/api/v1/stocks/${code}/klines?limit=${limit}`);
      const result = await response.json();

      if (!result.success || !result.data?.klines?.length) {
        throw new Error('无K线数据');
      }

      const klines = result.data.klines.map((k: KlineData) => ({
        time: k.time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }));

      const volumeData = result.data.klines.map((k: KlineData) => ({
        time: k.time,
        value: k.volume,
        color: k.close >= k.open ? '#26a69a80' : '#ef535080',
      }));

      seriesRef.current.setData(klines);
      volumeSeriesRef.current?.setData(volumeData);

    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: ChartPeriod) => {
    setCurrentPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const handleReload = () => {
    loadKlineData(currentPeriod);
  };

  return (
    <Card
      title={`${name} (${code}) - K线图`}
      extra={
        <Space>
          <Select
            value={currentPeriod}
            onChange={handlePeriodChange}
            style={{ width: 100 }}
          >
            {periodOptions.map(p => (
              <Select.Option key={p.key} value={p.key}>{p.label}</Select.Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
            刷新
          </Button>
        </Space>
      }
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      )}

      {error && (
        <Alert
          type="error"
          message={error}
          action={
            <Button size="small" onClick={handleReload}>
              重试
            </Button>
          }
          showIcon
        />
      )}

      <div ref={chartContainerRef} style={{ height: 400 }} />
    </Card>
  );
};

export default StockChart;
```

```bash
cd frontend && npm run build
```

```bash
git add frontend/src/components/StockChart.tsx
git commit -m "feat(stock): add StockChart component with TradingView Lightweight Charts"
```

---

## 任务 6: 前端 - StockSearch 页面

### Step 6.1: 创建搜索页面

**文件:** `frontend/src/pages/StockSearch.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, message, Card, Typography } from 'antd';
import { SearchOutlined, BarChartOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { StockSearchItem } from '@/types/stock';

const { Title } = Typography;

const StockSearch = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');

  // 搜索股票
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      setStocks([]);
      return;
    }

    try {
      setLoading(true);
      const response = await api.getStockSearch(keyword) as any;
      if (response.success) {
        setStocks(response.data?.stocks || []);
      }
    } catch (error) {
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加到自选股
  const handleAddStock = async (code: string) => {
    try {
      await api.addStock({ code, name: stocks.find(s => s.code === code)?.name || code });
      message.success('已添加到自选股');
    } catch (error) {
      message.error('添加失败');
    }
  };

  // 查看图表
  const handleViewChart = (code: string) => {
    navigate(`/stocks/chart/${code}`);
  };

  // 查看详情
  const handleViewDetail = (code: string) => {
    navigate(`/stocks/detail/${code}`);
  };

  const columns: ColumnsType<StockSearchItem> = [
    {
      title: '代码',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '市场',
      dataIndex: 'market',
      key: 'market',
      render: (market) => market === 'sh' ? '上海' : '深圳',
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            size="small"
            onClick={() => handleViewChart(record.code)}
          >
            图表
          </Button>
          <Button
            size="small"
            onClick={() => handleViewDetail(record.code)}
          >
            详情
          </Button>
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={() => handleAddStock(record.code)}
          >
            自选
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Title level={3}>股票搜索</Title>

          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入股票代码或名称（如：600000、浦发银行）"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onPressEnter={() => handleSearch(searchCode)}
              style={{ width: 'calc(100% - 120px)' }}
              prefix={<SearchOutlined />}
            />
            <Button
              type="primary"
              onClick={() => handleSearch(searchCode)}
              loading={loading}
            >
              搜索
            </Button>
          </Space.Compact>

          <Table
            columns={columns}
            dataSource={stocks}
            loading={loading}
            rowKey="code"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default StockSearch;
```

### Step 6.2: 添加路由

**修改文件:** `frontend/src/App.tsx`

添加路由：
```typescript
import StockSearch from './pages/StockSearch';
```

在 Routes 中添加：
```tsx
<Route path="/stocks/search" element={<StockSearch />} />
```

```bash
cd frontend && npm run build
```

```bash
git add frontend/src/pages/StockSearch.tsx frontend/src/App.tsx
git commit -m "feat(stock): add StockSearch page with routing"
```

---

## 任务 7: 前端 - StockDetail 页面

### Step 7.1: 创建详情页面

**文件:** `frontend/src/pages/StockDetail.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Descriptions, Statistic, Spin, Alert, Button, Tabs, Tag, Space } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import StockChart from '@/components/StockChart';
import type { StockDetail, ChartPeriod } from '@/types/stock';

const StockDetail = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1Y');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!code) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.getStockDetail(code) as any;

      if (response.success) {
        setDetail(response.data);
      } else {
        throw new Error(response.message || '加载失败');
      }
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [code]);

  const handleAddToWatchlist = async () => {
    if (!detail) return;
    try {
      await api.addStock({ code: detail.info.code, name: detail.info.name });
      message.success('已添加到自选股');
    } catch (err) {
      message.error('添加失败');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message={error}
          action={
            <Button onClick={() => navigate('/stocks/search')}>返回搜索</Button>
          }
          showIcon
        />
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  const { info, realtime, indicators } = detail;

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 头部 */}
        <Card>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space size="large">
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stocks/search')}>
                  返回
                </Button>
                <h2 style={{ margin: 0 }}>{info.name} ({info.code})</h2>
                <Tag color={info.market === 'sh' ? 'red' : 'green'}>
                  {info.market === 'sh' ? '上海' : '深圳'}
                </Tag>
                {info.industry && <Tag>{info.industry}</Tag>}
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={loadDetail}>刷新</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddToWatchlist}>
                  加入自选
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 实时行情 */}
        {realtime && Object.keys(realtime).length > 0 && (
          <Card title="实时行情">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="当前价"
                  value={realtime.price || 0}
                  precision={2}
                  prefix="¥"
                  valueStyle={{
                    color: (realtime.changePercent || 0) >= 0 ? '#cf1322' : '#3f8600',
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="涨跌幅"
                  value={realtime.changePercent || 0}
                  precision={2}
                  suffix="%"
                  valueStyle={{
                    color: (realtime.changePercent || 0) >= 0 ? '#cf1322' : '#3f8600',
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic title="今开" value={realtime.open || 0} precision={2} />
              </Col>
              <Col span={6}>
                <Statistic title="成交量" value={realtime.volume || 0} />
              </Col>
            </Row>
          </Card>
        )}

        {/* K线图表 */}
        <StockChart
          code={code}
          name={info.name}
          period={chartPeriod}
          onPeriodChange={setChartPeriod}
        />

        {/* 技术指标 */}
        {indicators && (
          <Card title="技术指标">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="MA5">{indicators.ma5?.toFixed(2) || '-'}</Descriptions.Item>
              <Descriptions.Item label="MA10">{indicators.ma10?.toFixed(2) || '-'}</Descriptions.Item>
              <Descriptions.Item label="MA20">{indicators.ma20?.toFixed(2) || '-'}</Descriptions.Item>
              <Descriptions.Item label="RSI">{indicators.rsi?.toFixed(2) || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default StockDetail;
```

### Step 7.2: 添加路由

**修改文件:** `frontend/src/App.tsx`

添加路由：
```typescript
import StockDetail from './pages/StockDetail';
```

在 Routes 中添加：
```tsx
<Route path="/stocks/detail/:code" element={<StockDetail />} />
```

```bash
cd frontend && npm run build
```

```bash
git add frontend/src/pages/StockDetail.tsx frontend/src/App.tsx
git commit -m "feat(stock): add StockDetail page with routing"
```

---

## 任务 8: 前端 - StockChart 图表页面

### Step 8.1: 创建图表页面

**文件:** `frontend/src/pages/StockChartPage.tsx`

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, Spin, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import { useState, useEffect } from 'react';
import StockChart from '@/components/StockChart';
import type { ChartPeriod } from '@/types/stock';

const StockChartPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [stockName, setStockName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    const loadStockInfo = async () => {
      try {
        const response = await api.getStockDetail(code) as any;
        if (response.success) {
          setStockName(response.data.info.name);
        }
      } catch (err) {
        setError('加载股票信息失败');
      } finally {
        setLoading(false);
      }
    };

    loadStockInfo();
  }, [code]);

  const handlePeriodChange = (period: ChartPeriod) => {
    // 更新图表周期
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message={error}
          action={<Button onClick={() => navigate('/stocks/search')}>返回</Button>}
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stocks/search')}>
        返回搜索
      </Button>

      <div style={{ marginTop: 16 }}>
        <StockChart
          code={code!}
          name={stockName || code}
          onPeriodChange={handlePeriodChange}
        />
      </div>
    </div>
  );
};

export default StockChartPage;
```

### Step 8.2: 添加路由

**修改文件:** `frontend/src/App.tsx`

添加路由：
```typescript
import StockChartPage from './pages/StockChartPage';
```

在 Routes 中添加：
```tsx
<Route path="/stocks/chart/:code" element={<StockChartPage />} />
```

```bash
cd frontend && npm run build
```

```bash
git add frontend/src/pages/StockChartPage.tsx frontend/src/App.tsx
git commit -m "feat(stock): add standalone StockChart page"
```

---

## 任务 9: 导航菜单集成

### Step 9.1: 添加导航链接

**修改文件:** `frontend/src/components/Layout.tsx`

在导航菜单中添加股票相关链接：
```typescript
<Menu.Item key="/stocks/search" icon={<SearchOutlined />}>
  <Link to="/stocks/search">股票搜索</Link>
</Menu.Item>
```

```bash
cd frontend && npm run build
```

```bash
git add frontend/src/components/Layout.tsx
git commit -m "feat(stock): add stock search link to navigation menu"
```

---

## 任务 10: 集成测试

### Step 10.1: 端到端测试

```bash
# 1. 启动后端
cd backend && ./gradlew bootRun

# 2. 启动前端
cd frontend && npm run dev

# 3. 测试功能
# - 访问 http://localhost:3000/stocks/search
# - 搜索 "600000"
# - 点击"图表"按钮查看K线图
# - 点击"详情"按钮查看详情页
# - 测试时间范围切换
```

### Step 10.2: API 测试脚本

**文件:** `scripts/test_stock_api.sh`

```bash
#!/bin/bash
BASE_URL="http://localhost:8080/api/v1"

echo "=== 测试股票搜索 API ==="
curl -s "$BASE_URL/stocks/search?keyword=60" | jq .

echo -e "\n=== 测试K线数据 API ==="
curl -s "$BASE_URL/stocks/600000/klines?limit=10" | jq .

echo -e "\n=== 测试股票详情 API ==="
curl -s "$BASE_URL/stocks/600000/detail" | jq .
```

```bash
chmod +x scripts/test_stock_api.sh
```

```bash
git add scripts/test_stock_api.sh
git commit -m "test(stock): add stock API integration test script"
```

---

## 实成总结

完成后，系统将具备以下新功能：

1. ✅ 股票搜索列表 (`/stocks/search`)
2. ✅ K线图表展示 (`/stocks/chart/:code`)
3. ✅ 股票详情页 (`/stocks/detail/:code`)
4. ✅ TradingView Lightweight Charts 集成
5. ✅ 完整的前后端 API

**新增文件：**
- `frontend/src/types/stock.ts`
- `frontend/src/components/StockChart.tsx`
- `frontend/src/pages/StockSearch.tsx`
- `frontend/src/pages/StockDetail.tsx`
- `frontend/src/pages/StockChartPage.tsx`
- `backend/src/main/kotlin/com/colafan/alfred/dto/stock/*`
- `scripts/test_stock_api.sh`

**修改文件：**
- `frontend/src/services/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/Layout.tsx`
- `backend/src/main/kotlin/com/colafan/alfred/controller/StockController.kt`
- `backend/src/main/kotlin/com/colafan/alfred/service/StockService.kt`
- `backend/src/main/kotlin/com/colafan/alfred/repository/StockKlineRepository.kt`

**总预计时间：约 10 小时**
