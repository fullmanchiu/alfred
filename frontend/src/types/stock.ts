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
  time: number;  // Unix timestamp (毫秒)
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
export interface StockBasicInfo {
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
export interface StockDetail {
  info: StockBasicInfo;
  realtime?: StockRealtime;
  indicators?: StockIndicators;
}

// 图表周期类型
export type ChartPeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

// 图表周期配置
export interface ChartPeriodConfig {
  key: ChartPeriod;
  label: string;
  days: number;
}
