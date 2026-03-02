import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Space } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import StockChart from '@/components/StockChart';

const StockChartPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [stockName, setStockName] = useState<string>('');
  const [loadingName, setLoadingName] = useState(true);

  useEffect(() => {
    if (!code) return;

    const loadStockInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Loading stock info for:', code, 'token exists:', !!token);

        const response = await fetch(`/api/v1/stocks/${code}/overview`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('Response data:', result);
          if (result.success && result.data?.info) {
            setStockName(result.data.info.name);
          } else {
            // 使用代码作为名称
            setStockName(code || '');
          }
        } else {
          console.log('Response not OK, using code as name');
          setStockName(code || '');
        }
      } catch (err) {
        console.log('Error loading stock info:', err);
        // 出错时使用代码作为名称
        setStockName(code || '');
      } finally {
        setLoadingName(false);
      }
    };

    loadStockInfo();
  }, [code]);

  const handlePeriodChange = (_period: string) => {
    // StockChart组件处理周期切换
  };

  if (loadingName) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 顶部导航栏 */}
        <div style={{ marginBottom: 16 }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stocks/search')}>
              返回搜索
            </Button>
            <span style={{ fontSize: 18, fontWeight: 'bold' }}>
              {stockName || code} K线图
            </span>
            <Button icon={<SearchOutlined />} onClick={() => navigate('/stocks/search')}>
              搜索其他
            </Button>
          </Space>
        </div>

        {/* K线图表 */}
        <StockChart
          code={code || ''}
          name={stockName || code || ''}
          onPeriodChange={handlePeriodChange}
        />

        {/* 返回按钮 */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Space>
            <Button onClick={() => navigate('/stocks/search')}>
              返回搜索列表
            </Button>
            <Button onClick={() => navigate(`/stocks/detail/${code}`)}>
              查看详情
            </Button>
          </Space>
        </div>
      </Space>
    </div>
  );
};

export default StockChartPage;
