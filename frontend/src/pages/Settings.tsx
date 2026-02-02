import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Space, Alert, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { api } from '@/services/api';

interface ServiceStatus {
  name: string;
  status: string;
  url: string;
  message?: string;
}

interface SystemHealth {
  status: string;
  timestamp: number;
  services: ServiceStatus[];
}

const Settings = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemHealth();
    // 每 30 秒刷新一次
    const interval = setInterval(loadSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    try {
      setError(null);
      const data = await api.getSystemHealth();
      setHealth(data);
    } catch (err) {
      setError('无法获取系统健康状态');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'unhealthy':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Tag color="success" icon={<CheckCircleOutlined />}>健康</Tag>;
      case 'unhealthy':
        return <Tag color="error" icon={<CloseCircleOutlined />}>异常</Tag>;
      default:
        return <Tag color="warning" icon={<LoadingOutlined />}>未知</Tag>;
    }
  };

  const getOverallStatus = () => {
    if (!health) return null;
    switch (health.status) {
      case 'healthy':
        return <Alert message="系统运行正常" type="success" showIcon />;
      case 'degraded':
        return <Alert message="部分服务异常" type="warning" showIcon />;
      default:
        return <Alert message="系统状态未知" type="error" showIcon />;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 系统状态 */}
        <Card title="系统状态">
          {getOverallStatus()}
          {error && (
            <Alert
              message={error}
              type="error"
              style={{ marginTop: 16 }}
              showIcon
            />
          )}
        </Card>

        {/* 服务列表 */}
        <Card title="服务详情">
          <Descriptions column={1} bordered>
            {health?.services.map((service) => (
              <Descriptions.Item
                key={service.name}
                label={
                  <Space>
                    {getStatusIcon(service.status)}
                    <span style={{ fontWeight: 'bold' }}>
                      {service.name === 'backend' && '后端服务'}
                      {service.name === 'py-service' && 'Python 微服务'}
                      {service.name === 'frontend' && '前端服务'}
                    </span>
                  </Space>
                }
              >
                <Space direction="vertical" size="small">
                  {getStatusTag(service.status)}
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    {service.url}
                  </div>
                  {service.message && (
                    <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
                      {service.message}
                    </div>
                  )}
                </Space>
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>

        {/* 系统信息 */}
        <Card title="系统信息">
          <Descriptions column={1}>
            <Descriptions.Item label="最后更新">
              {health?.timestamp
                ? new Date(health.timestamp).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="刷新频率">
              30 秒
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </div>
  );
};

export default Settings;
