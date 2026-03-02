import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { Card, Spin, Alert, Button, Select } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getToken } from '@/utils/auth';
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
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

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

    // 添加 K线系列 - 使用 SeriesDefinition
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // 添加成交量系列
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
    });
    volumeSeriesRef.current = volumeSeries;

    chartRef.current = chart;

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
    if (!candlestickSeriesRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const periodConfig = periodOptions.find(p => p.key === period);
      const limit = periodConfig?.days || 365;

      const token = getToken();
      const response = await fetch(`/api/v1/stocks/${code}/klines?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (!result.success || !result.data?.klines?.length) {
        throw new Error('无K线数据');
      }

      // 转换时间戳从毫秒到秒
      const klines: CandlestickData<Time>[] = result.data.klines.map((k: KlineData) => ({
        time: (k.time / 1000) as Time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }));

      candlestickSeriesRef.current.setData(klines);

      // 成交量数据
      const volumeData = result.data.klines.map((k: KlineData) => ({
        time: (k.time / 1000) as Time,
        value: k.volume,
        color: k.close >= k.open ? '#26a69a80' : '#ef535080',
      }));
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
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
        </span>
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
