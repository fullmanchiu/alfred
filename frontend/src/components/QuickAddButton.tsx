import { FloatButton } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 全局悬浮记账按钮
 * 点击后跳转到交易记录页面并打开记账弹窗
 */
const QuickAddButton = () => {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    // 跳转到交易记录页面，并带上参数表示要打开记账弹窗
    navigate('/finance/transactions?action=add');
  }, [navigate]);

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
      tooltip="快速记账"
      onClick={handleClick}
    />
  );
};

export default QuickAddButton;
