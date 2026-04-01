/**
 * 动态专业K线图表组件
 * Dynamic Professional Stock Chart Component
 *
 * 支持功能：
 * - 动态主图指标（MA、EMA、BOLL、SAR等）
 * - 动态副图数量（1-4个）
 * - 副图指标切换
 * - 副图左上角显示指标名称+参数
 * - 副图右上方显示实时数值
 * - K线样式切换（实心、空心、美式）
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Spin, Space, Button, Segmented } from 'antd';
import { ReloadOutlined, LineChartOutlined, SettingOutlined } from '@ant-design/icons';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode, LineStyle } from 'lightweight-charts';
import { getToken } from '@/utils/auth';
import { useChartConfig } from '@/hooks/useChartConfig';
import { SubChartIndicatorId } from '@/types/chart';
import ChartSettingsModal from './ChartSettingsModal';
import SubChartIndicatorSwitcher from './SubChartIndicatorSwitcher';

interface DynamicProfessionalStockChartProps {
  code: string;
}

/**
 * 动态专业K线图表组件
 */
const DynamicProfessionalStockChart: React.FC<DynamicProfessionalStockChartProps> = ({ code }) => {
  // 图表配置
  const { config, loading: configLoading, initialized: configInitialized, updateConfig, switchSubChartIndicator, resetConfig } = useChartConfig();

  // UI状态
  const [loading, setLoading] = useState(true); // 初始化加载状态
  const [dataLoading, setDataLoading] = useState(true); // 数据加载状态
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [switcherSubChartIndex, setSwitcherSubChartIndex] = useState(0);
  const [period, setPeriod] = useState<string>('day');

  // 图表实例refs
  const mainChartRef = useRef<IChartApi | null>(null);
  const subChartsRef = useRef<IChartApi[]>([]);

  // 图表容器refs
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const subChartContainerRefs = useRef<HTMLDivElement[]>([]);

  // Series refs（动态）
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const mainChartSeriesRefs = useRef<Map<string, ISeriesApi<'Line'> | ISeriesApi<'Candlestick'>>>(new Map());
  const subChartSeriesRefs = useRef<Map<number, Map<string, ISeriesApi<any>>>>(new Map());

  // 数据缓存
  const [rawKlines, setRawKlines] = useState<any[]>([]);
  const [rawIndicators, setRawIndicators] = useState<any>(null);
  const [cachedData, setCachedData] = useState<any>(null);

  // 当前鼠标位置的实时数据
  const [currentDataIndex, setCurrentDataIndex] = useState<number>(-1);

  // 副图创建计数（用于触发副图数据设置）
  const [, setSubChartsCreatedCount] = useState(0);

  // 周期选项
  const periodOptions = [
    { label: '日K', value: 'day' },
    { label: '周K', value: 'week' },
    { label: '月K', value: 'month' },
    { label: '年K', value: 'year' },
  ];

  /**
   * K线数据聚合
   */
  const aggregateKlines = useCallback((dailyKlines: any[], periodType: 'week' | 'month' | 'year'): any[] => {
    if (!dailyKlines.length) return dailyKlines;

    const grouped = new Map<string, any[]>();

    dailyKlines.forEach(kline => {
      const date = new Date(kline.time);
      let key: string;

      if (periodType === 'week') {
        const oneJan = new Date(date.getFullYear(), 0, 1);
        const weekNumber = Math.ceil((((date.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNumber}`;
      } else if (periodType === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(kline);
    });

    const result: any[] = [];
    grouped.forEach(klines => {
      if (klines.length === 0) return;

      result.push({
        time: klines[0].time,
        open: klines[0].open,
        high: Math.max(...klines.map(k => k.high)),
        low: Math.min(...klines.map(k => k.low)),
        close: klines[klines.length - 1].close,
        volume: klines.reduce((sum, k) => sum + k.volume, 0),
      });
    });

    return result;
  }, []);

  /**
   * 根据周期获取数据
   */
  const getDataByPeriod = useCallback((sourceKlines?: any[], sourceIndicators?: any) => {
    const klinesToUse = sourceKlines || rawKlines;
    const indicatorsToUse = sourceIndicators !== undefined ? sourceIndicators : rawIndicators;

    if (period === 'day') {
      return { klines: klinesToUse, indicators: indicatorsToUse };
    }

    const periodType = period as 'week' | 'month' | 'year';
    const aggregatedKlines = aggregateKlines(klinesToUse, periodType);

    return { klines: aggregatedKlines, indicators: indicatorsToUse };
  }, [period, rawKlines, rawIndicators, aggregateKlines]);

  /**
   * 获取K线颜色配置
   */
  const getCandleColors = useCallback(() => {
    switch (config.mainChart.candleStyle) {
      case 'hollow':
        return { upColor: '#ef5350', downColor: '#26a69a', borderUpColor: '#ef5350', borderDownColor: '#26a69a', wickUpColor: '#ef5350', wickDownColor: '#26a69a' };
      case 'american':
        return { upColor: 'transparent', downColor: '#26a69a', borderUpColor: '#ef5350', borderDownColor: '#26a69a', wickUpColor: '#ef5350', wickDownColor: '#26a69a' };
      default: // solid
        return { upColor: '#ef5350', downColor: '#26a69a', borderVisible: false, wickUpColor: '#ef5350', wickDownColor: '#26a69a' };
    }
  }, [config.mainChart.candleStyle]);

  /**
   * 获取指标显示名称（带参数）
   */
  const getIndicatorDisplayName = useCallback((indicatorId: string): string => {
    const params = config.indicatorParams;
    switch (indicatorId) {
      case 'VOL':
        return '成交量';
      case 'MACD':
        return `MACD(${params.MACD.fast},${params.MACD.slow},${params.MACD.signal})`;
      case 'KDJ':
        return `KDJ(${params.KDJ.k},${params.KDJ.d},${params.KDJ.j})`;
      case 'RSI':
        return `RSI(${params.RSI.period})`;
      case 'CCI':
        return `CCI(${params.CCI.period})`;
      case 'OBV':
        return 'OBV';
      case 'ATR':
        return `ATR(${params.ATR.period})`;
      case 'W%R':
        return '威廉指标';
      case 'BIAS':
        return '乖离率';
      default:
        return indicatorId;
    }
  }, [config.indicatorParams]);

  /**
   * 获取主图MA指标实时数值
   */
  const getMainChartMAValues = useCallback((dataIndex: number): string => {
    if (dataIndex < 0 || !rawIndicators || !config.mainChart.showMA) return '-';

    // 调整索引，确保不超出指标数组范围
    const getSafeIndex = (arr: any[] | undefined) => arr && arr.length > 0 ? Math.min(dataIndex, arr.length - 1) : -1;

    const values: string[] = [];
    config.mainChart.maPeriods.forEach((period: number) => {
      const maKey = `ma${period}`;
      const maData = rawIndicators[maKey];
      const safeIndex = getSafeIndex(maData);
      if (safeIndex >= 0 && maData && maData[safeIndex] != null) {
        values.push(`MA${period}:${maData[safeIndex].toFixed(2)}`);
      }
    });

    return values.length > 0 ? values.join(' ') : '-';
  }, [rawIndicators, config.mainChart.showMA, config.mainChart.maPeriods]);

  /**
   * 获取指标实时数值
   */
  const getIndicatorValues = useCallback((indicatorId: string, dataIndex: number): string => {
    if (dataIndex < 0 || !rawIndicators) {
      return '-';
    }

    // 调整索引，确保不超出指标数组范围
    // 指标数组通常比K线数组短（因为需要计算周期）
    const getSafeIndex = (arrLength: number) => Math.min(dataIndex, arrLength - 1);

    switch (indicatorId) {
      case 'MACD':
        const macdArray = rawIndicators.macd;
        if (!macdArray || macdArray.length === 0) return '-';
        const macdIndex = getSafeIndex(macdArray.length);
        const macd = macdArray[macdIndex];
        if (macd && typeof macd === 'object') {
          return `DIF:${macd.dif?.toFixed(2)} DEA:${macd.dea?.toFixed(2)} MACD:${macd.macd?.toFixed(2)}`;
        }
        return '-';
      case 'KDJ':
        const kdjArray = rawIndicators.kdj;
        if (!kdjArray || kdjArray.length === 0) return '-';
        const kdjIndex = getSafeIndex(kdjArray.length);
        const kdj = kdjArray[kdjIndex];
        if (kdj && typeof kdj === 'object') {
          return `K:${kdj.k?.toFixed(1)} D:${kdj.d?.toFixed(1)} J:${kdj.j?.toFixed(1)}`;
        }
        return '-';
      case 'RSI':
        const rsiArray = rawIndicators.rsi;
        if (!rsiArray || rsiArray.length === 0) return '-';
        const rsiIndex = getSafeIndex(rsiArray.length);
        const rsi = rsiArray[rsiIndex];
        return rsi ? `RSI:${rsi.toFixed(1)}` : '-';
      case 'VOL':
        const vol = rawKlines[dataIndex]?.volume;
        return vol ? `${(vol / 10000).toFixed(0)}万手` : '-';
      default:
        return '-';
    }
  }, [rawIndicators, rawKlines]);

  /**
   * 初始化主图
   */
  const initMainChart = useCallback(() => {
    if (!mainChartContainerRef.current || mainChartRef.current) return;

    const mainChart = createChart(mainChartContainerRef.current, {
      width: mainChartContainerRef.current.clientWidth || 800,  // 恢复100%宽度
      height: 300,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#666',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 0,
        minBarSpacing: 3,
      },
      // 十字光标配置
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#758696',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#758696',
        },
      },
      // 隐藏左侧价格轴
      leftPriceScale: {
        visible: false,
      },
      // 右侧价格轴配置
      rightPriceScale: {
        visible: true,
        borderVisible: true,
      },
      // 价格格式化 - 统一标签长度：固定10个字符宽度
      localization: {
        priceFormatter: (price: number) => {
          const formatted = price.toFixed(2);
          // 左边填充空格到10个字符，从右往左对齐
          return formatted.padStart(10, ' ');
        },
      },
    });

    // 添加K线
    const candleColors = getCandleColors();
    const candlestickSeries = mainChart.addSeries(CandlestickSeries, {
      ...candleColors,
      priceScaleId: '',  // 使用默认的右侧价格轴
      lastValueVisible: false,  // 隐藏价格轴上的最新值标签
      priceLineVisible: false,  // 隐藏价格线（虚线）
    });
    candlestickSeriesRef.current = candlestickSeries;

    mainChartRef.current = mainChart;
  }, [getCandleColors]);

  /**
   * 更新主图指标
   */
  const updateMainChartIndicators = useCallback((klines: any[], indicators: any) => {
    if (!mainChartRef.current || !candlestickSeriesRef.current) return;

    const mainChart = mainChartRef.current;

    // 清除旧的指标线
    mainChartSeriesRefs.current.forEach((series) => {
      mainChart.removeSeries(series);
    });
    mainChartSeriesRefs.current.clear();

    // 转换K线数据时间格式
    const candlestickData: CandlestickData<Time>[] = klines.map((k: any) => ({
      time: (k.time / 1000) as Time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

    // 添加MA均线
    if (config.mainChart.showMA && indicators?.ma5) {
      config.mainChart.maPeriods.forEach((period: number, idx: number) => {
        const maKey = `ma${period}`;
        if (indicators[maKey]) {
          const maData = indicators[maKey].map((v: number | null, i: number) => ({
            time: candlestickData[i]?.time,
            value: v,
          })).filter((d: any) => d.time && d.value != null);

          const color = config.indicatorParams.MA.colors[idx % config.indicatorParams.MA.colors.length];
          const maSeries = mainChart.addSeries(LineSeries, {
            color,
            lineWidth: 1,
            // 移除 priceScaleId，使用默认的右侧价格轴（与K线共用）
            lastValueVisible: false,  // 隐藏价格轴上的系列值标签
            priceLineVisible: false,  // 隐藏价格线
          });
          maSeries.setData(maData);
          mainChartSeriesRefs.current.set(`MA${period}`, maSeries);
        }
      });
    }

    // 添加布林带 - 已注释用于测试是否BOLL影响纵轴标尺显示
    // if (config.mainChart.showBOLL && indicators?.boll_upper) {
    //   // 上轨
    //   const upperData = indicators.boll_upper.map((v: number | null, i: number) => ({
    //     time: candlestickData[i]?.time,
    //     value: v,
    //   })).filter((d: any) => d.time && d.value != null);
    //   const upperSeries = mainChart.addSeries(LineSeries, {
    //     color: config.indicatorParams.BOLL.upperColor,
    //     lineWidth: 1,
    //   });
    //   upperSeries.setData(upperData);
    //   mainChartSeriesRefs.current.set('BOLL_UPPER', upperSeries);
    //   // 中轨
    //   const middleData = indicators.boll_middle.map((v: number | null, i: number) => ({
    //     time: candlestickData[i]?.time,
    //     value: v,
    //   })).filter((d: any) => d.time && d.value != null);
    //   const middleSeries = mainChart.addSeries(LineSeries, {
    //     color: config.indicatorParams.BOLL.middleColor,
    //     lineWidth: 1,
    //   });
    //   middleSeries.setData(middleData);
    //   mainChartSeriesRefs.current.set('BOLL_MIDDLE', middleSeries);
    //   // 下轨
    //   const lowerData = indicators.boll_lower.map((v: number | null, i: number) => ({
    //     time: candlestickData[i]?.time,
    //     value: v,
    //   })).filter((d: any) => d.time && d.value != null);
    //   const lowerSeries = mainChart.addSeries(LineSeries, {
    //     color: config.indicatorParams.BOLL.lowerColor,
    //     lineWidth: 1,
    //   });
    //   lowerSeries.setData(lowerData);
    //   mainChartSeriesRefs.current.set('BOLL_LOWER', lowerSeries);
    // }
  }, [config.mainChart, config.indicatorParams]);

  /**
   * 统一设置所有图表宽度
   */
  const syncAllChartsWidth = useCallback(() => {
    if (!mainChartContainerRef.current || !mainChartRef.current) return;

    // 恢复100%宽度
    const baseWidth = mainChartContainerRef.current.clientWidth || 800;
    mainChartRef.current.applyOptions({ width: baseWidth });
    subChartsRef.current.forEach(subChart => {
      if (subChart) {
        subChart.applyOptions({ width: baseWidth });
      }
    });
  }, []);

  /**
   * 初始化副图
   */
  const initSubCharts = useCallback(() => {
    // 清理旧的副图
    subChartsRef.current.forEach(chart => chart?.remove());
    subChartsRef.current = [];
    subChartSeriesRefs.current.clear();

    let createdCount = 0;

    // 创建新的副图
    for (let i = 0; i < config.subChart.count; i++) {
      const container = subChartContainerRefs.current[i];
      if (!container) {
        continue;
      }

      const subChart = createChart(container, {
        width: container.clientWidth,  // 恢复100%宽度
        height: 120,  // 副图高度
        layout: {
          background: { color: '#ffffff' },
          textColor: '#666',
        },
        grid: {
          vertLines: { color: '#f0f0f0' },
          horzLines: { color: '#f0f0f0' },  // 与主图一致
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 0,
          minBarSpacing: 3,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: '#758696',
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: '#758696',
          },
          horzLine: {
            color: '#758696',
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: '#758696',
          },
        },
        leftPriceScale: {
          visible: false,
        },
        rightPriceScale: {
          visible: true,
          borderVisible: true,
        },
        // 价格格式化 - 统一标签长度：固定10个字符宽度
        localization: {
          priceFormatter: (price: number) => {
            const formatted = price.toFixed(2);
            // 左边填充空格到10个字符，从右往左对齐
            return formatted.padStart(10, ' ');
          },
        },
      });

      subChartsRef.current[i] = subChart;
      subChartSeriesRefs.current.set(i, new Map());
      createdCount++;
    }


    // 设置副图时间轴同步
    setupTimeScaleSync();

    // 设置十字光标同步
    setupCrosshairSync();

    // 统一设置所有图表宽度，确保对齐
    // 使用更长的延迟确保所有图表都已完全初始化
    setTimeout(() => {
      syncAllChartsWidth();
    }, 50);

    // 触发副图数据设置
    if (createdCount > 0) {
      setSubChartsCreatedCount(prev => prev + createdCount);
    }
  }, [config.subChart.count, syncAllChartsWidth]);

  /**
   * 设置时间轴同步
   */
  const setupTimeScaleSync = useCallback(() => {
    if (!mainChartRef.current) return;

    const mainChart = mainChartRef.current;
    let isUpdating = false;

    const syncAllCharts = (sourceChart: IChartApi, range: { from: number; to: number }) => {
      if (isUpdating) return;
      isUpdating = true;

      if (sourceChart !== mainChart) {
        mainChart.timeScale().setVisibleLogicalRange(range);
      }

      subChartsRef.current.forEach((subChart) => {
        if (subChart && subChart !== sourceChart) {
          subChart.timeScale().setVisibleLogicalRange(range);
        }
      });

      setTimeout(() => {
        isUpdating = false;
      }, 0);
    };

    // 主图变化同步到所有副图
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) syncAllCharts(mainChart, range);
    });

    // 副图变化同步到其他图
    subChartsRef.current.forEach((subChart) => {
      if (subChart) {
        subChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
          if (range) syncAllCharts(subChart, range);
        });
      }
    });
  }, []);

  /**
   * 设置十字光标同步
   */
  const setupCrosshairSync = useCallback(() => {
    if (!mainChartRef.current) return;

    const mainChart = mainChartRef.current;

    // 订阅主图的十字光标移动事件 - 同步到副图
    mainChart.subscribeCrosshairMove(param => {
      if (!param.point || param.point.x < 0 || param.point.y < 0) {
        // 鼠标离开时，清除所有副图的crosshair
        subChartsRef.current.forEach((subChart) => {
          if (subChart) {
            subChart.clearCrosshairPosition();
          }
        });
        return;
      }

      // 同步到所有副图
      subChartsRef.current.forEach((subChart) => {
        if (subChart) {
          // 尝试在副图中找到第一个series并使用其数据
          const seriesMap = subChartSeriesRefs.current.get(subChartsRef.current.indexOf(subChart));
          if (seriesMap && seriesMap.size > 0) {
            const firstSeries = Array.from(seriesMap.values())[0];
            if (firstSeries && param.time) {
              // 从seriesData中查找该series的数据
              const data = param.seriesData.get(firstSeries as any);
              if (data && typeof data === 'object' && 'value' in data) {
                subChart.setCrosshairPosition((data as any).value, param.time, firstSeries as any);
              } else if (data && typeof data === 'object' && 'close' in data) {
                subChart.setCrosshairPosition((data as any).close, param.time, firstSeries as any);
              }
            }
          }
        }
      });
    });

    // 订阅每个副图的十字光标移动事件 - 同步到主图和其他副图
    subChartsRef.current.forEach((subChart, index) => {
      if (subChart) {
        subChart.subscribeCrosshairMove(param => {
          if (!param.point || param.point.x < 0 || param.point.y < 0) {
            // 鼠标离开时，清除主图和其他副图的crosshair
            mainChart.clearCrosshairPosition();
            subChartsRef.current.forEach((sc, i) => {
              if (sc && i !== index) {
                sc.clearCrosshairPosition();
              }
            });
            return;
          }

          // 同步到主图
          if (candlestickSeriesRef.current && param.time) {
            const data = param.seriesData.get(candlestickSeriesRef.current as any);
            if (data && typeof data === 'object' && 'close' in data) {
              mainChart.setCrosshairPosition((data as any).close, param.time, candlestickSeriesRef.current as any);
            }
          }

          // 同步到其他副图
          subChartsRef.current.forEach((sc, i) => {
            if (sc && i !== index) {
              const seriesMap = subChartSeriesRefs.current.get(i);
              if (seriesMap && seriesMap.size > 0) {
                const firstSeries = Array.from(seriesMap.values())[0];
                if (firstSeries && param.time) {
                  const data = param.seriesData.get(firstSeries as any);
                  if (data && typeof data === 'object' && 'value' in data) {
                    sc.setCrosshairPosition((data as any).value, param.time, firstSeries as any);
                  } else if (data && typeof data === 'object' && 'close' in data) {
                    sc.setCrosshairPosition((data as any).close, param.time, firstSeries as any);
                  }
                }
              }
            }
          });
        });
      }
    });
  }, []);

  /**
   * 设置数据到图表
   */
  const setDataToCharts = useCallback((klines: any[], indicators: any) => {
    if (!mainChartRef.current || !candlestickSeriesRef.current) return;
    if (!indicators) {
      return;
    }

    // 设置K线数据
    const candlestickData: CandlestickData<Time>[] = klines.map((k: any) => ({
      time: (k.time / 1000) as Time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));
    candlestickSeriesRef.current.setData(candlestickData);

    // 更新主图指标
    updateMainChartIndicators(klines, indicators);

    // 设置副图数据
    config.subChart.subCharts.slice(0, config.subChart.count).forEach((subChartConfig: { indicatorId: string; enabled: boolean }, index: number) => {
      if (!subChartConfig.enabled || !subChartConfig.indicatorId) return;

      const subChart = subChartsRef.current[index];
      if (!subChart) return;

      const indicatorId = subChartConfig.indicatorId;
      const seriesMap = subChartSeriesRefs.current.get(index);
      if (!seriesMap) return;

      // 清除旧的数据
      seriesMap.forEach(series => subChart.removeSeries(series));
      seriesMap.clear();

      // 根据指标类型添加数据
      switch (indicatorId) {
        case 'VOL':
          const volumeSeries = subChart.addSeries(HistogramSeries, {
            color: '#26a69a',
            lastValueVisible: false,
            priceLineVisible: false,
          });
          const volumeData = klines.map((k: any) => ({
            time: (k.time / 1000) as Time,
            value: k.volume,
            color: k.close >= k.open ? '#ef5350' : '#26a69a',
          }));
          volumeSeries.setData(volumeData);
          seriesMap.set('VOL', volumeSeries);
          break;

        case 'MACD':
          // 测试10: 去掉priceScaleId，看是否显示刻度
          const macdParams = config.indicatorParams.MACD;
          const macdHistogram = subChart.addSeries(HistogramSeries, {
            color: '#26a69a',
            lastValueVisible: false,
            priceLineVisible: false,
          });
          const macdDif = subChart.addSeries(LineSeries, {
            color: macdParams.difColor,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          const macdDea = subChart.addSeries(LineSeries, {
            color: macdParams.deaColor,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
          });

          if (indicators.macd && Array.isArray(indicators.macd)) {
            const histogramData = indicators.macd.map((m: any, i: number) => ({
              time: candlestickData[i]?.time,
              value: m?.macd || 0,
              color: (m?.macd || 0) >= 0 ? macdParams.histogramUpColor : macdParams.histogramDownColor,
            })).filter((d: any) => d.time);
            macdHistogram.setData(histogramData);

            const difData = indicators.macd.map((m: any, i: number) => ({
              time: candlestickData[i]?.time,
              value: m?.dif || 0,
            })).filter((d: any) => d.time);
            macdDif.setData(difData);

            const deaData = indicators.macd.map((m: any, i: number) => ({
              time: candlestickData[i]?.time,
              value: m?.dea || 0,
            })).filter((d: any) => d.time);
            macdDea.setData(deaData);
          }

          seriesMap.set('MACD_HIST', macdHistogram);
          seriesMap.set('MACD_DIF', macdDif);
          seriesMap.set('MACD_DEA', macdDea);
          break;

        case 'KDJ':
          const kdjParams = config.indicatorParams.KDJ;
          const kdjK = subChart.addSeries(LineSeries, {
            color: kdjParams.kColor,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          const kdjD = subChart.addSeries(LineSeries, {
            color: kdjParams.dColor,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          const kdjJ = subChart.addSeries(LineSeries, {
            color: kdjParams.jColor,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
          });

          if (indicators.kdj && Array.isArray(indicators.kdj)) {
            const kData = indicators.kdj.map((k: any, i: number) => ({
              time: candlestickData[i]?.time,
              value: k?.k || 0,
            })).filter((d: any) => d.time);
            kdjK.setData(kData);

            const dData = indicators.kdj.map((k: any, i: number) => ({
              time: candlestickData[i]?.time,
              value: k?.d || 0,
            })).filter((d: any) => d.time);
            kdjD.setData(dData);

            const jData = indicators.kdj.map((k: any, i: number) => ({
              time: candlestickData[i]?.time,
              value: k?.j || 0,
            })).filter((d: any) => d.time);
            kdjJ.setData(jData);
          }

          seriesMap.set('KDJ_K', kdjK);
          seriesMap.set('KDJ_D', kdjD);
          seriesMap.set('KDJ_J', kdjJ);
          break;
      }
    });

    // 自动调整时间范围
    setTimeout(() => {
      if (mainChartRef.current) {
        mainChartRef.current.timeScale().scrollToPosition(0, false);
      }
    }, 100);

    // 设置当前数据索引为最新数据
    setCurrentDataIndex(klines.length - 1);
  }, [config.subChart, config.indicatorParams, updateMainChartIndicators]);

  /**
   * 加载所有数据
   */
  const loadAllData = useCallback(async () => {
    try {
      setDataLoading(true);

      const token = getToken();
      const response = await fetch(`/api/v1/stocks/${code}/klines?period=day&limit=500&fq=${config.fqType}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();

      if (!result.success || !result.data?.klines?.length) {
        console.error('数据加载失败:', result);
        setDataLoading(false);
        return;
      }

      const klines = result.data.klines;
      const indicators = result.data.indicators;

      // 保存原始数据
      setRawKlines(klines);
      setRawIndicators(indicators);

      // 根据当前周期获取数据（直接传递 indicators 避免异步状态更新问题）
      const { klines: periodKlines, indicators: periodIndicators } = getDataByPeriod(klines, indicators);

      // 保存缓存数据（useEffect 会处理数据设置）
      setCachedData({ klines: periodKlines, indicators: periodIndicators });
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setDataLoading(false);
    }
  }, [code, config.fqType, period, getDataByPeriod]);

  /**
   * 初始化所有图表
   */
  useEffect(() => {

    if (!configInitialized) {
      return;
    }

    // 如果已经初始化过图表，不重复初始化
    if (mainChartRef.current) {
      return;
    }

    const doInit = () => {
      initMainChart();
      // 延迟初始化副图，确保DOM已渲染
      setTimeout(() => {
        initSubCharts();
      }, 200);
      setLoading(false);
    };

    // 确保容器存在 - 如果不存在，等待
    if (!mainChartContainerRef.current) {
      // 使用多重检查确保容器准备好
      const checkContainer = () => {
        if (mainChartContainerRef.current) {
          doInit();
        } else {
          setTimeout(checkContainer, 100);
        }
      };
      checkContainer();
      return;
    }

    doInit();
  }, [configInitialized]);

  /**
   * 配置变化时重新初始化副图
   */
  useEffect(() => {
    if (!configInitialized) return;
    initSubCharts();
  }, [config.subChart.count, configInitialized]);

  /**
   * 周期变化时重新加载数据
   */
  useEffect(() => {
    if (rawKlines.length > 0 && configInitialized) {
      const { klines, indicators } = getDataByPeriod();
      setCachedData({ klines, indicators });
      if (mainChartRef.current) {
        setDataToCharts(klines, indicators);
      }
    }
  }, [period, rawKlines, configInitialized]);

  /**
   * 配置初始化后加载数据
   */
  useEffect(() => {
    if (configInitialized) {
      loadAllData();
    }
  }, [configInitialized, config.fqType, code, loadAllData]);

  /**
   * 缓存数据变化时设置到图表
   */
  useEffect(() => {
    if (cachedData && mainChartRef.current) {
      setDataToCharts(cachedData.klines, cachedData.indicators);
    }
  }, [cachedData]);

  /**
   * 副图创建后重新设置数据（修复时序问题）
   */
  useEffect(() => {
    // 等待下一个 tick，确保副图已完全创建
    setTimeout(() => {
      const subChartCount = subChartsRef.current.filter(c => c).length;
      if (subChartCount > 0 && subChartCount === config.subChart.count && cachedData && mainChartRef.current) {
        setDataToCharts(cachedData.klines, cachedData.indicators);
      }
      // 同步所有图表宽度
      syncAllChartsWidth();
    }, 0);
  }, [config.subChart.count, syncAllChartsWidth]);

  /**
   * 处理副图指标切换
   */
  const handleSwitcherIndicatorChange = async (indicatorId: SubChartIndicatorId) => {
    await switchSubChartIndicator(switcherSubChartIndex, indicatorId);
  };

  const handleOpenSwitcher = (index: number) => {
    setSwitcherSubChartIndex(index);
    setSwitcherVisible(true);
  };

  const handleReload = () => {
    loadAllData();
  };

  /**
   * 处理窗口大小变化
   */
  useEffect(() => {
    if (!mainChartRef.current) return;

    const handleResize = () => {
      // 统一使用主图容器宽度，确保所有图表宽度一致
      syncAllChartsWidth();
    };

    // 使用ResizeObserver监听容器大小变化
    const resizeObserver = new ResizeObserver(handleResize);

    if (mainChartContainerRef.current) {
      resizeObserver.observe(mainChartContainerRef.current);
    }

    subChartContainerRefs.current.forEach((container) => {
      if (container) {
        resizeObserver.observe(container);
      }
    });

    // 同时监听window resize事件（作为备用）
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [configInitialized, syncAllChartsWidth]);

  if (configLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large">
          <div style={{ paddingTop: 24 }}>加载配置中...</div>
        </Spin>
      </div>
    );
  }


  return (
    <div className="stock-chart-container">
      {/* 图表头部 */}
      <div className="chart-header">
        <Space>
          <LineChartOutlined />
          <span className="chart-title">技术分析图表</span>
          <Segmented
            options={periodOptions}
            value={period}
            onChange={(value) => setPeriod(value as string)}
            size="small"
          />
          <Segmented
            options={[
              { label: '前复权', value: 'qfq' },
              { label: '后复权', value: 'hfq' },
              { label: '不复权', value: 'none' },
            ]}
            value={config.fqType}
            onChange={(value) => updateConfig({ fqType: value as any })}
            size="small"
          />
        </Space>
        <Space>
          <Button
            icon={<SettingOutlined />}
            size="small"
            onClick={() => setSettingsVisible(true)}
          >
            设置
          </Button>
          <Button icon={<ReloadOutlined />} size="small" onClick={handleReload}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 主图：K线 + 指标 */}
      <div className="chart-section">
        <div className="chart-label">K线</div>
        {/* 主图MA指标数值显示 */}
        <div
          className="chart-values"
          style={{
            position: 'absolute',
            top: 8,
            right: 60,
            fontSize: 11,
            fontWeight: 500,
            color: '#262626',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '2px 6px',
            borderRadius: 3,
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {getMainChartMAValues(currentDataIndex)}
        </div>
        <div className="chart-main" style={{ position: 'relative', width: '100%' }}>
          {dataLoading || loading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
              <Spin size="small" />
            </div>
          ) : null}
          <div ref={mainChartContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {/* 副图 */}
      {Array.from({ length: config.subChart.count }).map((_, i) => {
        const indicatorId = config.subChart.subCharts[i]?.indicatorId || '';
        return (
          <div key={i} className="chart-section chart-sub" style={{ position: 'relative' }}>
            {/* 左上角：指标名称 + 实时数值 */}
            <div
              className="chart-label clickable"
              onClick={() => handleOpenSwitcher(i)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <span>{getIndicatorDisplayName(indicatorId)}</span>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#262626',
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '2px 6px',
                borderRadius: 3,
              }}>
                {getIndicatorValues(indicatorId, currentDataIndex)}
              </span>
            </div>
            <div className="chart-sub" style={{ height: 120, position: 'relative', width: '100%' }}>
              {dataLoading || loading ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                  <Spin size="small" />
                </div>
              ) : null}
              <div
                ref={(el) => {
                  if (el && subChartContainerRefs.current[i] !== el) {
                    subChartContainerRefs.current[i] = el;
                  }
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        );
      })}

      {/* 设置弹窗 */}
      <ChartSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        config={config}
        onConfigChange={updateConfig}
        onReset={resetConfig}
      />

      {/* 副图指标切换弹窗 */}
      <SubChartIndicatorSwitcher
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        currentIndicatorId={config.subChart.subCharts[switcherSubChartIndex]?.indicatorId || ''}
        onIndicatorChange={handleSwitcherIndicatorChange}
      />
    </div>
  );
};

export default DynamicProfessionalStockChart;
