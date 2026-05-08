import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  userId: number | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const STORAGE_KEY = 'alfred-auth';

interface StoredAuth {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  userId: number | null;
}

function loadAuth(): StoredAuth {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { token: null, refreshToken: null, username: null, userId: null };
}

function saveAuth(auth: StoredAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export const useAuthStore = create<AuthState>((set, get) => {
  const saved = loadAuth();

  return {
    ...saved,
    isLoading: false,
    isLoggedIn: !!saved.token,

    login: async (username: string, password: string) => {
      set({ isLoading: true });
      const backendUrl = useSettingsStore.getState().backendUrl;
      const res = await fetch(`${backendUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '登录失败' }));
        set({ isLoading: false });
        throw new Error(err.message || '登录失败');
      }
      const data = await res.json();
      const auth = {
        token: data.token,
        refreshToken: data.refreshToken ?? null,
        username: data.user?.username || username,
        userId: data.user?.id || null,
      };
      console.log('[authStore] login success, token:', auth.token ? auth.token.slice(0, 20) + '...' : 'null');
      saveAuth(auth);
      set({ ...auth, isLoggedIn: true, isLoading: false });
      console.log('[authStore] after set(), token in store:', get().token ? 'present' : 'null');
      // Clear stale chat state (e.g., activeConversationId from previous user)
      // Dynamic import to avoid circular dependency
      import('./chatStore').then((m) => m.useChatStore.getState().resetState());
    },

    register: async (username: string, password: string, email?: string) => {
      set({ isLoading: true });
      const backendUrl = useSettingsStore.getState().backendUrl;
      const res = await fetch(`${backendUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '注册失败' }));
        set({ isLoading: false });
        throw new Error(err.message || '注册失败');
      }
      const data = await res.json();
      const auth = {
        token: data.token,
        refreshToken: data.refreshToken ?? null,
        username: data.user?.username || username,
        userId: data.user?.id || null,
      };
      saveAuth(auth);
      set({ ...auth, isLoggedIn: true, isLoading: false });
      // Clear stale chat state
      import('./chatStore').then((m) => m.useChatStore.getState().resetState());
    },

    logout: () => {
      console.warn('[authStore] logout() called!');
      console.trace('[authStore] logout caller stack');
      localStorage.removeItem(STORAGE_KEY);
      // Also clear chat state
      import('./chatStore').then((m) => m.useChatStore.getState().resetState());
      set({ token: null, refreshToken: null, username: null, userId: null, isLoggedIn: false });
    },

    getToken: () => get().token,
  };
});

// Subscribe to all auth state changes for debugging
useAuthStore.subscribe((state) => ({
  token: state.token ? state.token.slice(0, 20) + '...' : 'null',
  refreshToken: state.refreshToken ? 'present' : 'null',
  isLoggedIn: state.isLoggedIn,
  isLoading: state.isLoading,
}), (snapshot) => {
  console.log('[authStore:subscribe]', JSON.stringify(snapshot));
}, { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) });

// Global refresh lock to prevent concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const rt = useAuthStore.getState().refreshToken;
    if (!rt) return false;

    const backendUrl = useSettingsStore.getState().backendUrl;
    try {
      const res = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      const auth = {
        token: data.token,
        refreshToken: data.refreshToken ?? useAuthStore.getState().refreshToken,
        username: useAuthStore.getState().username,
        userId: useAuthStore.getState().userId,
      };
      saveAuth(auth);
      useAuthStore.setState({ ...auth });
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Build auth headers without consuming the response body.
 * Used for SSE requests where we need the raw stream.
 */
export function buildAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  console.log('[buildAuthHeaders] token:', token ? token.slice(0, 20) + '...' : 'NULL', '| localStorage:', localStorage.getItem(STORAGE_KEY) ? 'present' : 'missing');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch wrapper that auto-refreshes token on 401.
 * Usage: authedFetch(url, options)
 */
export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  console.log('[authedFetch]', options.method || 'GET', url);
  console.trace('[authedFetch] caller stack');
  let res = await fetch(url, { ...options, headers: buildAuthHeaders() });

  // On 401, try to refresh token once, then retry
  if (res.status === 401) {
    const hasRefreshToken = !!useAuthStore.getState().refreshToken;
    if (!hasRefreshToken) {
      // No refresh token available — don't auto-logout, just return null
      // so the caller can handle it gracefully
      return null;
    }

    const refreshed = await doRefresh();
    if (refreshed) {
      res = await fetch(url, { ...options, headers: buildAuthHeaders() });
    }

    // Still 401 after refresh → logout
    if (res.status === 401) {
      useAuthStore.getState().logout();
      return null;
    }
  }

  return res;
}

// Prevent HMR from recreating the store during hot reloads
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // Keep existing store instance, don't re-create
  });
}
