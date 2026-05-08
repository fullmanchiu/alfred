import { useState, type FormEvent } from 'react';

export function ChatInput({ onSend, disabled }: { onSend: (content: string) => void; disabled?: boolean }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
      <div className="max-w-2xl mx-auto flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          rows={1}
          className="flex-1 resize-none rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-zinc-600 placeholder-zinc-500
                     max-h-32 overflow-y-auto"
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-lg bg-white text-black text-sm font-medium
                     hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={disabled || !input.trim()}
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}
