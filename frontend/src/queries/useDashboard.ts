import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  recentActivities: () => [...dashboardKeys.all, 'recent-activities'] as const,
};

/**
 * 获取最近活动
 */
export function useRecentActivities(limit = 20) {
  return useQuery({
    queryKey: [...dashboardKeys.recentActivities(), limit],
    queryFn: () => api.getRecentActivities(limit),
    staleTime: 10 * 1000, // 10秒缓存（确保数据及时更新）
    refetchOnWindowFocus: true, // 窗口聚焦时自动刷新（适合实时数据）
  });
}
