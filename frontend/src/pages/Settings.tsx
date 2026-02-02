import { useState, useEffect } from 'react';
import { Card, List, Tag, Space, Spin, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '@/services/api';

const { Text } = Typography;

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

  useEffect(() => {
    loadSystemHealth();
    // 每 30 秒刷新一次
    const interval = setInterval(loadSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    try {
      const data = await api.getSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('无法获取系统健康状态', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Tag color="success" icon={<CheckCircleOutlined />}>正常</Tag>;
      case 'unhealthy':
        return <Tag color="error" icon={<CloseCircleOutlined />}>异常</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  const getServiceName = (name: string) => {
    switch (name) {
      case 'backend':
        return '后端服务';
      case 'py-service':
        return 'Python 微服务';
      default:
        return name;
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <Card
        title="系统状态"
        extra={
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {health?.timestamp
                ? new Date(health.timestamp).toLocaleTimeString('zh-CN')
                : '-'}
            </Text>
            <ReloadOutlined
              style={{ cursor: 'pointer' }}
              onClick={loadSystemHealth}
            />
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin />
          </div>
        ) : (
          <List
            size="small"
            dataSource={health?.services || []}
            renderItem={(service) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <span>{getServiceName(service.name)}</span>
                      {getStatusTag(service.status)}
                    </Space>
                  }
                  description={
                    service.message ? (
                      <Text type="danger">{service.message}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {service.url}
                      </Text>
                    )
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default Settings;
