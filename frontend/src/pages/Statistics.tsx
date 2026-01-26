import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, DatePicker, Button, message, Modal, Space } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { api } from '@/services/api';
import type { Category } from '@/types';

const { RangePicker } = DatePicker;

const Statistics = () => {
  const [statistics, setStatistics] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('all');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiModalVisible, setAiModalVisible] = useState(false);

  useEffect(() => {
    loadStatistics();
    loadCategories();
  }, [period, dateRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      let params: any = {};

      if (period !== 'all') {
        params.period = period;
      }

      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const data = await api.getStatistics(params);
      console.log('统计数据:', data);
      setStatistics(data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
      message.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      message.error('加载分类失败');
    }
  };

  const handleAIAnalysis = async () => {
    setAiAnalyzing(true);
    setAiAnalysis('');
    setAiModalVisible(true);

    try {
      // 获取记账数据
      const transactionsData = await api.getTransactions({ current: 1, pageSize: 1000 });
      const budgetsData = await api.getBudgets();

      const transactions = transactionsData.content?.map((t: any) => ({
        date: t.transactionDate,
        amount: t.amount,
        type: t.type,
        category_id: t.categoryId,
      })) || [];

      const budgetInfo = {
        period,
        budgets: budgetsData,
      };

      // 使用 SSE 流式接收 AI 分析
      api.analyzeSpendingStream(
        transactions,
        budgetInfo,
        (chunk: string) => {
          setAiAnalysis((prev) => prev + chunk);
        },
        (error: string) => {
          message.error(`AI分析失败: ${error}`);
          setAiAnalyzing(false);
        },
        () => {
          setAiAnalyzing(false);
        }
      );
    } catch (error) {
      message.error('启动AI分析失败');
      setAiAnalyzing(false);
    }
  };

  const getPieChartOption = () => {
    if (!statistics?.category_breakdown || statistics.category_breakdown.length === 0) {
      return null;
    }

    const data = statistics.category_breakdown.map((item: any) => ({
      name: getCategoryName(item.category_id),
      value: item.amount,
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: ¥{c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: '支出分类',
          type: 'pie',
          radius: '50%',
          data,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  };

  const getBarChartOption = () => {
    if (!statistics?.category_breakdown || statistics.category_breakdown.length === 0) {
      return null;
    }

    const sorted = [...statistics.category_breakdown].sort((a: any, b: any) => b.amount - a.amount);
    const categories = sorted.map((item: any) => getCategoryName(item.category_id));
    const amounts = sorted.map((item: any) => item.amount);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '¥{value}',
        },
      },
      series: [
        {
          name: '支出金额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: '#1677ff',
          },
        },
      ],
    };
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || `分类 #${categoryId}`;
  };

  return (
    <div>
      <Card
        title="统计分析"
        extra={
          <Space>
            <Select
              value={period}
              onChange={setPeriod}
              style={{ width: 120 }}
            >
              <Select.Option value="all">全部</Select.Option>
              <Select.Option value="this_month">本月</Select.Option>
              <Select.Option value="last_month">上月</Select.Option>
              <Select.Option value="this_year">今年</Select.Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
            />
            <Button
              type="primary"
              icon={<BarChartOutlined />}
              onClick={handleAIAnalysis}
              loading={aiAnalyzing}
            >
              AI 分析
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Statistic
              title="总收入"
              value={statistics?.income_total || 0}
              precision={2}
              prefix={<ArrowUpOutlined />}
              suffix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总支出"
              value={statistics?.expense_total || 0}
              precision={2}
              prefix={<ArrowDownOutlined />}
              suffix="¥"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="净储蓄"
              value={statistics?.net_savings || 0}
              precision={2}
              prefix={<WalletOutlined />}
              suffix="¥"
              valueStyle={{
                color: (statistics?.net_savings || 0) >= 0 ? '#1677ff' : '#cf1322',
              }}
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Card title="分类支出占比" loading={loading}>
              {getPieChartOption() ? (
                <ReactECharts option={getPieChartOption()} style={{ height: 400 }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>暂无数据</div>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="分类支出排行" loading={loading}>
              {getBarChartOption() ? (
                <ReactECharts option={getBarChartOption()} style={{ height: 400 }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>暂无数据</div>
              )}
            </Card>
          </Col>
        </Row>
      </Card>

      <Modal
        title="AI 分析建议"
        open={aiModalVisible}
        onCancel={() => setAiModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setAiModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <div
          style={{
            minHeight: 200,
            maxHeight: 600,
            overflowY: 'auto',
            padding: 16,
            background: '#f5f5f5',
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.8,
          }}
        >
          {aiAnalyzing ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              AI 正在分析中...
            </div>
          ) : aiAnalysis ? (
            aiAnalysis
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              暂无分析结果
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Statistics;
