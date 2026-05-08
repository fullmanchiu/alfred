import { create } from 'zustand';
import type { Message, ToolCall, A2UIComponent, Conversation } from '../shared/types';
import { authedFetch, useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  streaming: {
    status: 'idle' | 'streaming';
    thinking: string;
    tools: ToolCall[];
    a2ui: A2UIComponent | null;
  };
  error: string | null;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string) => void;
  loadConversation: (id: string) => Promise<void>;
  resetState: () => void;
  clearError: () => void;

  // Streaming — updates the last (assistant) message in place
  startStreaming: () => void;
  stopStreaming: () => void;
  appendStreamingContent: (content: string) => void;
  updateStreamingThinking: (thinking: string) => void;
  addToolCall: (tool: ToolCall) => void;
  updateToolCall: (id: string, updates: Partial<ToolCall>) => void;
  setStreamingA2UI: (component: A2UIComponent | null) => void;

  // Backend API calls
  fetchConversations: () => Promise<void>;
  createConversation: (title: string) => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  stopMessage: () => Promise<void>;
}

function getBackendUrl(): string {
  return useSettingsStore.getState().backendUrl || 'http://localhost:8080';
}

const STORAGE_KEY = 'alfred_active_conversation';

function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveActiveConversationId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* ignore */ }
}

function mapBackendMessage(raw: any): Message {
  return {
    id: String(raw.id),
    role: raw.role,
    content: raw.content || '',
    timestamp: new Date(raw.createdAt).getTime(),
    thinking: raw.thinking || undefined,
    tool_calls: raw.toolCalls ? JSON.parse(JSON.stringify(raw.toolCalls)) : undefined,
    a2ui: raw.a2ui ? { type: 'a2ui', ...raw.a2ui, action: 'show' as const } : null,
  };
}

// Guard to prevent duplicate sends
let isSending = false;

// Initialize: only restore activeConversationId if user is already authenticated
function initActiveConversationId(): string | null {
  const saved = loadActiveConversationId();
  if (!saved) return null;
  // If no auth token, don't restore — stale data from a previous session
  if (!useAuthStore.getState().token) {
    saveActiveConversationId(null);
    return null;
  }
  return saved;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: initActiveConversationId(),
  messages: [],
  streaming: {
    status: 'idle',
    thinking: '',
    tools: [],
    a2ui: null,
  },
  error: null,

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => {
    set({ activeConversationId: id, messages: [] });
    saveActiveConversationId(id === 'new' ? null : id);
  },
  resetState: () => {
    saveActiveConversationId(null);
    set({ conversations: [], activeConversationId: null, messages: [], streaming: { status: 'idle', thinking: '', tools: [], a2ui: null }, error: null });
  },
  clearError: () => set({ error: null }),

  loadConversation: async (id: string) => {
    const url = `${getBackendUrl()}/api/v1/ai/conversations/${id}/messages`;
    const res = await authedFetch(url);
    if (!res || !res.ok) {
      // Conversation not accessible — clear stale ID
      saveActiveConversationId(null);
      if (get().activeConversationId === id) {
        set({ activeConversationId: null, messages: [] });
      }
      return;
    }
    const data = await res.json();
    const messages: Message[] = data.messages.map(mapBackendMessage);
    set({ activeConversationId: id, messages });
  },

  startStreaming: () =>
    set((state) => ({
      streaming: { status: 'streaming', thinking: '', tools: [], a2ui: null },
      messages: [
        ...state.messages,
        { id: `stream-${Date.now()}`, role: 'assistant' as const, content: '', timestamp: Date.now() } as Message,
      ],
    })),

  stopStreaming: () =>
    set((state) => ({
      streaming: { ...state.streaming, status: 'idle' },
    })),

  appendStreamingContent: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      }
      return { messages: msgs };
    }),

  updateStreamingThinking: (thinking) =>
    set((state) => ({
      streaming: { ...state.streaming, thinking },
      messages: (() => {
        const msgs = [...state.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant') {
          msgs[msgs.length - 1] = { ...last, thinking };
        }
        return msgs;
      })(),
    })),

  addToolCall: (tool) =>
    set((state) => ({
      streaming: { ...state.streaming, tools: [...state.streaming.tools, tool] },
    })),

  updateToolCall: (id, updates) =>
    set((state) => ({
      streaming: {
        ...state.streaming,
        tools: state.streaming.tools.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      },
    })),

  setStreamingA2UI: (component) =>
    set((state) => ({
      streaming: { ...state.streaming, a2ui: component },
    })),

  fetchConversations: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const url = `${getBackendUrl()}/api/v1/ai/conversations`;
    const res = await authedFetch(url);
    if (!res || !res.ok) return;
    const data = await res.json();
    const conversations: Conversation[] = data.map((c: any) => ({
      id: String(c.id),
      title: c.title,
      messages: [],
      created_at: new Date(c.updatedAt).getTime(),
      updated_at: new Date(c.updatedAt).getTime(),
    }));
    set({ conversations });
  },

  createConversation: async (title: string) => {
    // Note: The new AI module creates conversation implicitly on first message.
    // This method is kept for compatibility but should not be called directly.
    // Instead, set activeConversationId to 'new' and send a message.
    console.warn('[chatStore] createConversation is deprecated. Use setActiveConversation("new") + sendMessage instead.');
    return 'new';
  },

  deleteConversation: async (id: string) => {
    const url = `${getBackendUrl()}/api/v1/ai/conversations/${id}`;
    await authedFetch(url, { method: 'DELETE' });
    set((state) => {
      const isActive = state.activeConversationId === id;
      if (isActive) saveActiveConversationId(null);
      return {
        conversations: state.conversations.filter((c) => c.id !== id),
        ...(isActive ? { activeConversationId: null, messages: [] } : {}),
      };
    });
  },

  sendMessage: async (content: string) => {
    if (isSending) return;
    const state = get();
    if (state.streaming.status === 'streaming') return;

    // Clear previous errors
    set({ error: null });

    isSending = true;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, userMsg] }));

    // Send and stream
    const url = `${getBackendUrl()}/api/v1/ai/chat`;
    let res: Response | null;
    try {
      const isNewConversation = !state.activeConversationId || state.activeConversationId === 'new';
      res = await authedFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          conversationId: isNewConversation ? undefined : parseInt(state.activeConversationId),
          title: isNewConversation ? content.slice(0, 50) : undefined,
          content,
        }),
      });
    } catch (e: any) {
      set({ error: e.message || '网络错误，请重试' });
      isSending = false;
      return;
    }

    if (!res) {
      // Auth failed (no refresh token or refresh failed)
      set({ error: '登录已过期，请重新登录' });
      isSending = false;
      return;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      set({ error: `请求失败 (${res.status}): ${errText || '未知错误'}` });
      isSending = false;
      return;
    }

    if (!res.body) {
      // Response received but no stream body — might be non-SSE error response
      set({ error: '服务器返回空响应，请重试' });
      isSending = false;
      return;
    }

    get().startStreaming();
    try {
      await processSSE(res.body, set, get);
    } catch (e: any) {
      set({ error: e.message || '流式响应中断，请重试' });
    } finally {
      isSending = false;
    }
  },

  stopMessage: async () => {
    const state = get();
    if (!state.activeConversationId) return;
    const url = `${getBackendUrl()}/api/v1/ai/chat/${state.activeConversationId}/stop`;
    await authedFetch(url, { method: 'POST' });
    get().stopStreaming();
  },
}));

