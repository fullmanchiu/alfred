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
  Alert,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  BarChartOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '@/services/api';
import type { SyncTask } from '@/types';

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

  // 同步任务相关状态
  const [syncTasks, setSyncTasks] = useState<SyncTask[]>([]);
  const [syncTasksLoading, setSyncTasksLoading] = useState(false);
  const [syncingCodes, setSyncingCodes] = useState<Set<string>>(new Set());

  // 数据检查弹窗
  const [syncConfirmVisible, setSyncConfirmVisible] = useState(false);
  const [pendingAnalyzeCode, setPendingAnalyzeCode] = useState<string>('');
  const [dataCheckResult, setDataCheckResult] = useState<{
    hasData: boolean;
    klineCount: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    loadStocks();
    loadSyncTasks();
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

  const loadSyncTasks = async () => {
    try {
      setSyncTasksLoading(true);
      const tasks = await api.getSyncTasks();
      setSyncTasks(tasks);
    } catch (error) {
      console.error('加载同步任务失败', error);
    } finally {
      setSyncTasksLoading(false);
    }
  };

  // 检查股票数据
  const checkStockData = async (code: string): Promise<boolean> => {
    try {
      const result = await api.checkStockData(code);
      setDataCheckResult(result);
      return result.hasData;
    } catch (error) {
      console.error('检查股票数据失败', error);
      return false;
    }
  };

  // 同步股票数据
  const handleSyncStock = async (stockCode: string) => {
    const code = stockCode.replace(/^(sh\.|sz\.)/i, '');
    setSyncingCodes(prev => new Set(prev).add(code));

    try {
      const result = await api.syncStockByCode(code);
      if (result.success) {
        message.success(`同步成功，新增 ${result.recordsCount || 0} 条记录`);
        loadSyncTasks();
      } else {
        message.error(result.message || '同步失败');
      }
    } catch (error: any) {
      message.error(error.message || '同步失败');
    } finally {
      setSyncingCodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(code);
        return newSet;
      });
    }
  };

  // 开始分析（先检查数据）
  const handleAnalyze = async (code: string) => {
    const normalizedCode = code.replace(/^(sh\.|sz\.)/i, '');

    // 先检查数据是否存在
    const hasData = await checkStockData(normalizedCode);

    if (!hasData) {
      // 数据不存在，提示用户同步
      setPendingAnalyzeCode(normalizedCode);
      setSyncConfirmVisible(true);
      return;
    }

    // 数据存在，直接开始分析
    startAnalysis(normalizedCode);
  };

  // 开始SSE流式分析
  const startAnalysis = (code: string) => {
    setAnalyzing(true);
    setAnalyzeModalVisible(true);
    setAnalyzeResult(null);
    setStatusMessage('正在连接服务器...');
    setLlmResponse('');

    // 调用SSE流式分析
    cleanupRef.current = api.analyzeStockRealtime(
      code,
      (event: string, data: unknown) => {
        const eventData = data as Record<string, unknown>;

        if (event === 'status') {
          const status = String(data);
          setStatusMessage(status);
          // 当收到"分析完成"状态时，结束分析状态
          if (status === '分析完成') {
            setAnalyzing(false);
            message.success('分析完成');
          }
        } else if (event === 'realtime') {
          setAnalyzeResult((prev: Record<string, unknown>) => ({
            ...prev,
            realtime_data: data,
          }));
          setStatusMessage('实时行情已获取');
        } else if (event === 'indicators') {
          // 数据结构: {trend: {...}, indicators: {...}}
          setAnalyzeResult((prev: Record<string, unknown>) => ({
            ...prev,
            technical_analysis: {
              trend: eventData.trend || {},
              indicators: eventData.indicators || {},
            },
          }));
          setStatusMessage('技术指标已计算');
        } else if (event === 'fundamental') {
          // 数据结构: {score: number, reasons: string[]}
          setAnalyzeResult((prev: Record<string, unknown>) => ({
            ...prev,
            fundamental_analysis: data,
          }));
          setStatusMessage('基本面分析已获取');
        } else if (event === 'llm') {
          // 追加LLM流式响应
          const text = String(data);
          setLlmResponse((prev: string) => prev + text);
          setAnalyzeResult((prev: Record<string, unknown>) => ({
            ...prev,
            ai_report: (prev?.ai_report as string || '') + text,
          }));
          setStatusMessage('AI分析生成中...');
        } else if (event === 'error') {
          // 处理错误事件
          const errorData = eventData as { message?: string; type?: string };
          message.error(errorData.message || '分析失败');
          setAnalyzing(false);
          setStatusMessage('分析失败');
        } else if (event === 'done') {
          // 处理完成事件
          setAnalyzing(false);
          setStatusMessage('分析完成');
          message.success('分析完成');
        }
      },
      (error: string) => {
        message.error(`分析失败: ${error}`);
        setAnalyzing(false);
        setStatusMessage('分析失败');
      },
      () => {
        // SSE 流正常关闭时的回调
        setAnalyzing(false);
        setStatusMessage('分析完成');
      }
    );
  };

  // 同步后继续分析
  const handleSyncAndAnalyze = async () => {
    setSyncConfirmVisible(false);
    await handleSyncStock(pendingAnalyzeCode);
    // 同步完成后开始分析
    startAnalysis(pendingAnalyzeCode);
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

  // 同步任务表格列
  const syncTaskColumns: ColumnsType<SyncTask> = [
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      render: (code) => <Text code>{code}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap: Record<string, string> = {
          running: 'green',
          stopped: 'default',
          paused: 'orange',
          error: 'red',
        };
        const textMap: Record<string, string> = {
          running: '运行中',
          stopped: '已停止',
          paused: '已暂停',
          error: '错误',
        };
        return <Tag color={colorMap[status] || 'default'}>{textMap[status] || status}</Tag>;
      },
    },
    {
      title: '最后同步',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      render: (date, record) => {
        if (!date) return '-';
        const statusColor = record.lastSyncStatus === 'success' ? 'green' : 'red';
        return (
          <Tooltip title={`同步 ${record.lastSyncRecords || 0} 条记录`}>
            <span>
              {new Date(date).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {record.lastSyncStatus && (
                <Tag color={statusColor} style={{ marginLeft: 4, fontSize: 10 }}>
                  {record.lastSyncRecords || 0}条
                </Tag>
              )}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '累计记录',
      dataIndex: 'totalRecords',
      key: 'totalRecords',
      render: (count) => count?.toLocaleString() || 0,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => {
        const isSyncing = syncingCodes.has(record.stockCode);
        return (
          <Space>
            <Tooltip title="立即同步">
              <Button
                type="primary"
                icon={<SyncOutlined spin={isSyncing} />}
                size="small"
                loading={isSyncing}
                onClick={() => handleSyncStock(record.stockCode)}
              >
                同步
              </Button>
            </Tooltip>
            <Tooltip title="删除任务">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => {
                  Modal.confirm({
                    title: '确认删除',
                    content: `确定要删除 ${record.stockCode} 的同步任务吗？`,
                    onOk: async () => {
                      await api.deleteSyncTask(record.id);
                      message.success('删除成功');
                      loadSyncTasks();
                    },
                  });
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

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
      {/* 数据同步区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Title level={4} style={{ margin: 0 }}>
            🔄 数据同步
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            同步股票历史数据后才能进行技术分析。首次分析前请先同步数据。
          </Paragraph>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入股票代码 (如: 601985)"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.replace(/^(sh\.|sz\.)/i, ''))}
              onPressEnter={() => {
                if (searchCode) {
                  handleSyncStock(searchCode);
                }
              }}
              style={{ width: 'calc(100% - 120px)' }}
              prefix={<SearchOutlined />}
            />
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={() => {
                if (searchCode) {
                  handleSyncStock(searchCode);
                } else {
                  message.warning('请输入股票代码');
                }
              }}
            >
              立即同步
            </Button>
          </Space.Compact>
          <Table
            columns={syncTaskColumns}
            dataSource={syncTasks}
            loading={syncTasksLoading}
            rowKey="id"
            size="small"
            pagination={false}
            locale={{ emptyText: '暂无同步任务，输入股票代码后点击"立即同步"' }}
          />
        </Space>
      </Card>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 标题和搜索 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              📊 股票分析
            </Title>
            <Space>
              <Input
                placeholder="输入股票代码 (如: 600000)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.replace(/^(sh\.|sz\.)/i, ''))}
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
            输入股票代码（如 600000 或 000001）进行技术分析、基本面分析和 AI 报告生成。
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

      {/* 同步确认弹窗 */}
      <Modal
        title="数据未同步"
        open={syncConfirmVisible}
        onCancel={() => setSyncConfirmVisible(false)}
        onOk={handleSyncAndAnalyze}
        okText="立即同步并分析"
        cancelText="取消"
      >
        <Alert
          type="warning"
          message="该股票数据尚未同步"
          description={
            <div>
              <p>{dataCheckResult?.message || '需要先同步股票历史数据才能进行分析。'}</p>
              <p>同步将获取该股票近一年的历史K线数据。</p>
            </div>
          }
          showIcon
        />
      </Modal>

      {/* 分析结果弹窗 */}
      <Modal
        title={`股票分析 - ${analyzeResult?.realtime_data?.name || analyzeResult?.stock_code || searchCode}`}
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
