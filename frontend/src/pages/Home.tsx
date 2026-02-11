import { Card, Timeline, Tag, Empty } from 'antd';
import AIChat from '@/components/AIChat';
import { IconDisplay } from '@/components/IconDisplay';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { useRecentActivities } from '@/queries/useDashboard';
import { useTranslation } from 'react-i18next';
import type { RecentActivity } from '@/types';
import type { Currency } from '@/types';
import { getCurrencySymbol } from '@/utils/currency';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { useState, useEffect } from 'react';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 统一的 Timeline 数据类型
type TimelineItemType = 'transaction' | 'transfer' | 'balance_adjustment' | 'activity' | 'health' | 'stock_analysis';

interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  description?: string;
  amount?: number;
  icon: string; // Material Icon 名称或 emoji
  iconColor?: string; // 图标颜色（仅对 Material Icons 有效）
  tags: Array<{ text: string; color: string }>;
  timestamp: string;
}

const Home = () => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 使用 React Query 获取最近活动（带缓存）
  const { data: activities = [], isLoading, error } = useRecentActivities(20);

  /**
   * 将 RecentActivity 转换为 TimelineItem
   */
  const convertToTimelineItem = (activity: RecentActivity): TimelineItem | null => {
    const { id, transactionType, categoryName, categoryIcon, accountName, institutionName, currency, amount, notes,
            activityType, activityName, distance, duration, weight, timestamp, isBalanceAdjustment } = activity;

    // 交易类型
    if (transactionType) {
      // 判断交易性质：expense=支出，income=收入，其他需要看情况
      const isExpense = transactionType === 'expense';
      const isInflow = transactionType === 'income';
      const isAdjustment = isBalanceAdjustment || !categoryName;

      let iconName: string;
      let iconColor: string;
      let title: string;
      let type: TimelineItemType;

      if (isAdjustment) {
        iconName = isInflow ? 'add_circle' : 'remove_circle';
        iconColor = '#1890ff';
        title = isInflow ? t('transactions.typeCodes.balance_increase') : t('transactions.typeCodes.balance_decrease');
        type = 'balance_adjustment';
      } else {
        iconName = categoryIcon || (isExpense ? 'trending_down' : 'trending_up');
        iconColor = isExpense ? 'var(--color-error)' : 'var(--color-success)';
        title = categoryName || t('categories.uncategorized');
        type = 'transaction';
      }

      // 构建 tags：金融机构、账户名称、币种
      const tags: Array<{ text: string; color: string }> = [];
      if (institutionName) {
        tags.push({ text: institutionName, color: 'lime' });
      }
      if (accountName) {
        tags.push({ text: accountName, color: 'cyan' });
      }
      if (currency) {
        tags.push({ text: currency, color: 'gold' });
      }

      return {
        id: `txn-${id}`,
        type,
        title,
        description: notes,
        amount,
        icon: iconName,
        iconColor,
        tags,
        timestamp,
      };
    }

    // 骑行活动
    if (activityType && (distance || duration)) {
      return {
        id: `activity-${id}`,
        type: 'activity',
        title: activityName || t('activities.cycling'),
        description: `${distance || 0}km · ${duration || 0}${t('common.minutes')}`,
        icon: '🚴',
        tags: [{ text: activityType, color: 'green' }],
        timestamp,
      };
    }

    // 健康记录
    if (weight) {
      return {
        id: `health-${id}`,
        type: 'health',
        title: t('health.title'),
        description: `${t('health.weight')}: ${weight}kg`,
        icon: '❤️',
        tags: [{ text: t('health.label'), color: 'green' }],
        timestamp,
      };
    }

    return null;
  };

  // 转换 activities 为 timeline items
  const timelineItems = activities
    .map(convertToTimelineItem)
    .filter((item): item is TimelineItem => item !== null);

  const formatAmount = (item: TimelineItem) => {
    if (item.amount === undefined) return '';

    // 从 tags 中找到货币 tag（convertToTimelineItem 已将 currency 放入 tags）
    const currencyTag = item.tags.find(tag => {
      const text = tag.text.toUpperCase();
      return ['CNY', 'HKD', 'USD', 'EUR', 'MOP'].includes(text);
    });

    // 如果找不到货币tag，默认CNY
    const currency = (currencyTag?.text || 'CNY') as Currency;
    const symbol = getCurrencySymbol(currency);

    // 根据 iconColor 判断是支出（红色）还是收入（绿色）
    const isExpense = item.iconColor === 'var(--color-error)';
    const sign = isExpense ? '-' : '+';

    return `${sign}${symbol}${item.amount.toFixed(2)}`;
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', height: '100%', position: 'relative' }}>
      {/* PWA安装引导 */}
      <PWAInstallPrompt />

      {/* 左侧：AI 聊天 */}
      <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
        <AIChat />
      </div>

      {/* 右侧：Timeline - PC端显示，移动端隐藏 */}
      {!isMobile && (
        <div style={{ width: '20rem', flexShrink: 0 }}>
          <Card
            title="最近动态"
            style={{ height: '100%', overflow: 'auto' }}
            styles={{ body: { padding: '1rem 1.5rem' } }}
          >
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>加载中...</div>
            ) : error ? (
              <Empty
                description="加载失败，请刷新重试"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : timelineItems.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Timeline
                items={timelineItems.map((item) => ({
                  content: (
                    <div key={item.id} style={{ paddingBottom: '1rem' }}>
                      <div style={{ marginBottom: '0.25rem' }}>
                        {/* 图标 - 使用 IconDisplay 组件 */}
                        <span style={{ marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
                          <IconDisplay icon={item.icon} size="sm" color={item.iconColor} />
                        </span>
                        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{item.title}</span>
                        {item.amount !== undefined && (
                          <span style={{ float: 'right', fontWeight: 'var(--font-weight-medium)' }}>
                            {formatAmount(item)}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div style={{ marginBottom: '0.25rem', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                          {item.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                        <div>
                          {item.tags.map(tag => (
                            <Tag key={tag.text} color={tag.color} style={{ marginRight: '4px' }}>{tag.text}</Tag>
                          ))}
                        </div>
                        <span>{dayjs(item.timestamp).fromNow()}</span>
                      </div>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Home;