// SSE stream processor
async function processSSE(
  body: ReadableStream<Uint8Array>,
  set: any,
  get: any
) {
  const decoder = new TextDecoder();
  let buffer = '';
  let conversationId: string | null = null;

  let pendingEvent = '';
  let pendingData = '';

  function tryProcessEvent(event: string, data: string): boolean {
    try {
      switch (event) {
        case 'done': {
          const parsed = JSON.parse(data);
          conversationId = parsed.conversationId ? String(parsed.conversationId) : null;
          return true;
        }
        case 'content': {
          get().appendStreamingContent(data);
          return true;
        }
        case 'thinking': {
          get().updateStreamingThinking(data);
          return true;
        }
        case 'tool_call': {
          const tool = JSON.parse(data);
          get().addToolCall({
            id: tool.id,
            name: tool.name,
            args: typeof tool.arguments === 'string' ? JSON.parse(tool.arguments) : tool.arguments,
            status: 'running',
          });
          return true;
        }
        case 'tool_result': {
          const result = JSON.parse(data);
          get().updateToolCall(result.id, {
            result: result.result,
            error: result.error,
            status: result.error ? 'failed' : 'success',
          });
          return true;
        }
        case 'error': {
          console.error('SSE error event:', data);
          throw new Error(data || '服务器返回错误');
        }
        default:
          return true;
      }
    } catch {
      return false; // Incomplete data, need more
    }
  }

  function handleEmptyLine() {
    if (!pendingEvent) return;
    if (tryProcessEvent(pendingEvent, pendingData)) {
      pendingEvent = '';
      pendingData = '';
    }
    // If parse fails, keep buffering — next data: lines will append
  }

  const reader = body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (line === '') {
          handleEmptyLine();
        } else if (line.startsWith('event:')) {
          pendingEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const dataStr = line.slice(5); // include everything after "data:"
          if (dataStr.trim() === '[DONE]') {
            tryProcessEvent(pendingEvent, pendingData);
            pendingEvent = '';
            pendingData = '';
            return;
          }
          // Accumulate data across multiple data: lines (Spring may split JSON)
          pendingData += dataStr;
        }
      }
    }
  } catch (e: any) {
    console.error('SSE stream error:', e);
    throw e; // Re-throw so caller can surface to user
  }

  // Final flush — process any remaining data
  tryProcessEvent(pendingEvent, pendingData);

  // Save conversationId for subsequent messages
  if (conversationId) {
    set({ activeConversationId: conversationId });
    saveActiveConversationId(conversationId);
  }

  // Mark streaming done — assistant message stays in messages, no flicker
  get().stopStreaming();
}

// Prevent HMR from recreating the store during hot reloads
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // Keep existing store instance, don't re-create
  });
}

// Safety net: if a buggy set() returns undefined and corrupts state, auto-reset
useChatStore.subscribe((state) => {
  if (state === undefined || state === null) {
    console.error('[chatStore] State corrupted (undefined/null), auto-resetting');
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      messages: [],
      streaming: { status: 'idle' as const, thinking: '', tools: [], a2ui: null },
      error: null,
    });
  }
});
