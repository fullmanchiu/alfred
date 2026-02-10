import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Budget } from '@/types';

// Query keys
export const budgetKeys = {
  all: ['budgets'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
  list: (filters?: { period?: string; categoryId?: number }) =>
    [...budgetKeys.lists(), filters] as const,
  usage: () => [...budgetKeys.all, 'usage'] as const,
  hierarchy: (params: { date: string; period: string }) =>
    [...budgetKeys.all, 'hierarchy', params] as const,
};

/**
 * 获取所有预算
 */
export function useBudgets(filters?: { period?: string; categoryId?: number }) {
  return useQuery<Budget[]>({
    queryKey: budgetKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.period) params.append('period', filters.period);
      if (filters?.categoryId) params.append('categoryId', filters.categoryId.toString());
      const queryString = params.toString();
      const url = queryString ? `/budgets?${queryString}` : '/budgets';
      return (api as any).client.get(url.replace('/api/v1', ''));
    },
    staleTime: 2 * 60 * 1000, // 2分钟缓存
  });
}

/**
 * 获取预算使用情况
 * @param period 可选周期过滤（daily/weekly/monthly/yearly）
 */
export function useBudgetUsage(period?: string) {
  return useQuery({
    queryKey: period ? [...budgetKeys.usage(), period] : budgetKeys.usage(),
    queryFn: () => api.getBudgetUsage(period),
    staleTime: 2 * 60 * 1000, // 2分钟缓存
  });
}

/**
 * 获取预算层级详情
 */
export function useBudgetHierarchy(params: { date: string; period: 'day' | 'week' | 'month' }) {
  return useQuery({
    queryKey: budgetKeys.hierarchy(params),
    queryFn: () => api.getBudgetHierarchy(params),
    staleTime: 2 * 60 * 1000, // 2分钟缓存
  });
}

/**
 * 创建预算
 */
export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Budget>) => {
      return api.createBudget(data);
    },
    onSuccess: () => {
      // 只让预算列表和使用情况失效，不影响其他查询
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.usage() });
    },
  });
}

/**
 * 更新预算
 */
export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Budget> }) => {
      return api.updateBudget(id, data);
    },
    onSuccess: () => {
      // 只让预算列表和使用情况失效
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.usage() });
    },
  });
}

/**
 * 删除预算
 */
export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budgetId: number) => {
      return api.deleteBudget(budgetId);
    },
    onSuccess: () => {
      // 只让预算列表和使用情况失效
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.usage() });
    },
  });
}
