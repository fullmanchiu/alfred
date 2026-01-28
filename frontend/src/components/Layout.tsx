import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import {
  HomeOutlined,
  AccountBookOutlined,
  TransactionOutlined,
  FolderOutlined,
  HeartOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  DollarOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { removeToken } from '@/utils/auth';
import type { MenuProps } from 'antd';
import VersionInfo from './VersionInfo';

const { Header, Content, Footer } = Layout;

interface AppLayoutProps {
  onLogout: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 顶部导航菜单项
  const topMenuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/'),
    },
    {
      key: 'records',
      label: '记账',
      icon: <TransactionOutlined />,
      children: [
        {
          key: '/records',
          label: '记账列表',
          icon: <AccountBookOutlined />,
          onClick: () => navigate('/records'),
        },
        {
          key: '/records/categories',
          label: '分类管理',
          icon: <FolderOutlined />,
          onClick: () => navigate('/records/categories'),
        },
        {
          key: '/records/accounts',
          label: '账户管理',
          icon: <DashboardOutlined />,
          onClick: () => navigate('/records/accounts'),
        },
        {
          key: '/records/budgets',
          label: '预算管理',
          icon: <DollarOutlined />,
          onClick: () => navigate('/records/budgets'),
        },
        {
          key: '/records/statistics',
          label: '统计分析',
          icon: <BarChartOutlined />,
          onClick: () => navigate('/records/statistics'),
        },
      ],
    },
    {
      key: 'cycling',
      label: '骑行',
      icon: <DashboardOutlined />,
      children: [
        {
          key: '/cycling',
          label: '活动列表',
          onClick: () => navigate('/cycling'),
        },
      ],
    },
    {
      key: 'health',
      label: '健康',
      icon: <HeartOutlined />,
      children: [
        {
          key: '/health',
          label: '健康概览',
          onClick: () => navigate('/health'),
        },
        {
          key: '/health/settings',
          label: '身体设置',
          onClick: () => navigate('/health/settings'),
        },
      ],
    },
  ];

  const handleLogout = () => {
    removeToken();
    onLogout();
    message.success('已退出登录');
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 999,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            marginRight: 48,
            cursor: 'pointer',
            color: '#1890ff',
          }}
          onClick={() => navigate('/')}
        >
          ALFRED
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={topMenuItems}
          style={{
            flex: 1,
            border: 'none',
          }}
        />

        {/* 用户头像 */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Avatar style={{ cursor: 'pointer', marginLeft: 16 }} icon={<UserOutlined />} />
        </Dropdown>
      </Header>

      {/* 内容区域 */}
      <Content
        style={{
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 64px - 70px)',
        }}
      >
        <Outlet />
      </Content>

      {/* 版本信息 */}
      <Footer style={{ background: '#f5f5f5', padding: '0' }}>
        <VersionInfo />
      </Footer>
    </Layout>
  );
};

export default AppLayout;
