import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Spin, Alert, message, Typography, Row, Col, Divider } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MinusOutlined, ReloadOutlined } from '@ant-design/icons';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData, Time, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { api } from '@/services/api';
import type { KlineData } from '@/types/stock';
import { SubChartIndicatorId } from '@/types/chart';
import SubChartIndicatorSwitcher from '@/components/SubChartIndicatorSwitcher';
import './StockDetailTest.css';

const { Text } = Typography;

/**
 * 副图指标类型
 */
type SubChartIndicator = 'VOL' | 'MACD' | 'KDJ' | 'RSI' | 'CCI' | 'OBV';

/**
 * 副图配置接口
 */
interface SubChartConfig {
  id: string;
  indicator: SubChartIndicator;
  height: number;
}

/**
 * StockDetailTest - Lightweight Charts 5.0 单chart多pane测试组件
 *
 * 核心特性:
 * - 单图表实例，使用 addPane() 创建副图
 * - 所有pane共享时间轴，价格轴自动对齐
 * - 支持1-4个副图动态添加/删除
 * - 使用 setStretchFactor() 控制副图高度
 */
const StockDetailTest: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  // 图表实例引用
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // 系列引用（用于更新数据）
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const bollSeriesRef = useRef<ISeriesApi<'Line'>[]>([]); // BOLL 上、中、下轨
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // 副图系列引用映射
  const subChartSeriesRef = useRef<Map<string, ISeriesApi<any>[]>>(new Map());

  // 状态管理
  const [klines, setKlines] = useState<KlineData[]>([]);
  const klinesRef = useRef<KlineData[]>([]); // 用于在 crosshair 回调中访问最新值
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockInfo, setStockInfo] = useState<{ code: string; name: string } | null>(null);

  // 主图指标状态：ma | boll | none
  const [mainChartIndicator, setMainChartIndicator] = useState<'ma' | 'boll' | 'none'>('ma');

  // 副图配置
  const [subCharts, setSubCharts] = useState<SubChartConfig[]>([
    { id: 'vol-1', indicator: 'VOL', height: 100 },
    { id: 'macd-1', indicator: 'MACD', height: 100 },
    { id: 'kdj-1', indicator: 'KDJ', height: 100 },
  ]);

  // 指标当前数值
  const [indicatorValues, setIndicatorValues] = useState<Map<string, string>>(new Map());

  // 副图切换弹窗状态
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [switcherSubChartId, setSwitcherSubChartId] = useState<string | null>(null);

  /**
   * 计算移动平均线
   */
  const calculateMA = useCallback((data: KlineData[], period: number): Map<Time, number> => {
    const maData = new Map<Time, number>();

    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      maData.set(data[i].time as Time, sum / period);
    }

    return maData;
  }, []);

  /**
   * 计算BOLL布林带指标
   */
  const calculateBOLL = useCallback((data: KlineData[], period: number = 20, stdDev: number = 2): Map<Time, { upper: number; middle: number; lower: number }> => {
    const bollData = new Map<Time, { upper: number; middle: number; lower: number }>();

    for (let i = period - 1; i < data.length; i++) {
      // 计算中轨（MA）
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      const middle = sum / period;

      // 计算标准差
      let squaredSum = 0;
      for (let j = 0; j < period; j++) {
        squaredSum += Math.pow(data[i - j].close - middle, 2);
      }
      const std = Math.sqrt(squaredSum / period);

      // 计算上下轨
      const upper = middle + stdDev * std;
      const lower = middle - stdDev * std;

      bollData.set(data[i].time as Time, { upper, middle, lower });
    }

    return bollData;
  }, []);

  /**
   * 计算MACD指标
   */
  const calculateMACD = useCallback((data: KlineData[]): Map<Time, { dif: number; dea: number; macd: number }> => {
    const macdData = new Map<Time, { dif: number; dea: number; macd: number }>();
    const fastPeriod = 12;
    const slowPeriod = 26;
    const signalPeriod = 9;

    // 计算EMA
    const calculateEMA = (prices: number[], period: number): number[] => {
      const ema: number[] = [];
      const multiplier = 2 / (period + 1);

      // 第一个EMA值使用SMA
      let sum = 0;
      for (let i = 0; i < period && i < prices.length; i++) {
        sum += prices[i];
      }
      ema.push(sum / Math.min(period, prices.length));

      // 后续EMA值
      for (let i = period; i < prices.length; i++) {
        const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
        ema.push(currentEMA);
      }

      return ema;
    };

    const closes = data.map(d => d.close);
    const emaFast = calculateEMA(closes, fastPeriod);
    const emaSlow = calculateEMA(closes, slowPeriod);

    // 计算DIF
    const dif: number[] = [];
    for (let i = 0; i < emaFast.length && i < emaSlow.length; i++) {
      dif.push(emaFast[i] - emaSlow[i]);
    }

    // 计算DEA (Signal line)
    const dea = calculateEMA(dif, signalPeriod);

    // 计算MACD柱
    const startIndex = slowPeriod - 1 + signalPeriod - 1;
    for (let i = 0; i < dif.length && i < dea.length; i++) {
      const dataIndex = startIndex + i;
      if (dataIndex < data.length) {
        macdData.set(data[dataIndex].time as Time, {
          dif: dif[i],
          dea: dea[i],
          macd: (dif[i] - dea[i]) * 2
        });
      }
    }

    return macdData;
  }, []);

  /**
   * 计算KDJ指标
   */
  const calculateKDJ = useCallback((data: KlineData[]): Map<Time, { k: number; d: number; j: number }> => {
    const kdjData = new Map<Time, { k: number; d: number; j: number }>();
    const n = 9;

    let prevK = 50;
    let prevD = 50;

    for (let i = n - 1; i < data.length; i++) {
      let high = data[i].high;
      let low = data[i].low;

      for (let j = 1; j < n; j++) {
        high = Math.max(high, data[i - j].high);
        low = Math.min(low, data[i - j].low);
      }

      const rsv = ((data[i].close - low) / (high - low)) * 100;
      const k = (2 / 3) * prevK + (1 / 3) * rsv;
      const d = (2 / 3) * prevD + (1 / 3) * k;
      const j = 3 * k - 2 * d;

      kdjData.set(data[i].time as Time, { k, d, j });

      prevK = k;
      prevD = d;
    }

    return kdjData;
  }, []);

  /**
   * 计算RSI指标
   */
  const calculateRSI = useCallback((data: KlineData[]): Map<Time, { rsi6: number; rsi12: number; rsi24: number }> => {
    const rsiData = new Map<Time, { rsi6: number; rsi12: number; rsi24: number }>();

    const calculateRSIValue = (prices: number[], period: number) => {
      const rsiValues: number[] = [];
      let gains = 0;
      let losses = 0;

      // 计算初始平均涨跌幅
      for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
          gains += change;
        } else {
          losses -= change;
        }
      }

      let avgGain = gains / period;
      let avgLoss = losses / period;

      // 计算RSI
      for (let i = period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];

        if (change > 0) {
          avgGain = (avgGain * (period - 1) + change) / period;
          avgLoss = (avgLoss * (period - 1)) / period;
        } else {
          avgGain = (avgGain * (period - 1)) / period;
          avgLoss = (avgLoss * (period - 1) - change) / period;
        }

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        rsiValues.push(rsi);
      }

      return rsiValues;
    };

    const closes = data.map(d => d.close);
    const rsi6 = calculateRSIValue(closes, 6);
    const rsi12 = calculateRSIValue(closes, 12);
    const rsi24 = calculateRSIValue(closes, 24);

    // 填充数据
    for (let i = 0; i < rsi6.length; i++) {
      const dataIndex = i + 6;
      if (dataIndex < data.length) {
        const existing = rsiData.get(data[dataIndex].time as Time) || { rsi6: 0, rsi12: 0, rsi24: 0 };
        rsiData.set(data[dataIndex].time as Time, { ...existing, rsi6: rsi6[i] });
      }
    }

    for (let i = 0; i < rsi12.length; i++) {
      const dataIndex = i + 12;
      if (dataIndex < data.length) {
        const existing = rsiData.get(data[dataIndex].time as Time) || { rsi6: 0, rsi12: 0, rsi24: 0 };
        rsiData.set(data[dataIndex].time as Time, { ...existing, rsi12: rsi12[i] });
      }
    }

    for (let i = 0; i < rsi24.length; i++) {
      const dataIndex = i + 24;
      if (dataIndex < data.length) {
        const existing = rsiData.get(data[dataIndex].time as Time) || { rsi6: 0, rsi12: 0, rsi24: 0 };
        rsiData.set(data[dataIndex].time as Time, { ...existing, rsi24: rsi24[i] });
      }
    }

    return rsiData;
  }, []);

  /**
   * 计算CCI指标
   */
  const calculateCCI = useCallback((data: KlineData[]): Map<Time, number> => {
    const cciData = new Map<Time, number>();
    const n = 14;

    for (let i = n - 1; i < data.length; i++) {
      // 计算典型价格
      const tpValues: number[] = [];
      for (let j = 0; j < n; j++) {
        const tp = (data[i - j].high + data[i - j].low + data[i - j].close) / 3;
        tpValues.push(tp);
      }

      // 计算MA
      const ma = tpValues.reduce((sum, val) => sum + val, 0) / n;

      // 计算平均绝对偏差
      const md = tpValues.reduce((sum, val) => sum + Math.abs(val - ma), 0) / n;

      // 计算CCI
      const cci = (data[i].high + data[i].low + data[i].close) / 3 - ma;
      const cciValue = md !== 0 ? cci / (0.015 * md) : 0;

      cciData.set(data[i].time as Time, cciValue);
    }

    return cciData;
  }, []);

  /**
   * 计算OBV指标
   */
  const calculateOBV = useCallback((data: KlineData[]): Map<Time, number> => {
    const obvData = new Map<Time, number>();
    let obv = 0;

    for (let i = 0; i < data.length; i++) {
      if (i > 0) {
        if (data[i].close > data[i - 1].close) {
          obv += data[i].volume;
        } else if (data[i].close < data[i - 1].close) {
          obv -= data[i].volume;
        }
        // 如果收盘价相等，OBV不变
      } else {
        obv = data[i].volume;
      }

      obvData.set(data[i].time as Time, obv);
    }

    return obvData;
  }, []);

  /**
   * 加载K线数据
   */
  const loadKlines = useCallback(async () => {
    if (!code) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.getStockKlines(code, 'day', 500);

      if (response.success && response.data) {
        // lightweight-charts 5.0+ 的 Time 类型使用秒级时间戳
        // 后端返回的是毫秒，需要转换为秒
        const rawKlines = response.data.klines;
        console.log('[StockDetailTest] 原始klines数据:', rawKlines.slice(0, 2));
        console.log('[StockDetailTest] rawKlines[0].time:', rawKlines[0]?.time);

        // 后端返回毫秒，lightweight-charts 5.0+ 需要秒
        const convertedKlines = rawKlines.map(k => ({
          ...k,
          time: Math.floor(k.time / 1000)  // 毫秒转秒
        }));

        console.log('[StockDetailTest] 转换后klines数据(秒):', convertedKlines.slice(0, 2));
        setKlines(convertedKlines);
        klinesRef.current = convertedKlines; // 同步 ref
        setStockInfo({
          code: response.data.code,
          name: response.data.name
        });
      } else {
        setError('加载K线数据失败');
      }
    } catch (err: any) {
      setError(err.message || '加载K线数据失败');
    } finally {
      setLoading(false);
    }
  }, [code]);

  /**
   * 初始化图表
   */
  const initChart = useCallback(() => {
    if (!chartContainerRef.current) {
      console.log('[StockDetailTest] chartContainerRef not ready');
      return;
    }

    // 清理旧图表
    if (chartRef.current) {
      console.log('[StockDetailTest] removing old chart');
      chartRef.current.remove();
      chartRef.current = null;
    }

    // 重置所有引用
    mainSeriesRef.current = null;
    maSeriesRef.current = [];
    bollSeriesRef.current = [];
    volumeSeriesRef.current = null;
    subChartSeriesRef.current.clear();

    console.log('[StockDetailTest] creating new chart');

    // 创建新图表
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: '#1a1a2e' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2a2a3e' },
        horzLines: { color: '#2a2a3e' },
      },
      crosshair: {
        mode: 1 as const,
        vertLine: {
          color: '#758696',
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: '#1a1a2e',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: '#1a1a2e',
        },
      },
      rightPriceScale: {
        borderColor: '#3a3a4e',
        // 隐藏价格轴上的系列标题和最新值
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#3a3a4e',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 订阅十字光标移动事件，更新数值显示
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        // 清空数值显示
        updateIndicatorValues(null);
        return;
      }

      // 更新数值显示
      updateIndicatorValues(param);
    });
    console.log('[StockDetailTest] chart created');

    // 获取主图pane（默认存在）
    const panes = chart.panes();
    console.log('[StockDetailTest] panes:', panes.length);
    const mainPane = panes[0];

    // 设置主图的stretchFactor，让主图占更大比例
    mainPane.setStretchFactor(2); // 主图是副图的2倍高

    // 添加K线系列
    const candlestickSeries = mainPane.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      lastValueVisible: false, // 隐藏价格轴上的最新值标签
      priceLineVisible: false, // 隐藏价格线
    });

    mainSeriesRef.current = candlestickSeries;
    console.log('[StockDetailTest] candlestick series added');

    // 添加MA均线
    const maColors = ['#f5ce56', '#00bcd4', '#ff9800', '#9c27b0'];
    const maPeriods = [5, 10, 20, 60];

    maPeriods.forEach((period) => {
      const maSeries = mainPane.addSeries(LineSeries, {
        color: maColors[maPeriods.indexOf(period)],
        lineWidth: 1,
        lastValueVisible: false, // 隐藏价格轴上的最新值标签
        priceLineVisible: false, // 隐藏价格线
      });
      maSeriesRef.current.push(maSeries);
    });
    console.log('[StockDetailTest] MA series added');

    // 添加BOLL布林带（上轨、中轨、下轨）
    const bollColors = {
      upper: '#ff9800',  // 上轨颜色
      middle: '#00bcd4', // 中轨颜色
      lower: '#ff9800',  // 下轨颜色
    };

    const bollUpperSeries = mainPane.addSeries(LineSeries, {
      color: bollColors.upper,
      lineWidth: 1,
      lineStyle: 2, // 虚线
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const bollMiddleSeries = mainPane.addSeries(LineSeries, {
      color: bollColors.middle,
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const bollLowerSeries = mainPane.addSeries(LineSeries, {
      color: bollColors.lower,
      lineWidth: 1,
      lineStyle: 2, // 虚线
      lastValueVisible: false,
      priceLineVisible: false,
    });

    bollSeriesRef.current = [bollUpperSeries, bollMiddleSeries, bollLowerSeries];
    console.log('[StockDetailTest] BOLL series added');

    // 添加副图
    updateSubCharts();

    // 响应式调整
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
  }, []); // 移除subCharts依赖

  /**
   * 更新主图指标显示（根据 mainChartIndicator 状态）
   */
  useEffect(() => {
    console.log('[StockDetailTest] main chart indicator effect triggered, mainChartIndicator:', mainChartIndicator);
    console.log('[StockDetailTest] chartRef.current:', !!chartRef.current, 'klines.length:', klines.length);
    console.log('[StockDetailTest] maSeriesRef.current.length:', maSeriesRef.current.length, 'bollSeriesRef.current.length:', bollSeriesRef.current.length);

    if (!chartRef.current || klines.length === 0) {
      console.log('[StockDetailTest] main chart indicator effect skipped - no chart or no data');
      return;
    }

    console.log('[StockDetailTest] updating main chart indicator:', mainChartIndicator);

    // 更新MA数据
    const maPeriods = [5, 10, 20, 60];
    if (mainChartIndicator === 'ma') {
      maPeriods.forEach((period, index) => {
        if (maSeriesRef.current[index]) {
          const maData = calculateMA(klines, period);
          const lineData: LineData<Time>[] = [];
          maData.forEach((value, time) => {
            lineData.push({ time, value });
          });
          console.log('[StockDetailTest] setting MA', period, 'data with', lineData.length, 'points');
          maSeriesRef.current[index].setData(lineData);
        }
      });
    } else {
      // 隐藏MA
      maSeriesRef.current.forEach(series => series.setData([]));
    }

    // 更新BOLL数据
    if (mainChartIndicator === 'boll') {
      const bollData = calculateBOLL(klines, 20, 2);
      const upperData: LineData<Time>[] = [];
      const middleData: LineData<Time>[] = [];
      const lowerData: LineData<Time>[] = [];

      bollData.forEach((value, time) => {
        upperData.push({ time, value: value.upper });
        middleData.push({ time, value: value.middle });
        lowerData.push({ time, value: value.lower });
      });

      console.log('[StockDetailTest] setting BOLL data with', upperData.length, 'points');
      if (bollSeriesRef.current[0]) bollSeriesRef.current[0].setData(upperData);
      if (bollSeriesRef.current[1]) bollSeriesRef.current[1].setData(middleData);
      if (bollSeriesRef.current[2]) bollSeriesRef.current[2].setData(lowerData);
    } else {
      // 隐藏BOLL
      bollSeriesRef.current.forEach(series => series.setData([]));
    }
  }, [mainChartIndicator, klines, calculateMA, calculateBOLL]);

  /**
   * 更新图表数据
   */
  const updateChartData = useCallback(() => {
    if (!mainSeriesRef.current || klines.length === 0) return;

    // 更新K线数据（时间戳已在数据源处转换为毫秒）
    const candlestickData: CandlestickData<Time>[] = klines.map(k => ({
      time: k.time as Time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

    mainSeriesRef.current.setData(candlestickData);

    // 更新成交量数据（转换为万手单位）
    if (volumeSeriesRef.current) {
      const volumeData: HistogramData<Time>[] = klines.map(k => ({
        time: k.time as Time,
        value: k.volume / 10000, // 转换为万手单位
        color: k.close >= k.open ? '#26a69a80' : '#ef535080',
      }));

      volumeSeriesRef.current.setData(volumeData);
    }

    // 更新副图数据
    updateSubChartData();
  }, [klines]);

  /**
   * 更新副图
   */
  const updateSubCharts = useCallback(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const panes = chart.panes();

    // 保留主图，删除其他副图
    for (let i = panes.length - 1; i > 0; i--) {
      chart.removePane(i);
    }

    // 清空副图系列引用
    subChartSeriesRef.current.clear();
    volumeSeriesRef.current = null;

    // 重新创建副图
    subCharts.forEach((config) => {
      const newPane = chart.addPane();
      // 副图使用更大的stretchFactor，让副图更高，曲线上方有空间显示标签
      newPane.setStretchFactor(1.5);

      // 根据指标类型添加系列
      switch (config.indicator) {
        case 'VOL':
          addVolumeSeries(newPane, config.id);
          break;
        case 'MACD':
          addMACDSeries(newPane, config.id);
          break;
        case 'KDJ':
          addKDJSeries(newPane, config.id);
          break;
        case 'RSI':
          addRSISeries(newPane, config.id);
          break;
        case 'CCI':
          addCCISeries(newPane, config.id);
          break;
        case 'OBV':
          addOBVSeries(newPane, config.id);
          break;
      }
    });

    // 更新副图数据
    updateSubChartData();
  }, [subCharts]);

  /**
   * 添加成交量系列
   */
  const addVolumeSeries = (pane: any, id: string) => {
    const volumeSeries = pane.addSeries(HistogramSeries, {
      color: '#26a69a80',
      lastValueVisible: false, // 隐藏价格轴上的最新值标签
      priceLineVisible: false, // 隐藏价格线
    });

    volumeSeriesRef.current = volumeSeries;

    const series = [volumeSeries];
    subChartSeriesRef.current.set(id, series);
  };

  /**
   * 添加MACD系列
   */
  const addMACDSeries = (pane: any, id: string) => {
    const difSeries = pane.addSeries(LineSeries, {
      color: '#ffffff',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const deaSeries = pane.addSeries(LineSeries, {
      color: '#ffeb3b',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const macdSeries = pane.addSeries(HistogramSeries, {
      color: '#26a69a',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const series = [difSeries, deaSeries, macdSeries];
    subChartSeriesRef.current.set(id, series);
  };

  /**
   * 添加KDJ系列
   */
  const addKDJSeries = (pane: any, id: string) => {
    const kSeries = pane.addSeries(LineSeries, {
      color: '#ffffff',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const dSeries = pane.addSeries(LineSeries, {
      color: '#ffeb3b',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const jSeries = pane.addSeries(LineSeries, {
      color: '#ff5722',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const series = [kSeries, dSeries, jSeries];
    subChartSeriesRef.current.set(id, series);
  };

  /**
   * 添加RSI系列
   */
  const addRSISeries = (pane: any, id: string) => {
    const rsi6Series = pane.addSeries(LineSeries, {
      color: '#ffffff',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const rsi12Series = pane.addSeries(LineSeries, {
      color: '#00bcd4',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const rsi24Series = pane.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const series = [rsi6Series, rsi12Series, rsi24Series];
    subChartSeriesRef.current.set(id, series);
  };

  /**
   * 添加CCI系列
   */
  const addCCISeries = (pane: any, id: string) => {
    const cciSeries = pane.addSeries(LineSeries, {
      color: '#ffffff',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const series = [cciSeries];
    subChartSeriesRef.current.set(id, series);
  };

  /**
   * 添加OBV系列
   */
  const addOBVSeries = (pane: any, id: string) => {
    const obvSeries = pane.addSeries(LineSeries, {
      color: '#26a69a',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const series = [obvSeries];
    subChartSeriesRef.current.set(id, series);
  };

  /**
   * 更新副图数据
   */
  const updateSubChartData = useCallback(() => {
    if (klines.length === 0) return;

    // 计算指标数据
    const macdData = calculateMACD(klines);
    const kdjData = calculateKDJ(klines);
    const rsiData = calculateRSI(klines);
    const obvData = calculateOBV(klines);

    subCharts.forEach(config => {
      const series = subChartSeriesRef.current.get(config.id);
      if (!series) return;

      switch (config.indicator) {
        case 'MACD':
          updateMACDData(series, macdData);
          break;
        case 'KDJ':
          updateKDJData(series, kdjData);
          break;
        case 'RSI':
          updateRSIData(series, rsiData);
          break;
        case 'OBV':
          updateOBVData(series, obvData);
          break;
      }
    });
  }, [klines, subCharts, calculateMACD, calculateKDJ, calculateRSI, calculateOBV]);

  /**
   * 更新MACD数据
   */
  const updateMACDData = (series: ISeriesApi<any>[], macdData: Map<Time, { dif: number; dea: number; macd: number }>) => {
    const difData: LineData<Time>[] = [];
    const deaData: LineData<Time>[] = [];
    const macdHistogram: HistogramData<Time>[] = [];

    macdData.forEach((value, time) => {
      difData.push({ time, value: value.dif });
      deaData.push({ time, value: value.dea });
      macdHistogram.push({
        time,
        value: value.macd,
        color: value.macd >= 0 ? '#ef535080' : '#26a69a80',
      });
    });

    series[0].setData(difData);
    series[1].setData(deaData);
    series[2].setData(macdHistogram);
  };

  /**
   * 更新KDJ数据
   */
  const updateKDJData = (series: ISeriesApi<any>[], kdjData: Map<Time, { k: number; d: number; j: number }>) => {
    const kData: LineData<Time>[] = [];
    const dData: LineData<Time>[] = [];
    const jData: LineData<Time>[] = [];

    kdjData.forEach((value, time) => {
      kData.push({ time, value: value.k });
      dData.push({ time, value: value.d });
      jData.push({ time, value: value.j });
    });

    series[0].setData(kData);
    series[1].setData(dData);
    series[2].setData(jData);
  };

  /**
   * 更新RSI数据
   */
  const updateRSIData = (series: ISeriesApi<any>[], rsiData: Map<Time, { rsi6: number; rsi12: number; rsi24: number }>) => {
    const rsi6Data: LineData<Time>[] = [];
    const rsi12Data: LineData<Time>[] = [];
    const rsi24Data: LineData<Time>[] = [];

    rsiData.forEach((value, time) => {
      rsi6Data.push({ time, value: value.rsi6 });
      rsi12Data.push({ time, value: value.rsi12 });
      rsi24Data.push({ time, value: value.rsi24 });
    });

    series[0].setData(rsi6Data);
    series[1].setData(rsi12Data);
    series[2].setData(rsi24Data);
  };

  /**
   * 更新OBV数据（转换为万手单位）
   */
  const updateOBVData = (series: ISeriesApi<any>[], obvData: Map<Time, number>) => {
    const obvLineData: LineData<Time>[] = [];

    obvData.forEach((value, time) => {
      obvLineData.push({ time, value: value / 10000 }); // 转换为万手单位
    });

    series[0].setData(obvLineData);
  };

  /**
   * 更新指标数值显示（使用指定的时间索引）
   */
  const updateIndicatorValuesByIndex = useCallback((timeIndex: number) => {
    const currentKlines = klinesRef.current;
    if (timeIndex < 0 || timeIndex >= currentKlines.length) return;

    const values = new Map<string, string>();
    const kline = currentKlines[timeIndex];
    const time = kline.time;

    // 主图数值（根据当前指标类型）
    if (mainChartIndicator === 'ma') {
      const maPeriods = [5, 10, 20, 60];
      const maColors = ['#f5ce56', '#00bcd4', '#ff9800', '#9c27b0'];
      const maValues: Array<{ period: number; value: number; color: string }> = [];
      maPeriods.forEach((period) => {
        const maData = calculateMA(currentKlines, period);
        const value = maData.get(time as Time);
        if (value !== undefined) {
          maValues.push({
            period,
            value,
            color: maColors[maPeriods.indexOf(period)]
          });
        }
      });
      if (maValues.length > 0) {
        values.set('main', JSON.stringify(maValues));
      }
    } else if (mainChartIndicator === 'boll') {
      const bollData = calculateBOLL(currentKlines, 20, 2);
      const data = bollData.get(time as Time);
      if (data) {
        values.set('main', JSON.stringify({
          type: 'boll',
          upper: data.upper,
          middle: data.middle,
          lower: data.lower
        }));
      }
    } else {
      // 无指标状态
      values.set('main', '');
    }

    // 副图数值
    subCharts.forEach((config) => {
      const seriesList = subChartSeriesRef.current.get(config.id);
      if (!seriesList) return;

      switch (config.indicator) {
        case 'VOL': {
          const vol = kline.volume / 10000;
          values.set(config.id, JSON.stringify({
            type: 'vol',
            value: vol || 0,
            color: kline.close >= kline.open ? '#26a69a' : '#ef5350'
          }));
          break;
        }
        case 'MACD': {
          const macdData = calculateMACD(currentKlines);
          const data = macdData.get(time as Time);
          if (data) {
            values.set(config.id, JSON.stringify({
              type: 'macd',
              dif: data.dif,
              dea: data.dea,
              macd: data.macd,
              difColor: '#ffffff',
              deaColor: '#ffeb3b',
              macdColor: data.macd >= 0 ? '#26a69a' : '#ef5350'
            }));
          }
          break;
        }
        case 'KDJ': {
          const kdjData = calculateKDJ(currentKlines);
          const data = kdjData.get(time as Time);
          if (data) {
            values.set(config.id, JSON.stringify({
              type: 'kdj',
              k: data.k,
              d: data.d,
              j: data.j,
              kColor: '#ffffff',
              dColor: '#ffeb3b',
              jColor: '#ff5722'
            }));
          }
          break;
        }
        case 'RSI': {
          const rsiData = calculateRSI(currentKlines);
          const data = rsiData.get(time as Time);
          if (data) {
            values.set(config.id, JSON.stringify({
              type: 'rsi',
              rsi6: data.rsi6,
              rsi12: data.rsi12,
              rsi24: data.rsi24,
              rsi6Color: '#ffffff',
              rsi12Color: '#00bcd4',
              rsi24Color: '#ff9800'
            }));
          }
          break;
        }
        case 'CCI': {
          const cciData = calculateCCI(currentKlines);
          const data = cciData.get(time as Time);
          if (data) {
            values.set(config.id, JSON.stringify({
              type: 'cci',
              value: data,
              color: '#ffffff'
            }));
          }
          break;
        }
        case 'OBV': {
          const obvData = calculateOBV(currentKlines);
          const data = obvData.get(time as Time);
          if (data !== undefined) {
            values.set(config.id, JSON.stringify({
              type: 'obv',
              value: data / 10000,
              color: '#26a69a'
            }));
          }
          break;
        }
      }
    });

    setIndicatorValues(values);
  }, [mainChartIndicator, subCharts, calculateMA, calculateBOLL, calculateMACD, calculateKDJ, calculateRSI, calculateCCI, calculateOBV]);

  /**
   * 更新指标数值显示（crosshair 回调）
   */
  const updateIndicatorValues = useCallback((param: any) => {
    const currentKlines = klinesRef.current;
    if (!param || !param.time || !currentKlines.length) {
      // crosshair 离开时，显示最新值
      if (currentKlines.length > 0) {
        updateIndicatorValuesByIndex(currentKlines.length - 1);
      }
      return;
    }

    // 找到对应时间的数据索引
    // klines 中的 time 和 param.time 都是秒级时间戳，直接匹配
    let timeIndex = currentKlines.findIndex(k => k.time === param.time);

    // 如果找不到精确时间，尝试找最接近的（1天范围内）
    if (timeIndex < 0) {
      const closestIndex = currentKlines.findIndex(k => Math.abs(k.time - param.time) < 86400);
      if (closestIndex >= 0) {
        timeIndex = closestIndex;
      }
    }

    if (timeIndex < 0) {
      // 使用最后一个数据点
      timeIndex = currentKlines.length - 1;
    }

    updateIndicatorValuesByIndex(timeIndex);
  }, [updateIndicatorValuesByIndex]);

  /**
   * 添加副图
   */
  const addSubChart = useCallback((indicator: SubChartIndicator) => {
    if (subCharts.length >= 4) {
      message.warning('最多支持4个副图');
      return;
    }

    const newSubChart: SubChartConfig = {
      id: `${indicator.toLowerCase()}-${Date.now()}`,
      indicator,
      height: 100,
    };

    setSubCharts([...subCharts, newSubChart]);
  }, [subCharts]);

  /**
   * 获取指标显示名称（带单位）
   */
  const getIndicatorLabel = (indicator: SubChartIndicator): string => {
    switch (indicator) {
      case 'VOL': return '成交量(万手)';
      case 'MACD': return 'MACD';
      case 'KDJ': return 'KDJ';
      case 'RSI': return 'RSI(%)';
      case 'CCI': return 'CCI';
      case 'OBV': return 'OBV(万手)';
      default: return indicator;
    }
  };

  /**
   * 获取主图指标标签（默认显示）
   */
  const getMainChartLabel = (): string => {
    switch (mainChartIndicator) {
      case 'ma': return 'MA';
      case 'boll': return 'BOLL(20,2)';
      case 'none': return '主图';
    }
  };

  /**
   * 删除副图
   */
  const removeSubChart = useCallback((id: string) => {
    setSubCharts(subCharts.filter(chart => chart.id !== id));
  }, [subCharts]);

  /**
   * 主图点击处理：循环切换主图指标
   */
  const handleMainChartClick = useCallback(() => {
    const next: { [key in typeof mainChartIndicator]: typeof mainChartIndicator } = {
      'ma': 'boll',
      'boll': 'none',
      'none': 'ma',
    };
    setMainChartIndicator(next[mainChartIndicator]);
  }, [mainChartIndicator]);

  /**
   * 打开副图指标切换弹窗
   */
  const handleOpenSwitcher = useCallback((subChartId: string) => {
    setSwitcherSubChartId(subChartId);
    setSwitcherVisible(true);
  }, []);

  /**
   * 副图指标切换处理
   */
  const handleSubChartIndicatorChange = useCallback((indicatorId: SubChartIndicatorId) => {
    if (!switcherSubChartId) return;

    // 映射指标类型
    const indicatorMap: Record<string, SubChartIndicator> = {
      'VOL': 'VOL',
      'MACD': 'MACD',
      'KDJ': 'KDJ',
      'RSI': 'RSI',
      'CCI': 'CCI',
      'OBV': 'OBV',
      'W%R': 'KDJ', // 威廉指标暂不支持，映射到KDJ
      'BIAS': 'KDJ', // 乖离率暂不支持，映射到KDJ
    };

    const newIndicator = indicatorMap[indicatorId] || 'VOL';
    setSubCharts(subCharts.map(chart =>
      chart.id === switcherSubChartId
        ? { ...chart, indicator: newIndicator }
        : chart
    ));
    setSwitcherVisible(false);
  }, [switcherSubChartId, subCharts]);

  // 初始化效果
  useEffect(() => {
    console.log('[StockDetailTest] code changed, loading klines for:', code);
    loadKlines();
  }, [code]); // 只依赖code

  // 图表初始化效果 - 只在klines第一次有数据时初始化一次
  useEffect(() => {
    if (klines.length === 0) return;
    if (chartRef.current) return; // 图表已创建，不再重复创建

    console.log('[StockDetailTest] klines loaded, initializing chart, data count:', klines.length);
    const cleanup = initChart();

    // 初始化后设置数据
    setTimeout(() => {
      if (mainSeriesRef.current) {
        console.log('[StockDetailTest] setting chart data');
        updateChartData();
      }
    }, 100);

    return () => {
      if (cleanup) cleanup();
    };
  }, [klines.length > 0 ? 1 : 0]); // 只在klines从0变为有数据时触发

  // 数据更新效果
  useEffect(() => {
    if (klines.length > 0 && mainSeriesRef.current && chartRef.current) {
      console.log('[StockDetailTest] updating chart data');
      updateChartData();
      // 更新后显示最新值
      updateIndicatorValuesByIndex(klines.length - 1);
    }
  }, [klines, updateChartData, updateIndicatorValuesByIndex]);

  // 主图指标变化时更新显示
  useEffect(() => {
    if (klinesRef.current.length > 0) {
      updateIndicatorValuesByIndex(klinesRef.current.length - 1);
    }
  }, [mainChartIndicator, updateIndicatorValuesByIndex]);

  // 副图更新效果
  useEffect(() => {
    if (chartRef.current && klines.length > 0) {
      console.log('[StockDetailTest] updating subcharts, count:', subCharts.length);
      updateSubCharts();
    }
  }, [subCharts]);

  if (loading) {
    return (
      <div className="stock-detail-test-loading">
        <Spin size="large" />
        <Text style={{ marginLeft: 16 }}>加载中...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-detail-test-error">
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

  return (
    <div className="stock-detail-test-container">
      <Card>
        {/* 头部信息 */}
        <Row align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col>
            <Space size="middle">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/stocks/search')}
                size="small"
              />
              {stockInfo && (
                <>
                  <span className="stock-name">{stockInfo.name}</span>
                  <span className="stock-code">{stockInfo.code}</span>
                </>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadKlines}
                size="small"
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider />

        {/* 图表容器 */}
        <div
          className="chart-wrapper"
          style={{ position: 'relative' }}
        >
          {/* 主图数值显示 */}
          {(() => {
            const mainValue = indicatorValues.get('main');

            let content: React.ReactNode;

            if (!mainValue || mainValue === '') {
              // 默认显示
              content = <span style={{ color: '#d1d5db' }}>{getMainChartLabel()}</span>;
            } else {
              try {
                const data = JSON.parse(mainValue);
                if (Array.isArray(data)) {
                  // MA 数据
                  content = data.map((item: any) => (
                    <span key={item.period} style={{ color: '#d1d5db' }}>
                      MA{item.period}:<span style={{ color: item.color }}>{item.value.toFixed(2)}</span>
                    </span>
                  ));
                } else if (data.type === 'boll') {
                  // BOLL 数据
                  content = (
                    <span style={{ color: '#d1d5db' }}>
                      BOLL(20,2) 上:<span style={{ color: '#ff9800' }}>{data.upper.toFixed(2)}</span>
                      中:<span style={{ color: '#00bcd4' }}>{data.middle.toFixed(2)}</span>
                      下:<span style={{ color: '#ff9800' }}>{data.lower.toFixed(2)}</span>
                    </span>
                  );
                } else {
                  content = <span style={{ color: '#d1d5db' }}>{mainValue}</span>;
                }
              } catch {
                content = <span style={{ color: '#d1d5db' }}>{mainValue}</span>;
              }
            }

            return (
              <div
                className="chart-indicator-label"
                onClick={handleMainChartClick}
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  fontSize: 11,
                  fontWeight: 500,
                  background: 'rgba(26, 26, 46, 0.9)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  zIndex: 1000,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #3a3a4e',
                }}
              >
                {content}
              </div>
            );
          })()}
          <div ref={chartContainerRef} className="chart-container" />

          {/* 副图指标标签 */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {subCharts.map((config, index) => {
              // 计算副图位置（主图占2份，每个副图占1.5份）
              const totalParts = 2 + subCharts.length * 1.5;
              const mainHeight = 2 / totalParts;
              const subHeight = 1.5 / totalParts;

              // 第i个副图的top位置
              let topPos = mainHeight;
              for (let j = 0; j < index; j++) {
                topPos += subHeight;
              }

              return (
                <div
                  key={config.id}
                  className="chart-indicator-label"
                  onClick={() => handleOpenSwitcher(config.id)}
                  style={{
                    position: 'absolute',
                    top: `${(topPos + 0.008) * 100}%`, // 放在副图顶部，固定位置
                    left: 8,
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#d1d5db',
                    background: 'rgba(26, 26, 46, 0.8)',
                    padding: '2px 6px',
                    borderRadius: 3,
                    zIndex: 100,
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{getIndicatorLabel(config.indicator)}</span>
                  {indicatorValues.get(config.id) && (() => {
                    const value = indicatorValues.get(config.id);
                    if (!value) return null;
                    try {
                      const data = JSON.parse(value);
                      if (data.type === 'vol') {
                        return <span style={{ fontWeight: 400, color: data.color }}>{data.value.toFixed(0)}万手</span>;
                      } else if (data.type === 'macd') {
                        return (
                          <span style={{ fontWeight: 400 }}>
                            <span style={{ color: data.difColor }}>DIF:{data.dif.toFixed(2)}</span>
                            <span style={{ color: data.deaColor }}> DEA:{data.dea.toFixed(2)}</span>
                            <span style={{ color: data.macdColor }}> MACD:{data.macd.toFixed(2)}</span>
                          </span>
                        );
                      } else if (data.type === 'kdj') {
                        return (
                          <span style={{ fontWeight: 400 }}>
                            <span style={{ color: data.kColor }}>K:{data.k.toFixed(1)}</span>
                            <span style={{ color: data.dColor }}> D:{data.d.toFixed(1)}</span>
                            <span style={{ color: data.jColor }}> J:{data.j.toFixed(1)}</span>
                          </span>
                        );
                      } else if (data.type === 'rsi') {
                        return (
                          <span style={{ fontWeight: 400 }}>
                            <span style={{ color: data.rsi6Color }}>RSI6:{data.rsi6?.toFixed(1) || '-'}</span>
                            <span style={{ color: data.rsi12Color }}> RSI12:{data.rsi12?.toFixed(1) || '-'}</span>
                            <span style={{ color: data.rsi24Color }}> RSI24:{data.rsi24?.toFixed(1) || '-'}</span>
                          </span>
                        );
                      } else if (data.type === 'cci') {
                        return <span style={{ fontWeight: 400, color: data.color }}>CCI:{data.value.toFixed(1)}</span>;
                      } else if (data.type === 'obv') {
                        return <span style={{ fontWeight: 400, color: data.color }}>{data.value.toFixed(0)}万手</span>;
                      }
                      return <span style={{ fontWeight: 400 }}>{value}</span>;
                    } catch {
                      return <span style={{ fontWeight: 400 }}>{value}</span>;
                    }
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* 副图控制 */}
        <div className="subchart-controls">
          <Text strong>副图控制</Text>
          <Space wrap style={{ marginTop: 8 }}>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => addSubChart('VOL')}
              disabled={subCharts.some(c => c.indicator === 'VOL')}
            >
              成交量(万手)
            </Button>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => addSubChart('MACD')}
              disabled={subCharts.some(c => c.indicator === 'MACD')}
            >
              MACD
            </Button>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => addSubChart('KDJ')}
              disabled={subCharts.some(c => c.indicator === 'KDJ')}
            >
              KDJ
            </Button>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => addSubChart('RSI')}
              disabled={subCharts.some(c => c.indicator === 'RSI')}
            >
              RSI(%)
            </Button>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => addSubChart('CCI')}
              disabled={subCharts.some(c => c.indicator === 'CCI')}
            >
              CCI
            </Button>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={() => addSubChart('OBV')}
              disabled={subCharts.some(c => c.indicator === 'OBV')}
            >
              OBV(万手)
            </Button>
          </Space>

          <div style={{ marginTop: 16 }}>
            <Text strong>当前副图</Text>
            <Space wrap style={{ marginTop: 8 }}>
              {subCharts.map(chart => (
                <Button
                  key={chart.id}
                  icon={<MinusOutlined />}
                  size="small"
                  danger
                  onClick={() => removeSubChart(chart.id)}
                >
                  {getIndicatorLabel(chart.indicator)}
                </Button>
              ))}
            </Space>
          </div>
        </div>
      </Card>

      {/* 副图指标切换弹窗 */}
      <SubChartIndicatorSwitcher
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        currentIndicatorId={subCharts.find(c => c.id === switcherSubChartId)?.indicator || 'VOL'}
        onIndicatorChange={handleSubChartIndicatorChange}
      />
    </div>
  );
};

export default StockDetailTest;
