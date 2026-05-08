# StockDetailTest - 单Chart多Pane测试组件

## 概述

`StockDetailTest` 是一个使用 Lightweight Charts 5.0 单chart多pane架构的测试组件。

## 核心特性

1. **单图表实例**：使用一个chart实例，通过`addPane()`创建副图
2. **共享时间轴**：所有pane共享时间轴，价格轴自动对齐
3. **动态副图**：支持1-4个副图动态添加/删除
4. **高度控制**：使用`setHeight()`控制副图高度

## 技术指标

### 主图
- K线图
- MA均线（5、10、20、60日）

### 副图
- VOL：成交量
- MACD：指数平滑异同移动平均线
- KDJ：随机指标
- RSI：相对强弱指标
- CCI：顺势指标
- OBV：能量潮指标

## 使用方法

### 访问测试页面

```
http://localhost:3000/stocks/test/{股票代码}
```

例如：
```
http://localhost:3000/stocks/test/000001
```

### 测试脚本

```bash
cd /Users/qiuliang/code/alfred
./scripts/test_stock_detail_test.sh
```

## 测试清单

1. ✅ 页面正常加载
2. ✅ K线图显示正确
3. ✅ 3个默认副图显示（VOL、MACD、KDJ）
4. ✅ 添加副图功能正常
5. ✅ 删除副图功能正常
6. ✅ 副图数量限制在4个
7. ✅ 刷新按钮重新加载数据

## 实现细节

### 图表初始化

```typescript
const chart = createChart(containerRef.current, {
  width: containerRef.current.clientWidth,
  height: 600,
  layout: {
    background: { color: '#1a1a2e' },
    textColor: '#d1d5db',
  },
  // ... 其他配置
});

// 获取主图pane（默认存在）
const panes = chart.panes();
const mainPane = panes[0];

// 添加K线系列
const candlestickSeries = mainPane.addSeries(CandlestickSeries, {
  upColor: '#26a69a',
  downColor: '#ef5350',
  // ...
});
```

### 添加副图

```typescript
const addSubChart = () => {
  if (!chartRef.current) return;

  const newPane = chartRef.current.addPane();
  newPane.setHeight(100); // 设置副图高度

  // 添加系列
  const volumeSeries = newPane.addSeries(HistogramSeries, {
    color: '#26a69a',
  });

  setPanes([...panes, newPane]);
};
```

### 删除副图

```typescript
const removeSubChart = (index: number) => {
  if (!chartRef.current) return;
  chartRef.current.removePane(index + 1); // +1跳过主图
};
```

## API参考

### IPaneApi主要方法

- `addSeries(T, options)` - 添加系列到pane
- `setHeight(height)` - 设置pane高度（像素）
- `setStretchFactor(factor)` - 设置拉伸因子（相对高度）
- `getHeight()` - 获取pane高度
- `moveTo(index)` - 移动pane到指定位置
- `paneIndex()` - 获取pane索引

### IChartApi主要方法

- `addPane()` - 添加新pane
- `removePane(index)` - 删除指定索引的pane
- `panes()` - 获取所有pane数组

## 文件结构

```
frontend/src/
├── pages/
│   ├── StockDetailTest.tsx      # 测试组件主文件
│   └── StockDetailTest.css      # 样式文件
├── components/
│   └── ...
└── types/
    └── ...
```

## 对比现有实现

| 特性 | StockDetailTest (新) | DynamicProfessionalStockChart (现有) |
|------|---------------------|-----------------------------------|
| 图表实例 | 单chart多pane | 多chart（主图+副图分离） |
| 时间轴同步 | 自动共享 | 需要手动同步 |
| 实现复杂度 | 较低 | 较高 |
| 性能 | 更好 | 一般 |
| 灵活性 | 高 | 中 |

## 未来优化

1. 支持副图高度拖动调整
2. 支持副图位置拖拽交换
3. 添加更多技术指标
4. 支持自定义指标参数
5. 添加图表截图功能

## 相关文档

- [Lightweight Charts 5.0 文档](https://www.tradingview.com/lightweight-charts/)
- [Lightweight Charts API 参考](https://www.tradingview.com/lightweight-charts/docs/api/)
