import { Drawer, Descriptions, Button, Tag, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Transaction } from '@/types';
import dayjs from 'dayjs';

interface TransactionDrawerProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
}

const TransactionDrawer = ({ visible, transaction, onClose, onEdit, onDelete }: TransactionDrawerProps) => {
  if (!transaction) return null;

  const typeConfig = {
    expense: { text: '支出', color: 'red' },
    income: { text: '收入', color: 'green' },
    transfer: { text: '转账', color: 'blue' },
  };

  const { text, color } = typeConfig[transaction.type as keyof typeof typeConfig] || { text: transaction.type, color: 'default' };

  return (
    <Drawer
      title="交易详情"
      placement="right"
      width={480}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button icon={<EditOutlined />} onClick={() => onEdit(transaction)}>
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(transaction.id)}>
            删除
          </Button>
        </Space>
      }
    >
      <Descriptions column={1} bordered>
        <Descriptions.Item label="类型">
          <Tag color={color}>{text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="金额">
          ¥{transaction.amount.toFixed(2)}
        </Descriptions.Item>
        <Descriptions.Item label="分类">
          {transaction.categoryId || '未分类'}
        </Descriptions.Item>
        <Descriptions.Item label="账户">
          {transaction.fromAccountId || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="时间">
          {dayjs(transaction.transactionDate).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        {transaction.notes && (
          <Descriptions.Item label="备注">
            {transaction.notes}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Drawer>
  );
};

export default TransactionDrawer;
