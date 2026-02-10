import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

/**
 * 今日统计数据接口
 */
interface TodayStats {
  income: number;
  expense: number;
  count: number;
}

/**
 * 获取今日统计数据
 */
export function useTodayStatistics() {
  return useQuery<TodayStats>({
    queryKey: ['finance', 'today-stats'],
    queryFn: async () => {
      // 修复Bug: 创建独立的Date对象，避免mutate
      const today = new Date();
      const startOfDay = new Date(new Date(today).setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(new Date(today).setHours(23, 59, 59, 999)).toISOString();

      // 获取今日所有交易 - 正确处理分页响应结构
      const response = await api.getTransactions({ current: 0, pageSize: 1000 });
      const transactions = response.content || [];

      // 筛选今日交易
      const todayTransactions = transactions.filter((t: any) => {
        const transactionDate = new Date(t.transactionDate);
        return transactionDate >= new Date(startOfDay) && transactionDate <= new Date(endOfDay);
      });

      // 计算收支
      const stats = todayTransactions.reduce((acc: TodayStats, t: any) => {
        if (t.type === 'income') acc.income += t.amount;
        if (t.type === 'expense') acc.expense += t.amount;
        return acc;
      }, { income: 0, expense: 0, count: todayTransactions.length });

      return stats;
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}


