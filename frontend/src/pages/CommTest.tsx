import { useState } from 'react';
import { Card, Input, Button, message, Typography, Space, Divider } from 'antd';
import { api } from '@/services/api';

const { Title, Text, Paragraph } = Typography;

const CommTest = () => {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);

    if (isNaN(numA) || isNaN(numB)) {
      message.error('请输入有效的数字');
      return;
    }

    setLoading(true);
    console.log('[FRONTEND] 发送请求: POST /api/calculator/add', { a: numA, b: numB });

    try {
      const response = await api.calculatorAdd(numA, numB);
      console.log('[FRONTEND] 收到响应:', response);

      if (response.success) {
        setResult(response.result);
        message.success(response.message || '计算成功');
      } else {
        message.error(response.message || '计算失败');
      }
    } catch (error: any) {
      console.error('[FRONTEND] 请求失败:', error);
      message.error('请求失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Title level={4}>WebSocket 通讯测试</Title>

          <Paragraph type="secondary">
            测试 Java → WebSocket → Python 通讯链路
          </Paragraph>

          <Divider />

          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>数字 A:</Text>
            <Input
              placeholder="输入第一个数字"
              value={a}
              onChange={(e) => setA(e.target.value)}
              type="number"
              size="large"
            />
          </Space>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>数字 B:</Text>
            <Input
              placeholder="输入第二个数字"
              value={b}
              onChange={(e) => setB(e.target.value)}
              type="number"
              size="large"
            />
          </Space>

          <Button
            type="primary"
            size="large"
            block
            onClick={handleAdd}
            loading={loading}
          >
            计算 A + B
          </Button>

          {result !== null && (
            <Card style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>计算结果:</Text>
                <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                  {a} + {b} = {result}
                </Title>
              </Space>
            </Card>
          )}

          <Divider />

          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            <Text strong>通讯链路:</Text><br />
            前端 → POST /api/calculator/add → Java → WebSocket → Python → 处理 → 返回
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
};

export default CommTest;
