import { useState, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';

export function Sidebar({ onSettings }: { onSettings: () => void }) {
  const conversations = useChatStore((s) => s?.conversations) || [];
  const activeId = useChatStore((s) => s?.activeConversationId);
  const setActive = useChatStore((s) => s?.setActiveConversation);
  const loadConversation = useChatStore((s) => s?.loadConversation);
  const fetchConversations = useChatStore((s) => s?.fetchConversations);
  const deleteConversation = useChatStore((s) => s?.deleteConversation);
  const username = useAuthStore((s) => s?.username);
  const logout = useAuthStore((s) => s?.logout);

  useEffect(() => {
    fetchConversations?.();
  }, [fetchConversations]);

  const handleDelete = async (id: string) => {
    await deleteConversation?.(id);
  };

  return (
    <aside className="w-64 flex flex-col border-r border-zinc-800 bg-zinc-900/80">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-wide">Alfred</h1>
        <button
          onClick={onSettings}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Settings"
        >
          <SettingsIcon />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-2">
        <button
          onClick={() => setActive?.('new')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700
                     hover:bg-zinc-800 text-sm text-zinc-300 transition-colors"
        >
          <PlusIcon />
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 ? (
          <div className="text-zinc-600 text-xs text-center mt-8">
            暂无对话
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                conv.id === activeId
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
              onClick={() => { setActive?.(conv.id); loadConversation?.(conv.id); }}
            >
              <ChatIcon />
              <span className="ml-2 flex-1 truncate">{conv.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-all"
              >
                <TrashIcon />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="truncate mr-2">{username}</span>
          <button
            onClick={() => logout?.()}
            className="text-zinc-500 hover:text-red-400 transition-colors whitespace-nowrap"
          >
            退出
          </button>
        </div>
      </div>
    </aside>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.502 48.172 48.172 0 003.423-.38c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
