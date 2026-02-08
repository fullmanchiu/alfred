import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

/**
 * 获取今日统计数据
 */
export function useTodayStatistics() {
  return useQuery({
    queryKey: ['finance', 'today-stats'],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // 获取今日所有交易
      const transactions = await api.getTransactions({ current: 0, pageSize: 1000 });

      // 筛选今日交易
      const todayTransactions = transactions.filter((t: any) => {
        const transactionDate = new Date(t.transactionDate);
        return transactionDate >= new Date(startOfDay) && transactionDate <= new Date(endOfDay);
      });

      // 计算收支
      const stats = todayTransactions.reduce((acc: any, t: any) => {
        if (t.type === 'income') acc.income += t.amount;
        if (t.type === 'expense') acc.expense += t.amount;
        return acc;
      }, { income: 0, expense: 0, count: todayTransactions.length });

      return stats;
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}

/**
 * 获取本周预算数据（占位）
 */
export function useWeeklyBudget() {
  return useQuery({
    queryKey: ['finance', 'weekly-budget'],
    queryFn: () => Promise.resolve(null),
    staleTime: Infinity,
  });
}
