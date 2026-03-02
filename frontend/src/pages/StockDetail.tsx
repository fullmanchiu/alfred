import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Descriptions, Statistic, Spin, Alert, Button, Tag, Space, message, Typography } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, PlusOutlined, BarChartOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { api } from '@/services/api';

const StockDetail = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [klines, setKlines] = useState<any[]>([]);

  const loadDetail = async () => {
    if (!code) return;

    try {
      setLoading(true);
      setError(null);

      // 并行加载详情和K线数据
      const [detailResponse, klineResponse] = await Promise.all([
        api.getStockDetail(code) as Promise<any>,
        fetch(`/api/v1/stocks/${code}/klines?limit=30`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json())
      ]);

      if (detailResponse.success) {
        setDetail(detailResponse.data);
      }

      if (klineResponse.success && klineResponse.data?.klines) {
        setKlines(klineResponse.data.klines);
      }
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [code]);

  const handleAddToWatchlist = async () => {
    if (!detail) return;
    try {
      await api.addStock(detail.info.code, detail.info.name);
      message.success('已添加到自选股');
    } catch (err) {
      message.error('添加失败');
    }
  };

  const handleViewChart = () => {
    navigate(`/stocks/chart/${code}`);
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
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

  if (!detail) {
    return null;
  }

  const { info, realtime, indicators } = detail;

  // 计算最近5天的涨跌情况
  const recentKlines = klines.slice(-5).reverse();
  const upDays = recentKlines.filter((k: any) => k.close > k.open).length;
  const downDays = recentKlines.length - upDays;
  // 计算期间涨跌幅
  const periodChangePercent = klines.length > 0
    ? ((klines[klines.length - 1].close - klines[0].open) / klines[0].open) * 100
    : 0;

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 头部 */}
        <Card>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space size="large">
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stocks/search')}>
                  返回搜索
                </Button>
                <h2 style={{ margin: 0 }}>{info.name} ({info.code})</h2>
                <Tag color={info.market === 'sh' ? 'red' : 'green'}>
                  {info.market === 'sh' ? '上海' : info.market === 'sz' ? '深圳' : info.market.toUpperCase()}
                </Tag>
                {info.industry && <Tag color="blue">{info.industry}</Tag>}
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<BarChartOutlined />} onClick={handleViewChart}>
                  完整图表
                </Button>
                <Button icon={<ReloadOutlined />} onClick={loadDetail}>刷新</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddToWatchlist}>
                  加入自选
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 基本信息 */}
        <Card title={<Space><InfoCircleOutlined /> 基本信息</Space>}>
          <Descriptions column={3} size="small">
            <Descriptions.Item label="股票代码">{info.code}</Descriptions.Item>
            <Descriptions.Item label="股票名称">{info.name}</Descriptions.Item>
            <Descriptions.Item label="所属市场">
              {info.market === 'sh' ? '上海证券交易所' : info.market === 'sz' ? '深圳证券交易所' : info.market}
            </Descriptions.Item>
            <Descriptions.Item label="行业">{info.industry || '-'}</Descriptions.Item>
            <Descriptions.Item label="数据状态">
              <Tag color={klines.length > 0 ? 'green' : 'orange'}>
                {klines.length > 0 ? `有${klines.length}条K线数据` : '暂无数据'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="最新日期">
              {klines.length > 0 ? new Date(klines[klines.length - 1].time).toLocaleDateString('zh-CN') : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 最近走势简报 */}
        {klines.length > 0 && (
          <Card title="最近5天走势">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="上涨天数"
                  value={upDays}
                  suffix={`/ ${recentKlines.length}天`}
                  valueStyle={{ color: upDays > downDays ? '#cf1322' : '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="最新价"
                  value={klines[klines.length - 1].close}
                  precision={2}
                  prefix="¥"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="期间涨跌"
                  value={periodChangePercent}
                  precision={2}
                  suffix="%"
                  valueStyle={{
                    color: klines[klines.length - 1].close > klines[0].open ? '#cf1322' : '#3f8600'
                  }}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* 实时行情数据 */}
        {realtime && Object.keys(realtime).length > 0 && (
          <Card title="实时行情">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="当前价"
                  value={realtime.price || 0}
                  precision={2}
                  prefix="¥"
                  valueStyle={{
                    color: (realtime.changePercent || 0) >= 0 ? '#cf1322' : '#3f8600',
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="涨跌幅"
                  value={realtime.changePercent || 0}
                  precision={2}
                  suffix="%"
                  valueStyle={{
                    color: (realtime.changePercent || 0) >= 0 ? '#cf1322' : '#3f8600',
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic title="今开价" value={realtime.open || 0} precision={2} prefix="¥" />
              </Col>
              <Col span={6}>
                <Statistic title="成交量" value={realtime.volume || 0} />
              </Col>
            </Row>
          </Card>
        )}

        {/* 技术指标 */}
        {indicators && (
          <Card title="技术指标">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="MA5" value={indicators.ma5 || '-'} precision={2} />
              </Col>
              <Col span={6}>
                <Statistic title="MA10" value={indicators.ma10 || '-'} precision={2} />
              </Col>
              <Col span={6}>
                <Statistic title="MA20" value={indicators.ma20 || '-'} precision={2} />
              </Col>
              <Col span={6}>
                <Statistic title="RSI" value={indicators.rsi || '-'} precision={2} />
              </Col>
            </Row>
          </Card>
        )}

        {/* 快速操作提示 */}
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text type="secondary">提示：</Typography.Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>点击上方"完整图表"按钮可查看完整的K线图表和技术分析</li>
              <li>K线图支持多种时间周期切换（1月、3月、6月、1年、全部）</li>
              <li>加入自选后可在"自选股"页面快速查看</li>
            </ul>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default StockDetail;
