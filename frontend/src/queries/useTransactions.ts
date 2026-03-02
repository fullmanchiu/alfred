import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Transaction } from '@/types';
import { accountKeys } from './useAccounts';

// 筛选参数类型
export interface TransactionFilters {
  page?: number;
  size?: number;
  type?: string;
  currency?: string;
  accountId?: number;
  startDate?: string;
  endDate?: string;
}

// Query keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: number) => [...transactionKeys.details(), id] as const,
};

/**
 * 获取交易列表
 */
export function useTransactions(filters: TransactionFilters = {}) {
  const { page = 0, size = 20, type, currency, accountId, startDate, endDate } = filters;

  return useQuery({
    queryKey: transactionKeys.list({ page, size, type, currency, accountId, startDate, endDate }),
    queryFn: () => api.getTransactions({
      current: page,
      pageSize: size,
      type,
      currency,
      accountId,
      startDate,
      endDate,
    }),
    staleTime: 30 * 1000, // 交易数据30秒内保持新鲜
  });
}

/**
 * 获取单个交易
 */
export function useTransaction(id: number) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => api.getTransactions({ current: 0, pageSize: 1 }).then((data: any) =>
      Array.isArray(data.content) ? data.content.find((t: any) => t.id === id) : null
    ),
    enabled: !!id,
  });
}

/**
 * 创建交易
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createTransaction.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      // 同时使最近活动缓存失效
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      // 刷新账户列表，因为账户余额会变化
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

/**
 * 更新交易
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Transaction> }) =>
      api.updateTransaction(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      // 刷新账户列表，因为账户余额会变化
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

/**
 * 删除交易
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteTransaction.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      // 刷新账户列表，因为账户余额会变化
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}
