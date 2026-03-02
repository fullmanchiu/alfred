import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, message, Card, Typography, Popconfirm } from 'antd';
import { SearchOutlined, BarChartOutlined, ClockCircleOutlined, ClearOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { StockSearchItem } from '@/types/stock';

const { Title } = Typography;

const StockSearch = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // 加载搜索历史
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const response = await api.getStockSearchHistory(10) as any;
      if (response.success) {
        setRecentSearches(response.data?.histories || []);
      }
    } catch (error) {
      // 未登录或其他错误，忽略
      console.log('Failed to load search history:', error);
    }
  };

  // 搜索股票
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      setStocks([]);
      return;
    }

    try {
      setLoading(true);
      const response = await api.getStockSearch(keyword) as any;
      if (response.success) {
        setStocks(response.data?.stocks || []);
        // 重新加载搜索历史
        loadSearchHistory();
      }
    } catch (error) {
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 清空搜索框
  const handleClear = () => {
    setSearchCode('');
    setStocks([]);
  };

  // 清空搜索历史
  const handleClearHistory = async () => {
    try {
      await api.clearStockSearchHistory();
      setRecentSearches([]);
      message.success('已清空搜索历史');
    } catch (error) {
      message.error('清空失败');
    }
  };

  // 点击最近搜索
  const handleRecentSearch = (keyword: string) => {
    setSearchCode(keyword);
    handleSearch(keyword);
  };

  // 查看图表
  const handleViewChart = (code: string) => {
    navigate(`/stocks/chart/${code}`);
  };

  // 查看详情
  const handleViewDetail = (code: string) => {
    navigate(`/stocks/detail/${code}`);
  };

  const columns: ColumnsType<StockSearchItem> = [
    {
      title: '代码',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '市场',
      dataIndex: 'market',
      key: 'market',
      render: (market) => (market === 'sh' ? '上海' : market === 'sz' ? '深圳' : market),
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            size="small"
            onClick={() => handleViewChart(record.code)}
          >
            图表
          </Button>
          <Button
            size="small"
            onClick={() => handleViewDetail(record.code)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Title level={3}>股票搜索</Title>

          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入股票代码或名称（如：600000、浦发银行）"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onPressEnter={() => handleSearch(searchCode)}
              style={{ width: 'calc(100% - 160px)' }}
              prefix={<SearchOutlined />}
              suffix={searchCode && <Button type="text" size="small" icon={<ClearOutlined />} onClick={handleClear} />}
              allowClear
            />
            <Button
              type="primary"
              onClick={() => handleSearch(searchCode)}
              loading={loading}
            >
              搜索
            </Button>
          </Space.Compact>

          {/* 最近搜索 */}
          {!searchCode && recentSearches.length > 0 && !stocks.length && (
            <div>
              <Space style={{ marginBottom: 8 }}>
                <ClockCircleOutlined />
                <span>最近搜索：</span>
                <Popconfirm
                  title="确定清空搜索历史？"
                  onConfirm={handleClearHistory}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                  >
                    清空
                  </Button>
                </Popconfirm>
              </Space>
              <Space wrap>
                {recentSearches.map(keyword => (
                  <Tag
                    key={keyword}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleRecentSearch(keyword)}
                  >
                    {keyword}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* 搜索结果 */}
          {stocks.length > 0 && (
            <Table
              columns={columns}
              dataSource={stocks}
              loading={loading}
              rowKey="code"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          )}

          {/* 空状态提示 */}
          {!loading && stocks.length === 0 && searchCode && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              未找到匹配的股票，请检查输入的代码或名称
            </div>
          )}

          {!searchCode && stocks.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              请输入股票代码或名称进行搜索
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default StockSearch;
