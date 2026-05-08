/**
 * 图表配置类型定义
 * Chart Configuration Types
 */

// K线样式类型
export type CandleStyle = 'solid' | 'hollow' | 'american';

// 复权类型
export type FqType = 'qfq' | 'hfq' | 'none';

// 周期类型
export type PeriodType = 'day' | 'week' | 'month' | 'year';

// 主图配置
export interface MainChartConfig {
  candleStyle: CandleStyle;
  // MA均线配置
  showMA: boolean;
  maPeriods: number[];
  maColors: string[]; // 对应每条MA的颜色
  // EMA均线配置
  showEMA: boolean;
  emaPeriods: number[];
  emaColors: string[];
  // 布林带配置
  showBOLL: boolean;
  bollPeriod: number;
  bollStdDev: number; // 标准差倍数
  // SAR抛物线配置
  showSAR: boolean;
}

// 副图配置
export interface SubChartConfig {
  count: number; // 1-4个副图
  subCharts: {
    indicatorId: string; // 指标ID
    enabled: boolean;
  }[];
}

// 指标参数（全局统一）
export interface IndicatorParams {
  // MA参数
  MA: {
    periods: number[];
    colors: string[];
  };
  // EMA参数
  EMA: {
    periods: number[];
    colors: string[];
  };
  // 布林带参数
  BOLL: {
    period: number;
    stdDev: number;
    upperColor: string;
    middleColor: string;
    lowerColor: string;
  };
  // MACD参数
  MACD: {
    fast: number;
    slow: number;
    signal: number;
    difColor: string;
    deaColor: string;
    histogramUpColor: string;
    histogramDownColor: string;
  };
  // KDJ参数
  KDJ: {
    k: number;
    d: number;
    j: number;
    kColor: string;
    dColor: string;
    jColor: string;
  };
  // RSI参数
  RSI: {
    period: number;
    color: string;
    overbought: number; // 超买线
    oversold: number; // 超卖线
  };
  // CCI参数
  CCI: {
    period: number;
    color: string;
    overbought: number;
    oversold: number;
  };
  // OBV参数
  OBV: {
    color: string;
  };
  // ATR参数
  ATR: {
    period: number;
    color: string;
  };
}

// 完整图表配置
export interface ChartConfig {
  fqType: FqType;
  mainChart: MainChartConfig;
  subChart: SubChartConfig;
  indicatorParams: IndicatorParams;
}

// 支持的副图指标列表
export const SUB_CHART_INDICATORS = [
  { id: 'VOL', name: '成交量', hasParams: false },
  { id: 'MACD', name: 'MACD', hasParams: true },
  { id: 'KDJ', name: 'KDJ', hasParams: true },
  { id: 'RSI', name: 'RSI', hasParams: true },
  { id: 'CCI', name: 'CCI', hasParams: true },
  { id: 'OBV', name: 'OBV', hasParams: true },
  { id: 'ATR', name: 'ATR', hasParams: true },
  { id: 'W%R', name: '威廉指标', hasParams: true },
  { id: 'BIAS', name: '乖离率', hasParams: true },
] as const;

export type SubChartIndicatorId = typeof SUB_CHART_INDICATORS[number]['id'];

// 默认配置
export const DEFAULT_CHART_CONFIG: ChartConfig = {
  fqType: 'qfq',
  mainChart: {
    candleStyle: 'solid',
    showMA: true,
    maPeriods: [5, 10, 20, 60],
    maColors: ['#f5ce56', '#00bcd4', '#ff9800', '#9c27b0'],
    showEMA: false,
    emaPeriods: [7, 25, 50, 144],
    emaColors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'],
    showBOLL: false,
    bollPeriod: 20,
    bollStdDev: 2,
    showSAR: false,
  },
  subChart: {
    count: 3,
    subCharts: [
      { indicatorId: 'VOL', enabled: true },
      { indicatorId: 'MACD', enabled: true },
      { indicatorId: 'KDJ', enabled: true },
      { indicatorId: '', enabled: false }, // 占位
    ],
  },
  indicatorParams: {
    MA: {
      periods: [5, 10, 20, 60],
      colors: ['#f5ce56', '#00bcd4', '#ff9800', '#9c27b0'],
    },
    EMA: {
      periods: [7, 25, 50, 144],
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'],
    },
    BOLL: {
      period: 20,
      stdDev: 2,
      upperColor: '#ff9800',
      middleColor: '#00bcd4',
      lowerColor: '#ff9800',
    },
    MACD: {
      fast: 12,
      slow: 26,
      signal: 9,
      difColor: '#ffffff',
      deaColor: '#ffeb3b',
      histogramUpColor: '#ef5350',
      histogramDownColor: '#26a69a',
    },
    KDJ: {
      k: 9,
      d: 3,
      j: 3,
      kColor: '#ffffff',
      dColor: '#ffeb3b',
      jColor: '#ff5722',
    },
    RSI: {
      period: 14,
      color: '#ffffff',
      overbought: 70,
      oversold: 30,
    },
    CCI: {
      period: 14,
      color: '#ffffff',
      overbought: 100,
      oversold: -100,
    },
    OBV: {
      color: '#26a69a',
    },
    ATR: {
      period: 14,
      color: '#ffffff',
    },
  },
};
