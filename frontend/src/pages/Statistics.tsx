import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, DatePicker, Button, message, Modal, Space, Alert, List, Tag, Progress } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  BarChartOutlined,
  WarningOutlined,
  HeartOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { api } from '@/services/api';
import type { Category, AnomalyResponse, HealthScoreResponse, ComparisonResponse, PredictionResponse, StatisticsOverview } from '@/types';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

const Statistics = () => {
  const [statistics, setStatistics] = useState<StatisticsOverview | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('all');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [anomalies, setAnomalies] = useState<AnomalyResponse[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScoreResponse | null>(null);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);

  useEffect(() => {
    loadStatistics();
    loadCategories();
    loadAnomalies();
    loadHealthScore();
    loadComparison();
    loadPrediction();
  }, [period, dateRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};

      if (period !== 'all') {
        params.period = period;
      }

      if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const data = await api.getStatistics(params);
      setStatistics(data);
    } catch (error) {
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

  const loadAnomalies = async () => {
    try {
      const data = await api.getAnomalies(5); // 阈值：5倍平均值
      setAnomalies(data);
    } catch (error) {
      console.error('加载异常消费失败:', error);
      message.error('加载异常消费失败，请刷新页面重试');
      setAnomalies([]);
    }
  };

  const loadHealthScore = async () => {
    try {
      const data = await api.getHealthScore();
      setHealthScore(data);
    } catch (error) {
      console.error('加载健康评分失败:', error);
      message.error('加载健康评分失败，请刷新页面重试');
    }
  };

  const loadComparison = async () => {
    try {
      const data = await api.getComparison();
      setComparison(data);
    } catch (error) {
      console.error('加载对比数据失败:', error);
      message.error('加载对比数据失败，请刷新页面重试');
    }
  };

  const loadPrediction = async () => {
    try {
      const data = await api.getPrediction();
      setPrediction(data);
    } catch (error) {
      console.error('加载预测数据失败:', error);
      message.error('加载预测数据失败，请刷新页面重试');
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
    if (!statistics?.categoryBreakdown || statistics.categoryBreakdown.length === 0) {
      return null;
    }

    const data = statistics.categoryBreakdown.map((item) => ({
      name: getCategoryName(item.categoryId),
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
    if (!statistics?.categoryBreakdown || statistics.categoryBreakdown.length === 0) {
      return null;
    }

    const sorted = [...statistics.categoryBreakdown].sort((a, b) => b.amount - a.amount);
    const categories = sorted.map((item) => getCategoryName(item.categoryId));
    const amounts = sorted.map((item) => item.amount);

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
            color: 'var(--color-primary)',
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
              style={{ width: '7.5rem' }}
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
        <Row gutter={16} style={{ marginBottom: '1.5rem' }}>
          <Col span={8}>
            <Statistic
              title="总收入"
              value={statistics?.incomeTotal || 0}
              precision={2}
              prefix={<ArrowUpOutlined />}
              suffix="¥"
              styles={{ content: { color: '#3f8600' } }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总支出"
              value={statistics?.expenseTotal || 0}
              precision={2}
              prefix={<ArrowDownOutlined />}
              suffix="¥"
              styles={{ content: { color: '#cf1322' } }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="净储蓄"
              value={statistics?.netSavings || 0}
              precision={2}
              prefix={<WalletOutlined />}
              suffix="¥"
              styles={{
                content: {
                  color: (statistics?.netSavings || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-error)',
                },
              }}
            />
          </Col>
        </Row>

        {/* 异常消费检测 */}
        {anomalies.length > 0 && (
          <Alert
            message="检测到异常消费"
            description={
              <List
                size="small"
                dataSource={anomalies.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<WarningOutlined style={{ fontSize: 20, color: item.severity === 'high' ? '#ff4d4f' : item.severity === 'medium' ? '#faad14' : '#52c41a' }} />}
                      title={
                        <span>
                          {item.type === 'single_transaction' ? '单笔异常' : '分类突增'}:
                          {item.categoryName || '未知分类'}
                          <Tag color={item.severity === 'high' ? 'error' : item.severity === 'medium' ? 'warning' : 'success'} style={{ marginLeft: 8 }}>
                            {item.severity === 'high' ? '高' : item.severity === 'medium' ? '中' : '低'}
                          </Tag>
                        </span>
                      }
                      description={
                        <span>
                          {item.description}
                          {item.transactionDate && ` (${new Date(item.transactionDate).toLocaleDateString()})`}
                          <br />
                          金额: ¥{item.amount.toFixed(2)} (平均: ¥{item.averageAmount.toFixed(2)})
                          {item.deviationPercentage > 0 && `, 偏差: +${item.deviationPercentage.toFixed(0)}%`}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            }
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 财务健康评分 */}
        {healthScore && (
          <Card
            title={
              <span>
                <HeartOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                财务健康评分
              </span>
            }
            extra={<Tag color={healthScore.totalScore >= 90 ? 'success' : healthScore.totalScore >= 80 ? 'processing' : healthScore.totalScore >= 70 ? 'warning' : 'error'}>{healthScore.level}</Tag>}
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="总分"
                  value={healthScore.totalScore}
                  suffix="/ 100"
                  valueStyle={{ color: healthScore.totalScore >= 80 ? '#3f8600' : healthScore.totalScore >= 70 ? '#faad14' : '#ff4d4f', fontSize: 32 }}
                />
              </Col>
              <Col span={16}>
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>储蓄率</span>
                      <span style={{ fontWeight: 500 }}>{healthScore.savingsRateScore} / 40 ({healthScore.savingsRate.toFixed(1)}%)</span>
                    </div>
                    <Progress
                      percent={(healthScore.savingsRateScore / 40) * 100}
                      strokeColor={healthScore.savingsRateScore >= 35 ? '#52c41a' : healthScore.savingsRateScore >= 25 ? '#faad14' : '#ff4d4f'}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>预算控制</span>
                      <span style={{ fontWeight: 500 }}>{healthScore.budgetControlScore} / 30</span>
                    </div>
                    <Progress
                      percent={(healthScore.budgetControlScore / 30) * 100}
                      strokeColor={healthScore.budgetControlScore >= 25 ? '#52c41a' : healthScore.budgetControlScore >= 20 ? '#faad14' : '#ff4d4f'}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>消费多样性</span>
                      <span style={{ fontWeight: 500 }}>{healthScore.diversityScore} / 30 ({healthScore.categoryCount}个分类)</span>
                    </div>
                    <Progress
                      percent={(healthScore.diversityScore / 30) * 100}
                      strokeColor={healthScore.diversityScore >= 25 ? '#52c41a' : healthScore.diversityScore >= 20 ? '#faad14' : '#ff4d4f'}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                </div>
              </Col>
            </Row>
            {healthScore.suggestions && healthScore.suggestions.length > 0 && (
              <Alert
                message="优化建议"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {healthScore.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                }
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        )}

        {/* 同比环比分析 */}
        {comparison && (
          <Card title="同比环比分析" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <h4 style={{ marginBottom: 16 }}>环比（本月 vs 上月）</h4>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>收入:</span>
                    <span style={{ fontWeight: 500 }}>
                      ¥{comparison.monthOverMonth.thisMonthIncome.toFixed(0)}
                      <span style={{ fontSize: 12, color: comparison.monthOverMonth.incomeGrowthRate >= 0 ? '#52c41a' : '#ff4d4f' }}>
                        {comparison.monthOverMonth.incomeGrowthRate >= 0 ? ' ↑' : ' ↓'}{Math.abs(comparison.monthOverMonth.incomeGrowthRate).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>支出:</span>
                    <span style={{ fontWeight: 500 }}>
                      ¥{comparison.monthOverMonth.thisMonthExpense.toFixed(0)}
                      <span style={{ fontSize: 12, color: comparison.monthOverMonth.expenseGrowthRate <= 0 ? '#52c41a' : '#ff4d4f' }}>
                        {comparison.monthOverMonth.expenseGrowthRate >= 0 ? ' ↑' : ' ↓'}{Math.abs(comparison.monthOverMonth.expenseGrowthRate).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>净储蓄:</span>
                    <span style={{ fontWeight: 500 }}>
                      ¥{comparison.monthOverMonth.thisMonthNetSavings.toFixed(0)}
                      <span style={{ fontSize: 12, color: comparison.monthOverMonth.netSavingsGrowthRate >= 0 ? '#52c41a' : '#ff4d4f' }}>
                        {comparison.monthOverMonth.netSavingsGrowthRate >= 0 ? ' ↑' : ' ↓'}{Math.abs(comparison.monthOverMonth.netSavingsGrowthRate).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <h4 style={{ marginBottom: 16 }}>同比（今年 vs 去年）</h4>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>收入:</span>
                    <span style={{ fontWeight: 500 }}>
                      ¥{comparison.yearOverYear.thisYearIncome.toFixed(0)}
                      <span style={{ fontSize: 12, color: comparison.yearOverYear.incomeGrowthRate >= 0 ? '#52c41a' : '#ff4d4f' }}>
                        {comparison.yearOverYear.incomeGrowthRate >= 0 ? ' ↑' : ' ↓'}{Math.abs(comparison.yearOverYear.incomeGrowthRate).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>支出:</span>
                    <span style={{ fontWeight: 500 }}>
                      ¥{comparison.yearOverYear.thisYearExpense.toFixed(0)}
                      <span style={{ fontSize: 12, color: comparison.yearOverYear.expenseGrowthRate <= 0 ? '#52c41a' : '#ff4d4f' }}>
                        {comparison.yearOverYear.expenseGrowthRate >= 0 ? ' ↑' : ' ↓'}{Math.abs(comparison.yearOverYear.expenseGrowthRate).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>净储蓄:</span>
                    <span style={{ fontWeight: 500 }}>
                      ¥{comparison.yearOverYear.thisYearNetSavings.toFixed(0)}
                      <span style={{ fontSize: 12, color: comparison.yearOverYear.netSavingsGrowthRate >= 0 ? '#52c41a' : '#ff4d4f' }}>
                        {comparison.yearOverYear.netSavingsGrowthRate >= 0 ? ' ↑' : ' ↓'}{Math.abs(comparison.yearOverYear.netSavingsGrowthRate).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {/* 预测性分析 */}
        {prediction && (
          <Card
            title={
              <span>
                <LineChartOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                预测性分析
              </span>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="下月预测支出"
                  value={prediction.nextMonthPredictedExpense}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#ff4d4f', fontSize: 28 }}
                  suffix={
                    <Tag color={prediction.confidence === 'high' ? 'success' : prediction.confidence === 'medium' ? 'processing' : 'warning'}>
                      置信度: {prediction.confidence === 'high' ? '高' : prediction.confidence === 'medium' ? '中' : '低'}
                    </Tag>
                  }
                />
              </Col>
              <Col span={8}>
                <div style={{ padding: '8px 0' }}>
                  <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--color-text-secondary)' }}>消费趋势</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 24,
                      fontWeight: 500,
                      color: prediction.trend === 'rising' ? '#ff4d4f' : prediction.trend === 'falling' ? '#52c41a' : '#faad14'
                    }}>
                      {prediction.trend === 'rising' ? '↑' : prediction.trend === 'falling' ? '↓' : '→'}
                    </span>
                    <span style={{ fontSize: 16 }}>{prediction.trend === 'rising' ? '上升' : prediction.trend === 'falling' ? '下降' : '稳定'}</span>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ padding: '8px 0' }}>
                  <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--color-text-secondary)' }}>预测方法</div>
                  <div style={{ fontSize: 14, color: 'var(--color-text)' }}>
                    {prediction.predictionMethod}
                  </div>
                </div>
              </Col>
            </Row>

            {/* 近3个月支出趋势 */}
            {prediction.recentThreeMonthsExpenses && prediction.recentThreeMonthsExpenses.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 500 }}>近3个月支出趋势</div>
                <Row gutter={16}>
                  {prediction.recentThreeMonthsExpenses.map((month, index: number) => (
                    <Col span={8} key={index}>
                      <div style={{
                        padding: '12px',
                        background: 'var(--color-bg-layout)',
                        borderRadius: 'var(--radius-lg)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                          {month.yearMonth}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text)' }}>
                          ¥{month.expense.toFixed(0)}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            )}

            {/* 超支预警 */}
            {prediction.overBudgetMonth !== null && prediction.overBudgetMonth > 0 && (
              <Alert
                message="超支预警"
                description={`按照当前消费趋势，预计在 ${prediction.overBudgetMonth} 个月后将超出预算限额，建议适当控制支出。`}
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Card title="分类支出占比" loading={loading}>
              {getPieChartOption() ? (
                <ReactECharts option={getPieChartOption()} style={{ height: '25rem' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>暂无数据</div>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="分类支出排行" loading={loading}>
              {getBarChartOption() ? (
                <ReactECharts option={getBarChartOption()} style={{ height: '25rem' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>暂无数据</div>
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
        width={50}
      >
        <div
          style={{
            minHeight: '12.5rem',
            maxHeight: '37.5rem',
            overflowY: 'auto',
            padding: 'var(--spacing-lg)',
            background: 'var(--color-bg-layout)',
            borderRadius: 'var(--radius-lg)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.8,
          }}
        >
          {aiAnalyzing ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>
              AI 正在分析中...
            </div>
          ) : aiAnalysis ? (
            aiAnalysis
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--color-text-tertiary)' }}>
              暂无分析结果
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Statistics;
