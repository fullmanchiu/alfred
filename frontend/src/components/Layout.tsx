import { Layout, Menu, Avatar, Dropdown, message, Drawer, Button } from 'antd';
import {
  HomeOutlined,
  HeartOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  SettingOutlined,
  LineChartOutlined,
  WalletOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearAuthTokens, clearAllCaches } from '@/utils/auth';
import type { MenuProps } from 'antd';
import VersionInfo from './VersionInfo';
import { useState, useEffect } from 'react';

const { Header, Content, Footer } = Layout;

interface AppLayoutProps {
  onLogout: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    clearAllCaches(); // 清除所有 Query 缓存
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
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-bg-elevated)',
          borderBottom: '0.0625rem solid var(--color-border-secondary)',
          padding: isMobile ? '0 1rem' : '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 999,
          height: isMobile ? '3.5rem' : '4rem',
          lineHeight: isMobile ? '3.5rem' : '4rem',
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: isMobile ? 'var(--font-size-xl)' : 'var(--font-size-xxl)',
            fontWeight: 'var(--font-weight-bold)',
            marginRight: isMobile ? '1rem' : '3rem',
            cursor: 'pointer',
            color: 'var(--color-primary)',
            flexShrink: 0,
          }}
          onClick={() => navigate('/')}
        >
          ALFRED
        </div>

        {/* 移动端菜单按钮 */}
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(true)}
            style={{ marginRight: '0.5rem' }}
          />
        )}

        {/* PC端导航菜单 */}
        {!isMobile && (
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
        )}

        {/* 用户头像 */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Avatar
            style={{
              cursor: 'pointer',
              marginLeft: isMobile ? 'auto' : '1rem',
              flexShrink: 0,
            }}
            icon={<UserOutlined />}
          />
        </Dropdown>
      </Header>

      {/* 移动端抽屉菜单 */}
      <Drawer
        title="菜单"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        size={280}
        styles={{
          body: { padding: 0 },
        }}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={topMenuItems}
          style={{ border: 'none' }}
          onClick={({ key }) => {
            navigate(key);
            setDrawerVisible(false);
          }}
        />
      </Drawer>

      {/* 内容区域 */}
      <Content
        style={{
          background: 'var(--color-bg-layout)',
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          padding: isMobile ? '1rem' : '1.5rem',
          maxWidth: location.pathname === '/' ? 'none' : '75rem',
          margin: location.pathname === '/' ? '0' : '0 auto',
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Outlet />
        </div>
      </Content>

      {/* 版本信息 */}
      <Footer style={{ background: 'var(--color-bg-layout)', padding: '0' }}>
        <VersionInfo />
      </Footer>
    </Layout>
  );
};

export default AppLayout;
