import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, message } from 'antd';
import {
  AccountBookOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { api } from '@/services/api';
import type { Account, Transaction as Record } from '@/types';
import dayjs from 'dayjs';

const Dashboard = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentRecords, setRecentRecords] = useState<Record[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsData, transactionsData] = await Promise.all([
        api.getAccounts(),
        api.getTransactions({ current: 1, pageSize: 5 }),
      ]);

      console.log('账户数据:', accountsData);
      console.log('记账数据:', transactionsData);

      setAccounts(accountsData);
      setTotalBalance(accountsData.reduce((sum: number, a: any) => sum + (a.balance || 0), 0));

      // 转换记账数据 - 直接使用数组
      if (Array.isArray(transactionsData)) {
        setRecentRecords(transactionsData.slice(0, 5));
      } else if (transactionsData.content) {
        setRecentRecords(transactionsData.content);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const recordColumns = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config = {
          expense: { color: 'red', text: '支出' },
          income: { color: 'green', text: '收入' },
          transfer: { color: 'blue', text: '转账' },
        };
        const { color, text } = config[type as keyof typeof config] || { color: 'default', text: type };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: Record) => (
        <span style={{ color: record.type === 'expense' ? 'red' : 'green' }}>
          {record.type === 'expense' ? '-' : '+'}¥{amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      key: 'categoryId',
      render: (categoryId: number) => <Tag>#{categoryId}</Tag>,
    },
  ];

  return (
    <div>
      <Row gutter={16}>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="总资产"
              value={totalBalance}
              precision={2}
              prefix={<WalletOutlined />}
              suffix="¥"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="账户数"
              value={accounts.length}
              prefix={<AccountBookOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="本月记账"
              value={recentRecords.length}
              suffix="笔"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="近期记账"
        style={{ marginTop: 16 }}
      >
        <Table
          columns={recordColumns}
          dataSource={recentRecords}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
