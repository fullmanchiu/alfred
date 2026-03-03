import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Space, Typography, Spin, Alert, Button, message } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import DynamicProfessionalStockChart from '@/components/DynamicProfessionalStockChart';
import './StockDetailDesigns.css';

const { Text } = Typography;

const StockDetail = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!code) return;

    try {
      setLoading(true);
      setError(null);

      const detailResponse = await api.getStockDetail(code) as any;

      if (detailResponse.success) {
        setDetail(detailResponse.data);
      } else {
        setError('加载失败');
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

  const { info, klines } = detail;

  // 从最新K线数据计算实时行情
  const latestKline = klines && klines.length > 0 ? klines[klines.length - 1] : null;
  const previousKline = klines && klines.length > 1 ? klines[klines.length - 2] : null;

  const currentPrice = latestKline?.close || 0;
  const previousPrice = previousKline?.close || latestKline?.open || currentPrice;
  const change = currentPrice - previousPrice;
  const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

  const getColor = (value: number) => (value >= 0 ? '#ef5350' : '#26a69a');
  const getIcon = (value: number) => (value >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />);

  const displayRealtime = {
    price: currentPrice,
    change: change,
    changePercent: changePercent,
    open: latestKline?.open || 0,
    high: latestKline?.high || 0,
    low: latestKline?.low || 0,
    volume: latestKline?.volume || 0,
    amount: latestKline?.amount || (latestKline?.volume || 0) * currentPrice,
  };

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh', width: '100%', maxWidth: 'none' }}>
      <div className="simple-detail-page" style={{ margin: 0 }}>
      {/* 简洁头部 */}
      <Card className="detail-header">
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="middle">
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stocks/search')} size="small" />
              <span className="stock-name">{info.name}</span>
              <span className="stock-code">{info.code}</span>
              <Tag color={info.market === 'sh' ? 'red' : 'green'}>
                {info.market === 'sh' ? '沪' : '深'}
              </Tag>
              {info.industry && <Tag color="blue">{info.industry}</Tag>}
            </Space>
          </Col>
          <Col>
            <Space size="large">
              <div className="price-section">
                <div className="current-price" style={{ color: getColor(displayRealtime.changePercent) }}>
                  {displayRealtime.price ? displayRealtime.price.toFixed(2) : '-'}
                </div>
                <div className="price-change" style={{ color: getColor(displayRealtime.changePercent) }}>
                  {getIcon(displayRealtime.changePercent)} {displayRealtime.changePercent ? displayRealtime.changePercent.toFixed(2) : '0.00'}%
                </div>
              </div>
              <Space size="small">
                <Button icon={<ReloadOutlined />} onClick={loadDetail} size="small">刷新</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddToWatchlist} size="small">
                  加入自选
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 核心数据网格 */}
      <Row gutter={12} className="core-data-grid">
        <Col span={4}>
          <div className="data-cell">
            <Text type="secondary">今开</Text>
            <div>{displayRealtime.open ? displayRealtime.open.toFixed(2) : '-'}</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="data-cell">
            <Text type="secondary">最高</Text>
            <div className="up">{displayRealtime.high ? displayRealtime.high.toFixed(2) : '-'}</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="data-cell">
            <Text type="secondary">最低</Text>
            <div className="down">{displayRealtime.low ? displayRealtime.low.toFixed(2) : '-'}</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="data-cell">
            <Text type="secondary">成交量</Text>
            <div>{displayRealtime.volume ? (displayRealtime.volume / 10000).toFixed(0) + '万手' : '-'}</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="data-cell">
            <Text type="secondary">成交额</Text>
            <div>{displayRealtime.amount ? (displayRealtime.amount / 100000000).toFixed(2) + '亿' : '-'}</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="data-cell">
            <Text type="secondary">振幅</Text>
            <div>{displayRealtime.open && displayRealtime.high && displayRealtime.low ? ((displayRealtime.high - displayRealtime.low) / displayRealtime.open * 100).toFixed(1) + '%' : '-'}</div>
          </div>
        </Col>
      </Row>

      {/* 专业K线图表 */}
      <Card className="chart-card">
        <DynamicProfessionalStockChart code={code || ''} />
      </Card>
      </div>
    </div>
  );
};

export default StockDetail;
