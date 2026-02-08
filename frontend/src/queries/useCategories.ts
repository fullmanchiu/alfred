import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Query keys
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (type?: string) => [...categoryKeys.lists(), type] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: number) => [...categoryKeys.details(), id] as const,
};

/**
 * 获取所有分类
 */
export function useCategories(type?: string) {
  return useQuery({
    queryKey: categoryKeys.list(type),
    queryFn: () => api.getCategories(type ? { type } : undefined),
    staleTime: 10 * 60 * 1000, // 分类数据10分钟内保持新鲜（很少变化）
  });
}

/**
 * 创建分类
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createCategory.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

/**
 * 更新分类
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateCategory>[1] }) =>
      api.updateCategory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(variables.id) });
    },
  });
}

/**
 * 删除分类
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteCategory.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

/**
 * 批量更新分类排序
 */
export function useUpdateCategoriesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categories: Array<{ id: number; sortOrder: number }>) =>
      Promise.all(categories.map(cat => api.updateCategory(cat.id, { sortOrder: cat.sortOrder }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}
