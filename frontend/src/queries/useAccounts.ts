import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Query keys
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  list: (filters?: string) => [...accountKeys.lists(), filters] as const,
  details: () => [...accountKeys.all, 'detail'] as const,
  detail: (id: number) => [...accountKeys.details(), id] as const,
  history: (id: number) => [...accountKeys.all, 'history', id] as const,
};

/**
 * 获取所有账户列表
 */
export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: () => api.getAccounts(),
    staleTime: 2 * 60 * 1000, // 账户数据2分钟内保持新鲜
  });
}

/**
 * 获取单个账户详情
 * 注意：当前API没有getAccount方法，此hook保留供将来使用
 */
export function useAccount(id: number) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => api.getAccounts().then(accounts => accounts.find(a => a.id === id)),
    enabled: !!id,
  });
}

/**
 * 获取账户历史记录
 */
export function useAccountHistory(id: number) {
  return useQuery({
    queryKey: accountKeys.history(id),
    queryFn: () => api.getAccountHistory(id, { page: 0, size: 50 }),
    enabled: !!id,
  });
}

/**
 * 创建账户
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createAccount.bind(api),
    onSuccess: () => {
      // 创建成功后，使账户列表缓存失效
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

/**
 * 更新账户
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateAccount>[1] }) =>
      api.updateAccount(id, data),
    onSuccess: (_, variables) => {
      // 更新成功后，使相关缓存失效
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(variables.id) });
    },
  });
}

/**
 * 删除账户
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteAccount.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

/**
 * 调整账户余额
 */
export function useUpdateAccountBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, currency, balance, reason }: {
      accountId: number;
      currency: string;
      balance: number;
      reason?: string;
    }) => api.updateAccountBalance(accountId, currency, balance, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(variables.accountId) });
    },
  });
}
