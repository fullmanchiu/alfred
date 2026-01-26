import { useState, useEffect } from 'react';
import { Card, Timeline, Tag, Empty } from 'antd';
import AIChat from '@/components/AIChat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface RecentActivity {
  id: number;
  type: 'transaction' | 'cycling' | 'health';
  title: string;
  description: string;
  timestamp: string;
}

const Home = () => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivities();
  }, []);

  const loadRecentActivities = async () => {
    try {
      setLoading(true);
      // TODO: 后续需要后端提供一个统一的最近活动接口
      // 现在先模拟一些数据
      const mockActivities: RecentActivity[] = [
        {
          id: 1,
          type: 'transaction',
          title: '记账：午餐',
          description: '支出 ¥35.00',
          timestamp: dayjs().subtract(2, 'hours').toISOString(),
        },
        {
          id: 2,
          type: 'cycling',
          title: '骑行活动',
          description: '5.2km，32分钟',
          timestamp: dayjs().subtract(1, 'day').toISOString(),
        },
        {
          id: 3,
          type: 'transaction',
          title: '记账：打车',
          description: '支出 ¥25.00',
          timestamp: dayjs().subtract(1, 'day').toISOString(),
        },
        {
          id: 4,
          type: 'health',
          title: '体重更新',
          description: '65.5kg',
          timestamp: dayjs().subtract(2, 'days').toISOString(),
        },
      ];
      setActivities(mockActivities);
    } catch (error) {
      console.error('加载最近活动失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      transaction: '💰',
      cycling: '🚴',
      health: '❤️',
    };
    return icons[type as keyof typeof icons] || '📌';
  };

  const getActivityTag = (type: string) => {
    const tags = {
      transaction: { color: 'green', text: '记账' },
      cycling: { color: 'blue', text: '骑行' },
      health: { color: 'red', text: '健康' },
    };
    const tag = tags[type as keyof typeof tags];
    return <Tag color={tag.color}>{tag.text}</Tag>;
  };

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>
      {/* 左侧：AI 聊天区域 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <AIChat />
      </div>

      {/* 右侧：最近动态 Timeline */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
        }}
      >
        <Card
          title="最近动态"
          style={{ height: '100%', overflow: 'auto' }}
          bodyStyle={{ padding: '16px 24px' }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>加载中...</div>
          ) : activities.length === 0 ? (
            <Empty description="暂无动态" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Timeline
              items={activities.map((activity) => ({
                children: (
                  <div
                    key={activity.id}
                    style={{
                      paddingBottom: 16,
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 16, marginRight: 8 }}>
                        {getActivityIcon(activity.type)}
                      </span>
                      <span style={{ fontWeight: 500 }}>{activity.title}</span>
                    </div>
                    <div style={{ marginBottom: 4, color: '#666' }}>
                      {activity.description}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {getActivityTag(activity.type)} · {dayjs(activity.timestamp).fromNow()}
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
