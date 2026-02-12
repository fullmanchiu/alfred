export const TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const removeRefreshToken = (): void => {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearAuthTokens = (): void => {
  removeToken();
  removeRefreshToken();
};

/**
 * 清除所有缓存数据（用于退出登录）
 */
export const clearAllCaches = (): void => {
  // 清除 TanStack Query 缓存
  if (typeof window !== 'undefined' && (window as any).queryClient) {
    (window as any).queryClient.clear();
  }
  // 清除 localStorage 中的缓存
  localStorage.removeItem('lastUsedAccountId');
  // 清除其他可能的缓存
  localStorage.removeItem('transactions_cache');
  localStorage.removeItem('accounts_cache');
};
