import { useEffect, Component, type ReactNode } from 'react';
import { useChatStore } from '../stores/chatStore';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

// Error boundary to catch ChatView crashes
class ChatViewErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <p className="text-red-400">组件渲染出错</p>
            <p className="text-zinc-500 text-xs">{this.state.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-zinc-700 text-sm hover:bg-zinc-600 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ChatViewContent() {
  // Use individual selectors to avoid destructuring the entire store at once
  // This is more resilient to store re-creation during HMR
  const conversations = useChatStore((s) => s?.conversations ?? []);
  const activeConversationId = useChatStore((s) => s?.activeConversationId ?? null);
  const messages = useChatStore((s) => s?.messages ?? []);
  const streaming = useChatStore((s) => s?.streaming ?? { status: 'idle', thinking: '', tools: [], a2ui: null });
  const error = useChatStore((s) => s?.error ?? null);
  const clearError = useChatStore((s) => s?.clearError);
  const fetchConversations = useChatStore((s) => s?.fetchConversations);
  const loadConversation = useChatStore((s) => s?.loadConversation);
  const setActiveConversation = useChatStore((s) => s?.setActiveConversation);
  const sendMessage = useChatStore((s) => s?.sendMessage);

  useEffect(() => {
    if (!fetchConversations) return;
    (async () => {
      await fetchConversations();
      if (activeConversationId && activeConversationId !== 'new') {
        const exists = useChatStore.getState()?.conversations?.some(
          (c) => c.id === activeConversationId
        );
        if (exists) {
          loadConversation?.(activeConversationId);
        }
      }
    })();
  }, []);

  const handleSend = async (content: string) => {
    await sendMessage?.(content);
  };

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="mx-auto mt-4 px-4 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-300 text-sm flex items-center justify-between max-w-md">
          <span>{error}</span>
          <button onClick={() => clearError?.()} className="ml-3 text-red-400 hover:text-red-300">✕</button>
        </div>
      )}
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} disabled={streaming.status === 'streaming'} />
    </div>
  );
}

export function ChatView() {
  return (
    <ChatViewErrorBoundary>
      <ChatViewContent />
    </ChatViewErrorBoundary>
  );
}
