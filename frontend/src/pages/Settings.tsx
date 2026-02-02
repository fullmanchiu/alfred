import { useState, useEffect } from 'react';
import {
  Card,
  List,
  Switch,
  Space,
  Typography,
  Modal,
  message,
  Divider,
  Tag,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  ReloadOutlined,
  DeleteOutlined,
  MoonOutlined,
  NotificationOutlined,
  SyncOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { removeToken } from '@/utils/auth';

const { Text } = Typography;

const Settings = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
        message.success('已退出登录');
        navigate('/login');
      },
    });
  };

  const handleResetData = () => {
    Modal.confirm({
      title: '确认重置数据',
      content: '此操作将删除所有交易记录、预算和分类，然后恢复默认分类。此操作不可撤销。您确定要继续吗？',
      okText: '确认重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.resetUserData();
          message.success('数据已重置');
          loadSystemHealth();
        } catch (err) {
          message.error('重置失败');
        }
      },
    });
  };

  const settingsGroups = [
    {
      title: '系统状态',
      items: [
        {
          icon: <ReloadOutlined />,
          title: '服务状态',
          description: '查看后端和微服务运行状态',
          extra: (
            <Space direction="vertical" size="small" style={{ maxWidth: 200 }}>
              {health?.services?.map((service: any) => (
                <div key={service.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12 }}>
                    {service.name === 'backend' ? '后端' : 'Python 微服务'}
                  </Text>
                  <Tag
                    color={service.status === 'healthy' ? 'success' : 'error'}
                    style={{ fontSize: 10 }}
                  >
                    {service.status === 'healthy' ? '正常' : '异常'}
                  </Tag>
                </div>
              ))}
            </Space>
          ),
          onClick: loadSystemHealth,
        },
      ],
    },
    {
      title: '应用设置',
      items: [
        {
          icon: <MoonOutlined />,
          title: '深色模式',
          description: '切换应用主题',
          extra: (
            <Switch
              checked={darkMode}
              onChange={(checked) => {
                setDarkMode(checked);
                message.info('主题切换功能开发中...');
              }}
            />
          ),
        },
        {
          icon: <NotificationOutlined />,
          title: '推送通知',
          description: '接收运动提醒和通知',
          extra: (
            <Switch
              checked={notifications}
              onChange={setNotifications}
            />
          ),
        },
        {
          icon: <SyncOutlined />,
          title: '自动同步',
          description: '自动同步运动数据',
          extra: (
            <Switch
              checked={autoSync}
              onChange={setAutoSync}
            />
          ),
        },
      ],
    },
    {
      title: '安全设置',
      items: [
        {
          icon: <LockOutlined />,
          title: '修改密码',
          description: '更改您的登录密码',
          onClick: () => message.info('密码修改功能开发中...'),
        },
      ],
    },
    {
      title: '其他',
      items: [
        {
          icon: <InfoCircleOutlined />,
          title: '关于 Alfred',
          description: '版本信息和帮助',
          onClick: () => {
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
          },
        },
        {
          icon: <HeartOutlined />,
          title: '身体数据',
          description: '设置身高、体重等基础信息',
          onClick: () => navigate('/health/settings'),
        },
        {
          icon: <DeleteOutlined />,
          title: '重置数据',
          description: '清空所有业务数据，恢复到初始状态',
          danger: true,
          onClick: handleResetData,
        },
      ],
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 用户信息 */}
        <Card>
          <List.Item
            style={{ cursor: 'pointer', padding: '12px 0' }}
            onClick={() => navigate('/profile')}
          >
            <List.Item.Meta
              avatar={<UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
              title="个人资料"
              description="管理您的个人信息"
            />
          </List.Item>
        </Card>

        {/* 设置分组 */}
        {settingsGroups.map((group) => (
          <div key={group.title}>
            <Text
              type="secondary"
              strong
              style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {group.title}
            </Text>
            <Card style={{ marginTop: 8 }}>
              <List
                size="small"
                dataSource={group.items}
                renderItem={(item, index) => (
                  <div key={index}>
                    <List.Item
                      style={{
                        cursor: item.onClick ? 'pointer' : 'default',
                        padding: '12px 0',
                      }}
                      onClick={item.onClick}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{ fontSize: 20, color: item.danger ? '#ff4d4f' : '#1890ff' }}>
                            {item.icon}
                          </div>
                        }
                        title={
                          <Text style={{ color: item.danger ? '#ff4d4f' : undefined }}>
                            {item.title}
                          </Text>
                        }
                        description={item.description}
                      />
                      {item.extra}
                    </List.Item>
                    {index < group.items.length - 1 && <Divider style={{ margin: '8px 0' }} />}
                  </div>
                )}
              />
            </Card>
          </div>
        ))}

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
