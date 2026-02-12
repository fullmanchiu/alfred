import { QueryClient } from '@tanstack/react-query';

// 创建 QueryClient 实例，配置合理的缓存策略
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据在内存中保持新鲜的时间（5分钟）
      staleTime: 5 * 60 * 1000,
      // 缓存时间（24小时）
      gcTime: 24 * 60 * 60 * 1000,
      // 窗口重新获得焦点时自动重新获取
      refetchOnWindowFocus: false,
      // 组件挂载时如果数据过期则重新获取
      refetchOnMount: false,
      // 重试次数
      retry: 1,
      // 重试延迟
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // 变更失败时重试
      retry: 1,
    },
  },
});

// 将 queryClient 附加到 window，以便在 logout 时清除缓存
if (typeof window !== 'undefined') {
  (window as any).queryClient = queryClient;
}

