import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import {
  HomeOutlined,
  HeartOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  SettingOutlined,
  LineChartOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearAuthTokens } from '@/utils/auth';
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
      key: 'finance-submenu',
      label: '财务',
      icon: <WalletOutlined />,
      onTitleClick: () => navigate('/finance'),
      children: [
        {
          key: '/finance/categories',
          label: '分类管理',
          onClick: () => navigate('/finance/categories'),
        },
        {
          key: '/finance/fund-accounts',
          label: '资金账户',
          onClick: () => navigate('/finance/fund-accounts'),
        },
        {
          key: '/finance/budgets',
          label: '预算管理',
          onClick: () => navigate('/finance/budgets'),
        },
        {
          key: '/finance/statistics',
          label: '统计分析',
          onClick: () => navigate('/finance/statistics'),
        },
        {
          key: '/finance/transactions',
          label: '交易记录',
          onClick: () => navigate('/finance/transactions'),
        },
      ],
    },
    {
      key: '/cycling',
      label: '骑行',
      icon: <DashboardOutlined />,
      onClick: () => navigate('/cycling'),
    },
    {
      key: 'health-submenu',
      label: '健康',
      icon: <HeartOutlined />,
      onTitleClick: () => navigate('/health'),
      children: [
        {
          key: '/health/settings',
          label: '身体设置',
          onClick: () => navigate('/health/settings'),
        },
      ],
    },
    {
      key: '/stocks',
      label: '股票',
      icon: <LineChartOutlined />,
      onClick: () => navigate('/stocks'),
    },
  ];

  const handleLogout = () => {
    clearAuthTokens();
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
          background: 'var(--color-bg-elevated)',
          borderBottom: '0.0625rem solid var(--color-border-secondary)',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 999,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 'var(--font-size-xxl)',
            fontWeight: 'var(--font-weight-bold)',
            marginRight: '3rem',
            cursor: 'pointer',
            color: 'var(--color-primary)',
          }}
          onClick={() => navigate('/')}
        >
          ALFRED
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="horizontal"
          triggerSubMenuAction="hover"
          selectedKeys={[location.pathname]}
          items={topMenuItems}
          style={{
            flex: 1,
            border: 'none',
          }}
        />

        {/* 用户头像 */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Avatar style={{ cursor: 'pointer', marginLeft: '1rem' }} icon={<UserOutlined />} />
        </Dropdown>
      </Header>

      {/* 内容区域 */}
      <Content
        style={{
          background: 'var(--color-bg-layout)',
          minHeight: 'calc(100vh - 4rem - 4.375rem)',
        }}
      >
        <Outlet />
      </Content>

      {/* 版本信息 */}
      <Footer style={{ background: 'var(--color-bg-layout)', padding: '0' }}>
        <VersionInfo />
      </Footer>
    </Layout>
  );
};

export default AppLayout;
