import { useState, useEffect, useCallback } from 'react';
import { Card, Timeline, Tag, Empty } from 'antd';
import AIChat from '@/components/AIChat';
import { IconDisplay } from '@/components/IconDisplay';
import { api } from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { Category } from '@/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 统一的 Timeline 数据类型
type TimelineItemType = 'transaction' | 'transfer' | 'balance_adjustment' | 'activity' | 'health' | 'stock_analysis';

// 账户历史类型代码
type AccountHistoryTypeCode = 'transfer_in' | 'transfer_out' | 'deposit' | 'withdrawal';

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
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  // 加载分类数据
  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('加载分类失败', err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      loadTimelineData();
    }
  }, [categories]);

  // 递归查找分类
  const findCategoryById = useCallback((categoryList: Category[], id: number | undefined): Category | null => {
    if (!id) return null;
    for (const category of categoryList) {
      if (category.id === id) {
        return category;
      }
      if (category.subcategories && category.subcategories.length > 0) {
        const found = findCategoryById(category.subcategories, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      const items: TimelineItem[] = [];
      const addedIds = new Set<number>(); // 用于去重，直接使用交易ID

      // 1. 记账数据
      const transactions = await api.getTransactions({ current: 1, pageSize: 10 });
      (transactions.content || []).forEach((t: any) => {
        if (addedIds.has(t.id)) return; // 跳过重复
        addedIds.add(t.id);

        let iconName: string;
        let iconColor: string;
        let title: string;

        // 根据交易类型处理显示
        if (t.type === 'adjustment') {
          // 余额校准：使用固定图标和类型名称
          const isInflow = t.toAccountId != null;
          iconName = isInflow ? 'add_circle' : 'remove_circle';
          iconColor = '#1890ff';
          title = isInflow ? '余额校准(增加)' : '余额校准(减少)';
        } else {
          // income/expense：使用分类图标和名称
          const category = findCategoryById(categories, t.categoryId);
          iconName = category?.iconName || (t.type === 'expense' ? 'trending_down' : 'trending_up');
          iconColor = t.type === 'expense' ? 'var(--color-error)' : 'var(--color-success)';
          title = category?.name || '未分类';
        }

        items.push({
          id: `txn-${t.id}`,
          type: 'transaction',
          title: title,
          description: t.notes,
          amount: t.amount,
          icon: iconName,
          iconColor: iconColor,
          tags: [{ text: t.type === 'expense' ? '支出' : t.type === 'income' ? '收入' : '校准', color: 'blue' }],
          timestamp: t.transactionDate,
        });
      });

      // 2. 转账 & 余额校准数据（从账户历史获取，排除普通记账）
      try {
        const accounts = await api.getAccounts();
        for (const account of accounts) {
          const history = await api.getAccountHistory(account.id, { page: 0, size: 10 });
          (history.content || []).forEach((h: any) => {
            if (addedIds.has(h.id)) return; // 跳过重复
            addedIds.add(h.id);

            // 跳过记账类型（已在步骤1中添加）
            if (['income', 'expense'].includes(h.typeCode)) {
              return;
            }

            // 转账
            if (['transfer_in', 'transfer_out'].includes(h.typeCode)) {
              items.push({
                id: `history-${h.id}`,
                type: 'transfer' as const,
                title: h.typeDisplay,
                description: h.notes,
                amount: h.isInflow ? h.amount : -h.amount,
                icon: 'swap_horiz',
                iconColor: '#722ed1',
                tags: [
                  { text: account.institutionName || '', color: 'lime' },
                  { text: account.name, color: 'cyan' },
                  { text: h.currency || 'CNY', color: 'gold' }
                ].filter(tag => tag.text),
                timestamp: h.transactionDate,
              });
            }
            // 余额校准
            else if (['balance_increase', 'balance_decrease'].includes(h.typeCode)) {
              const iconName = h.typeCode === 'balance_increase' ? 'add_circle' : 'remove_circle';
              items.push({
                id: `history-${h.id}`,
                type: 'balance_adjustment' as const,
                title: t(`transactions.typeCodes.${h.typeCode}`),
                amount: h.isInflow ? h.amount : -h.amount,
                icon: iconName,
                iconColor: '#1890ff',
                tags: [
                  { text: account.institutionName || '', color: 'lime' },
                  { text: account.name, color: 'cyan' },
                  { text: h.currency || 'CNY', color: 'gold' }
                ].filter(tag => tag.text),
                timestamp: h.transactionDate,
              });
            }
          });
        }
      } catch (e) {
        console.warn('加载账户历史失败', e);
      }

      // 3. 骑行数据
      try {
        const activities = await api.getActivities({ current: 1, pageSize: 5 });
        (activities.content || []).forEach((a: any) => {
          const itemId = `activity-${a.id}`;
          if (addedIds.has(a.id)) return; // 跳过重复（如果ID与其他数据冲突）
          addedIds.add(a.id);

          items.push({
            id: itemId,
            type: 'activity',
            title: '骑行记录',
            description: `${a.distance || 0}km · ${a.duration || 0}分钟`,
            icon: '🚴',
            tags: [a.type || '骑行'],
            timestamp: a.startDate || a.createdAt,
          });
        });
      } catch (e) {
        console.warn('加载骑行数据失败', e);
      }

      // 4. 健康数据
      try {
        const healthData = await api.getHealthHistory();
        const healthRecords = (healthData as any).data || (healthData as any).content || [];
        healthRecords.forEach((h: any) => {
          const itemId = `health-${h.id}`;
          if (addedIds.has(h.id)) return; // 跳过重复（如果ID与其他数据冲突）
          addedIds.add(h.id);

          items.push({
            id: itemId,
            type: 'health',
            title: '健康记录',
            description: `体重 ${h.weight}kg · 体脂率 ${h.bodyFatPercentage}%`,
            icon: '❤️',
            tags: ['健康'],
            timestamp: h.recordedAt || h.createdAt,
          });
        });
      } catch (e) {
        console.warn('加载健康数据失败', e);
      }

      // TODO: 5. 股票分析数据（后端需提供分析历史API）
      // const stockAnalyses = await api.getStockAnalysisHistory({ current: 1, pageSize: 5 });

      // 按时间排序（最新的在前）
      items.sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf());

      // 取前20条
      setTimelineItems(items.slice(0, 20));
    } catch (error) {
      console.error('加载Timeline数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: TimelineItemType) => {
    const colors: Record<TimelineItemType, string> = {
      transaction: 'blue',
      transfer: 'purple',
      balance_adjustment: 'orange',
      activity: 'green',
      health: 'red',
      stock_analysis: 'cyan',
    };
    return colors[type];
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const typeColorGetter = getTypeColor;

  const formatAmount = (item: TimelineItem) => {
    if (item.amount === undefined) return '';
    const sign = item.tags.some(t => t.text === '支出') ? '-' : '+';
    return `${sign}¥${item.amount.toFixed(2)}`;
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>
      {/* 左侧：AI 聊天 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <AIChat />
      </div>

      {/* 右侧：Timeline */}
      <div style={{ width: '20rem', flexShrink: 0 }}>
        <Card
          title="最近动态"
          style={{ height: '100%', overflow: 'auto' }}
          styles={{ body: { padding: '1rem 1.5rem' } }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>加载中...</div>
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
                        {item.icon.includes('_') || /^[0-9a-fA-F]{4,5}$/.test(item.icon) ? (
                          <IconDisplay icon={item.icon} size="1.2rem" color={item.iconColor} />
                        ) : (
                          <span style={{ fontSize: 'var(--font-size-base)' }}>{item.icon}</span>
                        )}
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
    </div>
  );
};

export default Home;
