import { useState, useEffect } from 'react';
import {
  Card,
  List,
  Switch,
  Space,
  Typography,
  Modal,
  Divider,
  Tag,
} from 'antd';
import {
  LogoutOutlined,
  ReloadOutlined,
  MoonOutlined,
  NotificationOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { removeToken } from '@/utils/auth';

const { Text } = Typography;

const Settings = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<any>(null);

  // 应用设置状态
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    try {
      const data = await api.getSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('无法获取系统健康状态', err);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        removeToken();
        navigate('/login');
      },
    });
  };

  const handleShowAbout = () => {
    Modal.info({
      title: 'Alfred',
      content: (
        <div>
          <p>专业的个人数据管理平台</p>
          <Divider style={{ margin: '12px 0' }} />
          <p>功能特点：</p>
          <p>• 记账和财务管理</p>
          <p>• 骑行运动数据管理</p>
          <p>• 健康数据追踪</p>
          <p>• 股票分析</p>
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary">© 2024 Alfred Team</Text>
        </div>
      ),
    });
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 系统状态 */}
        <Text
          type="secondary"
          strong
          style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          系统状态
        </Text>
        <Card>
          <List
            size="small"
            dataSource={[
              {
                title: '服务状态',
                description: '点击刷新服务状态',
                onClick: loadSystemHealth,
              },
            ]}
            renderItem={(item) => (
              <List.Item
                style={{ cursor: 'pointer', padding: '12px 0' }}
                onClick={item.onClick}
              >
                <List.Item.Meta
                  avatar={<ReloadOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                  title={item.title}
                  description={
                    <Space direction="vertical" size="small" style={{ marginTop: 8 }}>
                      {health?.services?.map((service: any) => (
                        <div key={service.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 12 }}>
                            {service.name === 'backend' ? '后端' : 'Python 微服务'}
                          </Text>
                          <Tag
                            color={service.status === 'healthy' ? 'success' : 'error'}
                            icon={service.status === 'healthy' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                            style={{ fontSize: 10, margin: 0 }}
                          >
                            {service.status === 'healthy' ? '正常' : '异常'}
                          </Tag>
                        </div>
                      ))}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        {/* 应用设置 */}
        <Text
          type="secondary"
          strong
          style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          应用设置
        </Text>
        <Card>
          <List size="small">
            <List.Item style={{ padding: '12px 0' }}>
              <List.Item.Meta
                avatar={<MoonOutlined style={{ fontSize: 20, color: '#722ed1' }} />}
                title="深色模式"
                description="切换应用主题"
              />
              <Switch
                checked={darkMode}
                onChange={(checked) => {
                  setDarkMode(checked);
                  Modal.info({
                    title: '主题切换',
                    content: '深色模式功能开发中...',
                  });
                }}
              />
            </List.Item>
            <Divider style={{ margin: '8px 0' }} />
            <List.Item style={{ padding: '12px 0' }}>
              <List.Item.Meta
                avatar={<NotificationOutlined style={{ fontSize: 20, color: '#fa8c16' }} />}
                title="推送通知"
                description="接收运动提醒和通知"
              />
              <Switch checked={notifications} onChange={setNotifications} />
            </List.Item>
            <Divider style={{ margin: '8px 0' }} />
            <List.Item style={{ padding: '12px 0' }}>
              <List.Item.Meta
                avatar={<SyncOutlined style={{ fontSize: 20, color: '#52c41a' }} />}
                title="自动同步"
                description="自动同步运动数据"
              />
              <Switch checked={autoSync} onChange={setAutoSync} />
            </List.Item>
          </List>
        </Card>

        {/* 关于 */}
        <Text
          type="secondary"
          strong
          style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          关于
        </Text>
        <Card>
          <List size="small">
            <List.Item
              style={{ cursor: 'pointer', padding: '12px 0' }}
              onClick={handleShowAbout}
            >
              <List.Item.Meta
                avatar={<InfoCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                title="关于 Alfred"
                description="版本信息和帮助"
              />
            </List.Item>
          </List>
        </Card>

        {/* 退出登录 */}
        <Card>
          <List.Item
            style={{ cursor: 'pointer', padding: '12px 0' }}
            onClick={handleLogout}
          >
            <List.Item.Meta
              avatar={<LogoutOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />}
              title={<Text type="danger">退出登录</Text>}
              description="安全退出您的账户"
            />
          </List.Item>
        </Card>

        {/* 版本信息 */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Alfred v1.0.0
          </Text>
        </div>
      </Space>
    </div>
  );
};

export default Settings;
