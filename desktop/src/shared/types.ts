// Shared types between main process and renderer

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  thinking?: string;
  tool_calls?: ToolCall[];
  a2ui?: A2UIComponent | null;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  status: 'pending' | 'running' | 'success' | 'failed' | 'confirming';
  result?: string;
  error?: string;
}

export interface A2UIComponent {
  type: 'a2ui';
  component: 'table' | 'code_block' | 'file_tree' | 'chart' | 'form' | 'tabs' | 'card';
  props: Record<string, any>;
  action: 'show' | 'update' | 'remove';
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: number;
  updated_at: number;
}

export interface Settings {
  backendUrl: string;
  mcpServers: McpServerConfig[];
}

export interface AuthState {
  token: string | null;
  username: string | null;
  isLoggedIn: boolean;
}

export interface McpServerConfig {
  name: string;
  type: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  enabled: boolean;
}

export type StreamingEvent =
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; tool: ToolCall }
  | { type: 'tool_result'; toolId: string; result: string; error?: string }
  | { type: 'content'; content: string }
  | { type: 'a2ui'; component: A2UIComponent }
  | { type: 'done'; message: Message }
  | { type: 'error'; error: string };

export type ConfirmationResponse = 'allow-once' | 'allow-all' | 'deny';
