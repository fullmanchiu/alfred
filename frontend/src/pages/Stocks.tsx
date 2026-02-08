import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  Table,
  Tag,
  Space,
  message,
  Modal,
  Descriptions,
  Spin,
  Statistic,
  Row,
  Col,
  Typography,
} from 'antd';
import { SearchOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '@/services/api';

const { Title, Paragraph, Text } = Typography;

interface Stock {
  id?: number;
  code: string;
  name: string;
  addedAt?: string;
}

const Stocks = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeModalVisible, setAnalyzeModalVisible] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadStocks();
    return () => {
      // 清理SSE连接
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const loadStocks = async () => {
    try {
      setLoading(true);
      const data = await api.getStocks();
      setStocks(data);
    } catch (error) {
      message.error('加载股票列表失败');
      // 如果API失败，使用空数组
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (code: string) => {
    setAnalyzing(true);
    setAnalyzeModalVisible(true);
    setAnalyzeResult(null);
    setStatusMessage('正在连接服务器...');
    setLlmResponse('');

    // 调用SSE流式分析
    cleanupRef.current = api.analyzeStockRealtime(
      code,
      (event: string, data: any) => {
        console.log('SSE Event:', event, data);

        if (event === 'status') {
          setStatusMessage(data);
        } else if (event === 'realtime') {
          setAnalyzeResult((prev: any) => ({
            ...prev,
            realtime_data: data,
          }));
          setStatusMessage('实时行情已获取');
        } else if (event === 'indicators') {
          // 数据结构: {trend: {...}, indicators: {...}}
          setAnalyzeResult((prev: any) => ({
            ...prev,
            technical_analysis: {
              trend: data.trend || {},
              indicators: data.indicators || {},
            },
          }));
          setStatusMessage('技术指标已计算');
        } else if (event === 'fundamental') {
          // 数据结构: {score: number, reasons: string[]}
          setAnalyzeResult((prev: any) => ({
            ...prev,
            fundamental_analysis: data,
          }));
          setStatusMessage('基本面分析已获取');
        } else if (event === 'llm') {
          // 追加LLM流式响应
          setLlmResponse((prev: string) => prev + data);
          setAnalyzeResult((prev: any) => ({
            ...prev,
            ai_report: prev?.ai_report + data || data,
          }));
          setStatusMessage('AI分析生成中...');
        }
      },
      (error: string) => {
        console.error('SSE Error:', error);
        message.error(`分析失败: ${error}`);
        setAnalyzing(false);
        setStatusMessage('分析失败');
      },
      () => {
        console.log('SSE Complete');
        setAnalyzing(false);
        setStatusMessage('分析完成');
        message.success('分析完成');
      }
    );
  };

  const handleDeleteStock = async (id: number, name: string) => {
    try {
      await api.deleteStock(id);
      message.success(`已删除 ${name}`);
      loadStocks();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<Stock> = [
    {
      title: '股票代码',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Text code>{code}</Text>,
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            size="small"
            onClick={() => handleAnalyze(record.code)}
          >
            分析
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: `确定要删除 ${record.name} 吗？`,
                onOk: async () => {
                  if (record.id) {
                    await handleDeleteStock(record.id, record.name);
                  }
                },
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 标题和搜索 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              📊 股票分析
            </Title>
            <Space>
              <Input
                placeholder="输入股票代码 (如: sh.600000)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onPressEnter={() => {
                  if (searchCode) {
                    handleAnalyze(searchCode);
                  }
                }}
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
              />
              <Button
                type="primary"
                onClick={() => {
                  if (searchCode) {
                    handleAnalyze(searchCode);
                  } else {
                    message.warning('请输入股票代码');
                  }
                }}
              >
                快速分析
              </Button>
            </Space>
          </div>

          {/* 说明文字 */}
          <Paragraph type="secondary">
            输入股票代码（如 sh.600000 或 sz.000001）进行技术分析、基本面分析和 AI 报告生成。
          </Paragraph>

          {/* 股票列表 */}
          <Table
            columns={columns}
            dataSource={stocks}
            loading={loading}
            rowKey="code"
            pagination={false}
          />
        </Space>
      </Card>

      {/* 分析结果弹窗 */}
      <Modal
        title={`股票分析 - ${analyzeResult?.stock_name || analyzeResult?.stock_code || searchCode}`}
        open={analyzeModalVisible}
        onCancel={() => setAnalyzeModalVisible(false)}
        footer={null}
        width={900}
      >
        {/* 分析进度 */}
        {analyzing && statusMessage && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text strong>分析进度</Text>
                {analyzing && <Spin size="small" />}
              </div>
              <Text type="secondary">{statusMessage}</Text>
            </Space>
          </div>
        )}

        {analyzing && !analyzeResult ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>正在分析中...</div>
          </div>
        ) : analyzeResult ? (
          <div>
            {/* 实时数据 */}
            <Card title="实时行情" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="当前价格"
                    value={analyzeResult.realtime_data?.price || 0}
                    precision={2}
                    prefix="¥"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="涨跌幅"
                    value={(analyzeResult.realtime_data?.change || 0)}
                    precision={2}
                    suffix="%"
                    styles={{
                      content: {
                        color: (analyzeResult.realtime_data?.change || 0) >= 0 ? '#cf1322' : '#3f8600',
                      },
                    }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic title="成交量" value={analyzeResult.realtime_data?.volume || 0} />
                </Col>
              </Row>
            </Card>

            {/* 技术分析 */}
            <Card title="技术分析" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="趋势">
                  <Tag color={analyzeResult.technical_analysis?.trend?.overall_signal === 'bullish' ? 'red' : analyzeResult.technical_analysis?.trend?.overall_signal === 'bearish' ? 'green' : 'default'}>
                    {analyzeResult.technical_analysis?.trend?.overall_signal_cn || '未知'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="MACD信号">
                  <Tag>{analyzeResult.technical_analysis?.trend?.macd_signal_cn || '未知'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="MA5">{analyzeResult.technical_analysis?.indicators?.ma_5?.toFixed(2) || '-'}</Descriptions.Item>
                <Descriptions.Item label="MA10">{analyzeResult.technical_analysis?.indicators?.ma_10?.toFixed(2) || '-'}</Descriptions.Item>
                <Descriptions.Item label="MA20">{analyzeResult.technical_analysis?.indicators?.ma_20?.toFixed(2) || '-'}</Descriptions.Item>
                <Descriptions.Item label="MACD">{analyzeResult.technical_analysis?.indicators?.macd?.toFixed(4) || '-'}</Descriptions.Item>
                <Descriptions.Item label="RSI">{analyzeResult.technical_analysis?.indicators?.rsi?.toFixed(2) || '-'}</Descriptions.Item>
                <Descriptions.Item label="KDJ_K">{analyzeResult.technical_analysis?.indicators?.kdj_k?.toFixed(2) || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 基本面分析 */}
            <Card title="基本面分析" size="small" style={{ marginBottom: 16 }}>
              <Statistic
                title="基本面评分"
                value={analyzeResult.fundamental_analysis?.score || 0}
                suffix="/ 100"
              />
              <div style={{ marginTop: 16 }}>
                <Text strong>评分理由：</Text>
                <ul>
                  {analyzeResult.fundamental_analysis?.reasons?.map((reason: string, index: number) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* AI 报告 */}
            {(analyzeResult.ai_report || llmResponse) && (
              <Card title="🤖 AI 分析报告" size="small">
                <Paragraph>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      maxHeight: 400,
                      overflowY: 'auto',
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                    }}
                  >
                    {llmResponse || analyzeResult.ai_report}
                    {analyzing && <span className="typing-cursor">|</span>}
                  </div>
                </Paragraph>
              </Card>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Stocks;
