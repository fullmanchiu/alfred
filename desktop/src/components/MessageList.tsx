import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../stores/chatStore';
import type { Message, ToolCall } from '../shared/types';

export function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const streaming = useChatStore((s) => s?.streaming ?? { status: 'idle' as const, thinking: '', tools: [], a2ui: null });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && streaming.status === 'idle') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-500 text-center">
          <p className="text-xl font-medium">有什么可以帮你的？</p>
          <p className="text-sm mt-2">输入消息开始对话</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, i) => (
        <div key={msg.id || i} className="max-w-2xl mx-auto">
          {msg.role === 'user' && (
            <div className="p-4 rounded-xl bg-zinc-800">
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          )}

          {msg.role === 'assistant' && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              {(msg.thinking || (streaming.status === 'streaming' && streaming.thinking)) && (
                <ThinkingBlock content={streaming.status === 'streaming' ? streaming.thinking : (msg.thinking || '')} live={streaming.status === 'streaming'} />
              )}

              {/* Tool calls: from streaming state or from loaded message history */}
              {streaming.tools.length > 0 && (
                <div className="space-y-1.5">
                  {streaming.tools.map((tc) => (
                    <ToolCallBubble key={tc.id} tool={tc} />
                  ))}
                </div>
              )}
              {msg.tool_calls && msg.tool_calls.length > 0 && streaming.tools.length === 0 && (
                <div className="space-y-1.5">
                  {msg.tool_calls.map((tc) => (
                    <ToolCallBubble key={tc.id} tool={tc} />
                  ))}
                </div>
              )}

              {msg.content && (
                <div className="text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      h1: ({ children }) => <h1 className="text-lg font-semibold mt-4 mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="text-zinc-300">{children}</li>,
                      code: ({ children, className }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="bg-zinc-800/80 text-zinc-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                        ) : (
                          <pre className="bg-zinc-800/80 p-3 rounded-lg overflow-x-auto my-2">
                            <code className="text-xs font-mono text-zinc-200">{children}</code>
                          </pre>
                        );
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-zinc-600 pl-3 my-2 text-zinc-400 italic">{children}</blockquote>
                      ),
                      a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{children}</a>
                      ),
                      strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
                      hr: () => <hr className="border-zinc-700 my-3" />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  {/* Blinking cursor on the last streaming message */}
                  {streaming.status === 'streaming' && i === messages.length - 1 && (
                    <span className="inline-block w-0.5 h-4 bg-white ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              )}

              {streaming.a2ui && <A2UIRenderer component={streaming.a2ui} />}
              {!msg.content && streaming.tools.length === 0 && !msg.thinking && !streaming.thinking && (
                <p className="text-zinc-500 text-sm animate-pulse">思考中...</p>
              )}
            </div>
          )}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}

function ThinkingBlock({ content, live }: { content: string; live?: boolean }) {
  const [expanded, setExpanded] = useState(!live);
  return (
    <details open={expanded} onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}>
      <summary className="text-xs text-zinc-500 cursor-pointer select-none hover:text-zinc-400 transition-colors">
        思考过程
      </summary>
      <div className="mt-2 p-3 rounded-lg bg-zinc-800/50 text-zinc-400 whitespace-pre-wrap text-xs leading-relaxed border-l-2 border-zinc-700">
        {content}
      </div>
    </details>
  );
}

function ToolCallBubble({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400',
    running: 'text-blue-400',
    success: 'text-green-400',
    failed: 'text-red-400',
    confirming: 'text-orange-400',
  };
  const statusLabels: Record<string, string> = {
    pending: '等待中',
    running: '执行中',
    success: '完成',
    failed: '失败',
    confirming: '等待确认',
  };

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={`mt-0.5 ${statusColors[tool.status] || 'text-zinc-400'}`}>
        {tool.status === 'success' ? '✓' : tool.status === 'failed' ? '✗' : tool.status === 'running' ? '⟳' : '⋯'}
      </span>
      <div className="flex-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="font-mono text-zinc-300 hover:text-white transition-colors text-left"
        >
          {tool.name}
        </button>
        {tool.error && (
          <p className="text-red-400 text-xs mt-0.5">{tool.error}</p>
        )}
        {expanded && (
          <div className="mt-1 p-2 rounded bg-zinc-800/50 text-zinc-500 font-mono text-xs overflow-x-auto">
            {JSON.stringify(tool.args, null, 2)}
            {tool.result && (
              <div className="mt-1 pt-1 border-t border-zinc-700 text-green-400">
                {tool.result.slice(0, 200)}
              </div>
            )}
          </div>
        )}
      </div>
      <span className={`text-xs ${statusColors[tool.status]}`}>
        {statusLabels[tool.status]}
      </span>
    </div>
  );
}

function A2UIRenderer({ component }: { component: any }) {
  switch (component.component) {
    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-xs">
            <thead className="bg-zinc-800/50">
              <tr>
                {component.props.columns?.map((col: string, i: number) => (
                  <th key={i} className="px-3 py-2 text-left text-zinc-400 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {component.props.rows?.map((row: any[], ri: number) => (
                <tr key={ri} className="border-t border-zinc-800/50">
                  {row.map((cell: any, ci: number) => (
                    <td key={ci} className="px-3 py-2 text-zinc-300">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'code_block':
      return (
        <pre className="p-3 rounded-lg bg-zinc-800/50 text-xs font-mono overflow-x-auto text-zinc-300">
          {component.props.code || ''}
        </pre>
      );
    case 'card':
      return (
        <div className="p-3 rounded-lg border border-zinc-700 bg-zinc-800/30">
          <h4 className="text-sm font-medium text-zinc-200">{component.props.title}</h4>
          <p className="text-xs text-zinc-400 mt-1">{component.props.description}</p>
        </div>
      );
    default:
      return (
        <div className="p-2 rounded bg-zinc-800/30 text-xs text-zinc-500">
          [A2UI: {component.component}]
        </div>
      );
  }
}
