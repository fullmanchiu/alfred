import { Card, Row, Col, Statistic, message, Spin, Tag } from 'antd';
import { WalletOutlined, ArrowUpOutlined, DollarOutlined } from '@ant-design/icons';
import { useAccounts, useTransactions, useTodayStatistics, useBudgetUsage, useRecentActivities } from '@/queries';
import type { Transaction } from '@/types';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TransactionDrawer from '@/components/TransactionDrawer';
import { api } from '@/services/api';

const Finance = () => {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: transactionsResponse, isLoading: transactionsLoading } = useTransactions(0, 10);
  const recentTransactions = transactionsResponse?.content || [];
  const { data: todayStats = { income: 0, expense: 0, count: 0 }, isLoading: statsLoading } = useTodayStatistics();
  // 只获取本周预算，不获取所有预算
  const { data: budgetUsage = [], isLoading: budgetsLoading } = useBudgetUsage('weekly');

  // 刷新最近活动的函数
  const { refetch: refetchActivities } = useRecentActivities(20);

  // 汇率状态
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({});
  const [ratesLoading, setRatesLoading] = useState(true);

  const isLoading = accountsLoading || transactionsLoading || statsLoading || budgetsLoading;

  // 加载主要货币汇率
  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        setRatesLoading(true);
        const currencies = ['USD', 'HKD', 'EUR', 'JPY', 'GBP'];
        const rates: { [key: string]: number } = {};

        // 并行获取所有汇率
        await Promise.all(
          currencies.map(async (currency) => {
            try {
              const rate = await api.getCurrentExchangeRate(currency, 'CNY');
              rates[currency] = rate.rate;
            } catch (error) {
              console.error(`Failed to load ${currency} rate:`, error);
            }
          })
        );

        setExchangeRates(rates);
      } catch (error) {
        console.error('Failed to load exchange rates:', error);
      } finally {
        setRatesLoading(false);
      }
    };

    loadExchangeRates();
  }, []);

  // 页面加载时立即刷新最近活动（确保使用新的排序）
  useEffect(() => {
    refetchActivities();
  }, [refetchActivities]);

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
    <>
      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Col xs={24} sm={12} md={6}>
          <Card styles={{ body: { padding: 'var(--spacing-lg)' } }}>
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
        <Col xs={24} sm={12} md={6}>
          <Card styles={{ body: { padding: 'var(--spacing-lg)' } }}>
            {budgetUsage.length === 0 ? (
              <>
                <Statistic
                  title="本周预算"
                  value={0}
                  suffix="/ 0"
                  styles={{ content: { color: 'var(--color-primary)' } }}
                />
                <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                  🚧 暂无预算设置
                </div>
              </>
            ) : (
              <>
                <Statistic
                  title="本周预算"
                  value={budgetUsage[0].budgetAmount}
                  precision={2}
                  prefix="¥"
                  suffix={`/ ${budgetUsage.length}个`}
                  styles={{ content: { color: 'var(--color-primary)' } }}
                />
                <div style={{ marginTop: 'var(--spacing-sm)' }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                    已用: ¥{budgetUsage[0].usedAmount.toFixed(2)} | 剩余: ¥{budgetUsage[0].remainingAmount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: budgetUsage[0].isNearLimit ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                    {budgetUsage[0].usagePercentage.toFixed(1)}%
                  </div>
                </div>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card styles={{ body: { padding: 'var(--spacing-lg)' } }}>
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
        <Col xs={24} sm={12} md={6}>
          <Card styles={{ body: { padding: 'var(--spacing-lg)' } }}>
            <Statistic
              title="实时汇率"
              prefix={<DollarOutlined />}
              value={Object.keys(exchangeRates).length}
              suffix="种"
              styles={{ content: { color: 'var(--color-warning)' } }}
            />
            <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {ratesLoading ? (
                <Spin size="small" />
              ) : (
                Object.entries(exchangeRates).slice(0, 3).map(([currency, rate]) => (
                  <Tag key={currency} color="blue" style={{ margin: 0, fontSize: '11px' }}>
                    {currency}/CNY: {rate.toFixed(4)}
                  </Tag>
                ))
              )}
              {Object.keys(exchangeRates).length > 3 && (
                <Tag color="default" style={{ margin: 0, fontSize: '11px' }}>
                  +{Object.keys(exchangeRates).length - 3}
                </Tag>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 主内容区 - 左右分屏 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={24} lg={14} xl={14}>
          {/* 左侧区域 */}
          <Card
            title="预算进度"
            styles={{ body: { padding: 'var(--spacing-lg)' } }}
            style={{ marginBottom: 'var(--spacing-lg)' }}
          >
            {budgetUsage.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)', opacity: 0.5 }}>💰</div>
                <div style={{ color: 'var(--color-text-tertiary)' }}>暂无预算</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {budgetUsage.slice(0, 3).map((budget) => {
                  const progressColor = budget.usagePercentage >= 100 ? 'var(--color-error)' :
                    budget.usagePercentage >= 80 ? 'var(--color-warning)' : 'var(--color-success)';
                  return (
                    <div
                      key={budget.budgetId}
                      style={{
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-bg-container)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>
                          {budget.categoryName}
                        </span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {budget.usagePercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          background: 'var(--color-bg-layout)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginBottom: 'var(--spacing-xs)',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(budget.usagePercentage, 100)}%`,
                            background: progressColor,
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          ¥{budget.usedAmount.toFixed(0)}
                        </span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          ¥{budget.budgetAmount.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div style={{ textAlign: 'center', marginTop: 'var(--spacing-sm)' }}>
                  <a
                    onClick={() => navigate('/finance/budgets')}
                    style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}
                  >
                    查看全部预算 →
                  </a>
                </div>
              </div>
            )}
          </Card>

          <Card title="AI智能洞察" styles={{ body: { padding: 'var(--spacing-lg)' } }}>
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
          <Card
            title="账户余额"
            styles={{ body: { padding: 'var(--spacing-lg)' } }}
            style={{ marginBottom: 'var(--spacing-lg)' }}
          >
            {accounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)', opacity: 0.5 }}>💳</div>
                <div style={{ color: 'var(--color-text-tertiary)' }}>暂无账户</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {accounts.slice(0, 5).map(account => (
                  <div
                    key={account.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: 'var(--spacing-md)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-bg-container)',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-layout)';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-container)';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <span>{account.name}</span>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>¥{account.balance?.toFixed(2) || '0.00'}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="最近交易"
            styles={{ body: { padding: 'var(--spacing-lg)' } }}
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
                      alignItems: 'center',
                      padding: 'var(--spacing-md)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-layout)';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
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
    </>
  );
};

export default Finance;
