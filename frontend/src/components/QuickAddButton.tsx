import { FloatButton } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// 页面配置：路径匹配规则和对应的添加行为
const PAGE_CONFIG = [
  {
    pattern: /^\/finance\/transactions/,
    path: '/finance/transactions',
    tooltip: '记一笔',
  },
  {
    pattern: /^\/finance\/fund-accounts/,
    path: '/finance/fund-accounts',
    tooltip: '添加账户',
  },
  {
    pattern: /^\/finance\/categories/,
    path: '/finance/categories',
    tooltip: '添加分类',
  },
  {
    pattern: /^\/finance\/budgets/,
    path: '/finance/budgets',
    tooltip: '添加预算',
  },
  {
    pattern: /^\/cycling/,
    path: '/cycling',
    tooltip: '添加骑行',
  },
  {
    pattern: /^\/health/,
    path: '/health',
    tooltip: '添加记录',
  },
];

// 默认配置：跳转到交易记录
const DEFAULT_CONFIG = {
  path: '/finance/transactions',
  tooltip: '快速记账',
};

/**
 * 全局悬浮添加按钮
 * 根据当前页面智能判断添加内容
 */
const QuickAddButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 根据当前路径获取配置
  const config = useMemo(() => {
    return PAGE_CONFIG.find(c => c.pattern.test(location.pathname)) || DEFAULT_CONFIG;
  }, [location.pathname]);

  const handleClick = useCallback(() => {
    // 跳转到对应页面并带上参数表示要打开添加弹窗
    navigate(`${config.path}?action=add`);
  }, [navigate, config.path]);

  return (
    <FloatButton
      icon={<PlusOutlined />}
      type="primary"
      style={{
        right: 24,
        bottom: 80,
        width: 56,
        height: 56,
      }}
      tooltip={config.tooltip}
      onClick={handleClick}
    />
  );
};

export default QuickAddButton;
