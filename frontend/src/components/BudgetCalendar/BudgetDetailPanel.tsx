import { Divider, Progress, Button, Space, Switch, Form, message, Tag, Statistic, Row, Col, Spin } from 'antd';
import { api } from '@/services/api';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

interface BudgetDetailPanelProps {
  date: string;
  period: 'day' | 'week' | 'month' | 'year';
}

const BudgetDetailPanel = ({ date, period }: BudgetDetailPanelProps) => {
  const [form] = Form.useForm();
  const [budgetData, setBudgetData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const currentDate = dayjs(date);

  useEffect(() => {
    loadBudgetData();
  }, [date, period]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      // 获取预算使用情况数据
      const usageData = await api.getBudgetUsage();

      // 根据视图类型过滤数据
      let filteredUsage = usageData;
      switch (period) {
        case 'week':
          // 过滤本周的预算数据
          filteredUsage = usageData.filter(b =>
            b.period.toLowerCase().includes('week') ||
            b.period.toLowerCase() === 'weekly'
          );
          break;
        case 'month':
          // 过滤本月的预算数据
          filteredUsage = usageData.filter(b =>
            b.period.toLowerCase().includes('month') ||
            b.period.toLowerCase() === 'monthly'
          );
          break;
        case 'year':
          // 过滤本年的预算数据
          filteredUsage = usageData.filter(b =>
            b.period.toLowerCase().includes('year') ||
            b.period.toLowerCase() === 'yearly'
          );
          break;
        default:
          // daily 或其他
          filteredUsage = usageData.filter(b =>
            b.period.toLowerCase().includes('day') ||
            b.period.toLowerCase() === 'daily'
          );
      }

      // 构建预算数据
      const totalBudget = filteredUsage.reduce((sum, b) => sum + b.budgetAmount, 0);
      const totalUsed = filteredUsage.reduce((sum, b) => sum + b.usedAmount, 0);

      setBudgetData({
        totalBudget,
        used: totalUsed,
        title: getTitleForPeriod(currentDate, period),
        subtitle: getSubtitleForPeriod(period),
        categoryBudgets: filteredUsage.map(b => ({
          categoryId: b.categoryId,
          categoryName: b.categoryName || '未分类',
          budget: b.budgetAmount,
          used: b.usedAmount,
          percentage: b.usagePercentage || 0,
        }))
      });
    } catch (error) {
      console.error('加载预算数据失败:', error);
      message.error('加载预算数据失败');
      // 设置默认数据
      setBudgetData({
        totalBudget: 0,
        used: 0,
        title: getTitleForPeriod(currentDate, period),
        subtitle: getSubtitleForPeriod(period),
        categoryBudgets: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // 根据周期类型获取标题
  const getTitleForPeriod = (currentDate: dayjs.Dayjs, period: 'day' | 'week' | 'month' | 'year') => {
    switch (period) {
      case 'week':
        return `第${currentDate.week()}周`;
      case 'month':
        return currentDate.format('YYYY年MM月');
      case 'year':
        return currentDate.format('YYYY年');
      default:
        return currentDate.format('YYYY年MM月DD日');
    }
  };

  // 根据周期类型获取副标题
  const getSubtitleForPeriod = (period: 'day' | 'week' | 'month' | 'year') => {
    switch (period) {
      case 'week':
        return '周预算';
      case 'month':
        return '月预算';
      case 'year':
        return '年预算';
      default:
        return '日预算';
    }
  };

  const percentage = budgetData?.totalBudget ? (budgetData.used / budgetData.totalBudget) * 100 : 0;
  const status = percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'normal';
  const statusText = status === 'over' ? '已超支' : status === 'warning' ? '接近限额' : '预算正常';

  const handleSave = async () => {
    try {
      await form.validateFields();
      // TODO: 实现预算保存逻辑
      message.success('预算已保存');
    } catch {
      // 验证失败，不处理
    }
  };

  if (loading || !budgetData) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#8c8c8c' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      {/* 日期标题 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#262626' }}>
          {budgetData.title}
        </div>
        <div style={{ marginTop: '8px' }}>
          <Tag color="blue" style={{ fontSize: '13px', padding: '4px 12px' }}>
            {budgetData.subtitle}
          </Tag>
          <span style={{ marginLeft: '8px', fontSize: '13px', color: '#8c8c8c' }}>
            {period === 'week' && `${currentDate.startOf('week').format('MM/DD')} - ${currentDate.endOf('week').format('MM/DD')}`}
            {period === 'month' && `${currentDate.daysInMonth()}天`}
            {period === 'year' && '12个月'}
            {period === 'day' && '1天'}
          </span>
        </div>
      </div>

      {/* 总消费概览 */}
      <div style={{
        marginBottom: '24px',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        color: '#fff',
      }}>
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>已用金额</span>}
              value={budgetData.used}
              precision={0}
              prefix="¥"
              valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 700 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>总预算</span>}
              value={budgetData.totalBudget}
              precision={0}
              prefix="¥"
              valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 700 }}
            />
          </Col>
        </Row>
        <div style={{ marginTop: '16px' }}>
          <Progress
            percent={Math.min(percentage, 100)}
            strokeColor="#fff"
            trailColor="rgba(255,255,255,0.3)"
            format={(percent) => (
              <span style={{ color: '#fff', fontWeight: 600 }}>
                {percent?.toFixed(0)}%
              </span>
            )}
            strokeWidth={12}
          />
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <Tag color={status === 'over' ? 'error' : status === 'warning' ? 'warning' : 'success'} style={{ fontSize: '13px', padding: '4px 12px' }}>
              {statusText}
            </Tag>
          </div>
        </div>
      </div>

      <Divider />

      {/* 分类预算 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>分类预算</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {budgetData.categoryBudgets.length > 0 ? (
            budgetData.categoryBudgets.map((category: any) => {
              const catPercentage = category.budget ? (category.used / category.budget) * 100 : 0;
              const catColor = catPercentage >= 100 ? '#ff4d4f' :
                catPercentage >= 80 ? '#faad14' : '#52c41a';
              const catStatus = catPercentage >= 100 ? '超支' :
                catPercentage >= 80 ? '预警' : '正常';
              return (
                <div
                  key={category.categoryId}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{category.categoryName}</span>
                    <Tag color={catPercentage >= 100 ? 'error' : catPercentage >= 80 ? 'warning' : 'success'}>
                      {catStatus}
                    </Tag>
                  </div>
                  <Progress
                    percent={Math.min(catPercentage, 100)}
                    strokeColor={catColor}
                    showInfo={false}
                    strokeWidth={6}
                    style={{ marginBottom: '12px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#8c8c8c', marginRight: '4px' }}>已用</span>
                      <span style={{ fontWeight: 600, color: '#262626' }}>¥{category.used.toFixed(0)}</span>
                    </div>
                    <div>
                      <span style={{ color: '#8c8c8c', marginRight: '4px' }}>预算</span>
                      <span style={{ color: '#8c8c8c' }}>¥{category.budget.toFixed(0)}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: catColor }}>
                      {catPercentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#8c8c8c' }}>
              暂无预算数据
            </div>
          )}
          <Button
            type="dashed"
            block
            size="large"
            style={{ marginTop: '16px', height: '44px', borderRadius: '8px' }}
            onClick={() => message.info('添加预算功能开发中')}
          >
            + 添加预算
          </Button>
        </div>
      </div>

      <Divider />

      {/* 同步设置 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>同步设置</h4>
        <Form form={form} layout="vertical">
          <div style={{
            padding: '12px',
            background: '#fafafa',
            borderRadius: '8px',
            marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px' }}>应用到所有未来工作日</span>
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </div>
          </div>
          <div style={{
            padding: '12px',
            background: '#fafafa',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px' }}>应用到所有未来周末</span>
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </div>
          </div>
        </Form>
      </div>

      {/* 操作按钮 */}
      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button size="large">重置</Button>
          <Button type="primary" size="large" onClick={handleSave}>保存</Button>
        </Space>
      </div>
    </div>
  );
};

export default BudgetDetailPanel;
