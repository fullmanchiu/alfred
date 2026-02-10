import { Drawer, Divider, Progress, Button, Space, Switch, Form, message, Tag, Statistic, Row, Col, Spin } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { BudgetHierarchyDto } from '../../types';

interface DetailDrawerProps {
  visible: boolean;
  date: string;
  period: 'day' | 'week' | 'month' | 'year';
  onClose: () => void;
}

const DetailDrawer = ({ visible, date, period, onClose }: DetailDrawerProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BudgetHierarchyDto | null>(null);

  useEffect(() => {
    if (visible) {
      fetchBudgetHierarchy();
    }
  }, [visible, date, period]);

  const fetchBudgetHierarchy = async () => {
    setLoading(true);
    try {
      const result = await api.getBudgetHierarchy({
        date,
        period,
      });
      setData(result);
    } catch (error) {
      console.error('获取预算层级失败:', error);
      message.error('获取预算数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      console.log('保存预算:', values);
      message.success('预算已保存');
      onClose();
    } catch (error) {
      console.error('验证失败:', error);
    }
  };

  const percentage = data?.percentage ?? 0;
  const status = data?.status ?? 'normal';
  const statusText = status === 'over' ? '已超支' : status === 'warning' ? '接近限额' : '预算正常';

  if (loading) {
    return (
      <Drawer
        title="预算详情"
        placement="right"
        size={520}
        open={visible}
        onClose={onClose}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Spin size="large" />
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>
            {dayjs(date).format('YYYY年MM月DD日')}
          </span>
          {period === 'day' && <Tag color="blue">周日</Tag>}
          {period === 'week' && <Tag color="blue">第{dayjs(date).week()}周</Tag>}
          {period === 'month' && <Tag color="blue">{dayjs(date).format('MM月')}</Tag>}
          {period === 'year' && <Tag color="blue">{dayjs(date).format('YYYY年')}</Tag>}
        </div>
      }
      placement="right"
      size={520}
      open={visible}
      onClose={onClose}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={handleSave}>保存</Button>
          </Space>
        </div>
      }
    >
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
              value={data?.used ?? 0}
              precision={0}
              prefix="¥"
              valueStyle={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>总预算</span>}
              value={data?.totalBudget ?? 0}
              precision={0}
              prefix="¥"
              valueStyle={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}
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
          />
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <Tag color={status === 'over' ? 'error' : status === 'warning' ? 'warning' : 'success'}>
              {statusText}
            </Tag>
          </div>
        </div>
      </div>

      {/* 预算层级 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>预算层级</h4>
        <div style={{
          background: '#fafafa',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '13px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#8c8c8c' }}>日预算</span>
            <span style={{ fontWeight: 500 }}>¥{data?.dayBudget ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#8c8c8c' }}>周预算聚合</span>
            <span style={{ fontWeight: 500 }}>¥{data?.weekBudgetAggregate ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#8c8c8c' }}>本周特有</span>
            <span style={{ fontWeight: 500, color: '#1890ff' }}>+¥{data?.weekSpecific ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#8c8c8c' }}>月预算聚合</span>
            <span style={{ fontWeight: 500 }}>¥{data?.monthBudgetAggregate ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#8c8c8c' }}>本月特有</span>
            <span style={{ fontWeight: 500, color: '#1890ff' }}>+¥{data?.monthSpecific ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '4px', background: '#fff', borderRadius: '4px', paddingLeft: '8px', paddingRight: '8px' }}>
            <span style={{ fontWeight: 600, color: '#262626' }}>总计</span>
            <span style={{ fontWeight: 700, color: '#1890ff', fontSize: '16px' }}>¥{data?.totalBudget ?? 0}</span>
          </div>
        </div>
      </div>

      <Divider />

      {/* 分类预算 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>分类预算</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(data?.categoryBudgets ?? []).map((category) => {
            const catColor = category.percentage >= 100 ? '#ff4d4f' :
              category.percentage >= 80 ? '#faad14' : '#52c41a';
            const catStatus = category.percentage >= 100 ? '超支' :
              category.percentage >= 80 ? '预警' : '正常';
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
                  <Tag color={category.percentage >= 100 ? 'error' : category.percentage >= 80 ? 'warning' : 'success'}>
                    {catStatus}
                  </Tag>
                </div>
                <Progress
                  percent={Math.min(category.percentage, 100)}
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
                    {category.percentage.toFixed(0)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

      <Divider />

      {/* 同步设置 */}
      <div>
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
    </Drawer>
  );
};

export default DetailDrawer;