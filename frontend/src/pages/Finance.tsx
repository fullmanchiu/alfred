import { Card, Row, Col, Statistic, message, Spin } from 'antd';
import { WalletOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { useAccounts, useTransactions, useTodayStatistics } from '@/queries';
import type { Transaction } from '@/types';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TransactionDrawer from '@/components/TransactionDrawer';

const Finance = () => {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: transactionsResponse, isLoading: transactionsLoading } = useTransactions(0, 10);
  const recentTransactions = transactionsResponse?.content || [];
  const { data: todayStats = { income: 0, expense: 0, count: 0 }, isLoading: statsLoading } = useTodayStatistics();

  const isLoading = accountsLoading || transactionsLoading || statsLoading;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setSelectedTransaction(null);
  };

  const handleEdit = (_transaction: Transaction) => {
    message.info('编辑功能开发中');
  };

  const handleDelete = (_id: number) => {
    message.info('删除功能开发中');
  };

  // 计算总余额
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Loading状态
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', maxWidth: 'var(--container-max-width)', margin: '0 auto' }}>
      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="今日收支"
              prefix={<ArrowUpOutlined />}
              value={todayStats.income}
              suffix="¥"
              styles={{ content: { color: 'var(--color-success)' } }}
            />
            <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
              支出: ¥{todayStats.expense.toFixed(2)}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="本周预算"
              value={0}
              suffix="/ 0"
              styles={{ content: { color: 'var(--color-primary)' } }}
            />
            <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              🚧 预算功能开发中
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="账户总额"
              prefix={<WalletOutlined />}
              value={totalBalance}
              precision={2}
              suffix="¥"
              styles={{ content: { color: 'var(--color-primary)' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主内容区 - 左右分屏 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={24} lg={14} xl={14}>
          {/* 左侧区域 */}
          <Card title="预算进度" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🚧</div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)' }}>
                预算管理
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                功能开发中，即将上线
              </div>
            </div>
          </Card>

          <Card title="AI智能洞察">
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🤖</div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)' }}>
                AI智能洞察
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                基于您的消费习惯，提供智能分析
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={24} lg={10} xl={10}>
          {/* 右侧区域 */}
          <Card title="账户余额" style={{ marginBottom: 'var(--spacing-lg)' }}>
            {accounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)', opacity: 0.5 }}>💳</div>
                <div style={{ color: 'var(--color-text-tertiary)' }}>暂无账户</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {accounts.slice(0, 5).map(account => (
                  <div key={account.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--color-bg-layout)', borderRadius: 'var(--radius-md)' }}>
                    <span>{account.name}</span>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>¥{account.balance?.toFixed(2) || '0.00'}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="最近交易"
            extra={
              <a
                onClick={() => navigate('/finance/transactions')}
                style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}
              >
                查看全部 →
              </a>
            }
          >
            {recentTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)', opacity: 0.5 }}>📝</div>
                <div style={{ color: 'var(--color-text-tertiary)' }}>暂无交易记录</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {recentTransactions.slice(0, 5).map((t: Transaction) => (
                  <div
                    key={t.id}
                    onClick={() => handleTransactionClick(t)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: 'var(--spacing-sm)',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-layout)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{t.displayName || t.categoryName || '未分类'}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                        {dayjs(t.transactionDate).format('MM-DD HH:mm')}
                      </div>
                    </div>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {t.type === 'income' ? '+' : '-'}¥{t.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <TransactionDrawer
        visible={drawerVisible}
        transaction={selectedTransaction}
        onClose={handleDrawerClose}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Finance;
