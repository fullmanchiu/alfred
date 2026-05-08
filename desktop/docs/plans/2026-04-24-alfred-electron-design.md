# Alfred Electron - AI Desktop Assistant Design

**Date**: 2026-04-24
**Status**: Design Approved

---

## Overview

A full-featured AI desktop assistant built with Electron, supporting conversational AI, agent execution, skill system, and MCP integration. Comparable to OpenClaw and Hermes in capability, with a ChatGPT/Claude-like UI.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Electron                       │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Renderer     │  │      Main Process         │ │
│  │  (React UI)   │  │                           │ │
│  │              │  │  ┌───────────────────┐    │ │
│  │ - ChatView    │  │  │  AI Gateway       │    │ │
│  │ - Sidebar     │IPC │  │  (OpenAI compat)  │    │ │
│  │ - Settings    │◄──►│  └────────┬──────────┘    │ │
│  │ - AgentPanel  │  │           │                 │ │
│  │ - SkillPanel  │  │  ┌────────▼──────────┐    │ │
│  │ - ConfirmDlg  │  │  │  Agent Orchestrator│    │ │
│  └──────────────┘  │  └────────┬──────────┘    │ │
│                    │           │                 │ │
│                    │  ┌────────▼──────────┐    │ │
│                    │  │  Sandbox + MCP     │    │ │
│                    │  │  Client            │    │ │
│                    │  └───────────────────┘    │ │
│                    └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Tech Stack
- **Electron** — Desktop framework
- **React 19 + TypeScript** — UI framework
- **Vite** — Build tool
- **Zustand** — State management
- **Tailwind CSS** — Styling
- **better-sqlite3** — Local persistence
- **openai SDK** — OpenAI-compatible API calls (supports any provider)

### Core Design Principle
**Main process holds all capabilities.** Renderer only renders UI. All AI calls, agent execution, file operations, and MCP communication happen in the main process, communicating via IPC. This ensures security and architectural clarity.

---

## UI Components

### Layout
- **Left sidebar**: Conversation list, agent selector, skill panel
- **Center**: Chat message stream with scroll-to-bottom
- **Bottom**: Input box with file attachment, model selector, send button
- **Right panel**: Agent status, tool execution log, file tree (collapsible)

### A2UI Dynamic Components
AI returns JSON schema, frontend renders matching component:

```json
{
  "type": "a2ui",
  "component": "table",
  "props": { "columns": ["File", "Lines"], "rows": [...] },
  "action": "show"
}
```

Built-in component types: `table`, `code_block`, `file_tree`, `chart`, `form`, `tabs`, `card`

### Thinking Process
- AI pushes `thinking` events via SSE stream
- UI renders real-time, auto-expands first 3 lines, collapsible
- Collapsible with smooth animation

### Tool Call Display
- Each tool call as independent bubble
- Shows icon, parameters, status (running/success/failed/pending-confirm)
- Click to expand details
- Sensitive commands show confirmation dialog: `[Confirm] [Deny] [Always Allow]`

---

## Agent System

### Agent Registry

**Built-in Agents:**
- `code_reader` — Code reading and analysis
- `code_writer` — Code generation and modification
- `file_manager` — File operations (create/move/delete)
- `shell_runner` — Command execution
- `web_researcher` — Web search and scraping

**Custom Agents (YAML definition):**
```yaml
name: code_reviewer
description: "Review code against plan and coding standards"
system_prompt: |
  You are a code reviewer...
tools: [read_file, grep, glob, shell]
sandbox: restricted  # full | restricted | none
permission_policy: prompt  # prompt | auto-allow | auto-deny
```

### Tool System

**Built-in Tools** (Node.js native, sandboxed):
- `fs` (whitelist-based)
- `child_process`
- `net/http`

**Skill Plugins** (YAML + JS):
```
skills/
  git_ops/
    skill.yaml
    handler.js
  db_query/
    skill.yaml
    handler.js
```
Dynamic load/unload.

**MCP Tools** — Auto-discovered from external MCP servers, mapped to unified tool registry.

### Execution Engine
- **Single step** — Call once, return result
- **Loop** — Agent can call multiple tools until completion
- **Parallel** — Multiple independent agents run concurrently

### Permission Policy
- `prompt` — Sensitive operations require user confirmation each time
- `auto-allow` — Commands permanently allowed by user
- `auto-deny` — Blacklisted commands always denied

Confirmation strategies persisted in SQLite.

---

## MCP Client Integration

### Connection Management
- **Local stdio processes**: e.g. `npx -y @modelcontextprotocol/server-filesystem`
- **Remote SSE connections**: e.g. `http://localhost:3000/mcp`
- Connection pool + health checks

### Tool Discovery
- Auto-discover MCP server tools
- Map to unified tool registry
- Shared invocation interface with built-in tools and skills

### Resource Subscription
- Subscribe to MCP resources
- Push updates to UI

---

## Data Flow (IPC)

```
Renderer (React)              Main Process (Node)
      │                              │
      │── sendMessage(text) ───────►│
      │                              │ 1. Call AI Gateway (OpenAI compat)
      │                              │ 2. Stream back thinking/tool_use/text
      │◄─── SSE stream ────────────│
      │                              │
      │── confirmTool(toolId) ─────►│
      │                              │ 3. Execute tool / Agent
      │◄─── toolResult ────────────│
      │                              │
      │◄─── a2ui_component ────────│ 4. Dynamic component data push
```

### State Management (Zustand)
```typescript
interface AppState {
  conversations: {
    active: string;
    list: Conversation[];
  };
  messages: Message[];
  streaming: {
    status: 'idle' | 'streaming' | 'paused';
    thinking: string;
    tools: ToolCall[];
  };
  agents: {
    available: Agent[];
    running: RunningAgent[];
  };
  settings: {
    apiKey: string;
    baseUrl: string;
    model: string;
    mcpServers: McpServerConfig[];
  };
}
```

Streaming via `ipcRenderer.on` events, consumed by React hooks — no full re-render.

---

## Security Model

### Sandbox
- Node.js sandbox for agent execution
- Restricted global objects
- File system whitelist
- Sensitive operations require authorization

### Confirmation Flow
1. Agent requests command execution
2. Main process checks permission policy
3. If `prompt`, send confirmation request to renderer
4. User confirms: once, always, or deny
5. Result persisted to SQLite

---

## Persistence

**better-sqlite3** stores:
- Conversation history (messages, timestamps, model used)
- Settings (API key, base URL, model, MCP servers)
- Permission decisions (allowed commands, denied commands)
- Agent configurations
- Memory entries (facts, experiences, preferences)

---

## Prompt Management

```
prompts/
  system/
    default.yaml          # Default AI assistant system prompt
    code_reviewer.yaml    # Code review agent prompt
    code_writer.yaml      # Code generation agent prompt
  user/
    custom_prompts/       # User-defined prompt templates
  templates/
    code_explain.yaml     # Explain code template
    refactor.yaml         # Refactor template
    bug_fix.yaml          # Bug fix template
```

- YAML format, supports variable injection: `{{project_name}}`, `{{file_path}}`, `{{context}}`
- UI provides prompt template selector + editor
- Prompt version snapshots, rollback support
- Active prompt merged into system message before each API call

---

## Context Management

```
┌──────────────────────────────────────┐
│         Context Window               │
│                                      │
│  System Prompt  (fixed)               │
│  ├─ Project CLAUDE.md                │
│  ├─ Agent system instructions         │
│  └─ Active prompt template            │
│                                      │
│  Recent Messages  (sliding window)    │
│  ├─ Last N messages                   │
│  └─ Token count, triggers compression │
│                                      │
│  Context Injection  (dynamic)         │
│  ├─ Current working directory          │
│  ├─ @referenced file contents          │
│  ├─ Clipboard content                  │
│  └─ Short-term memory summary          │
│                                      │
│  Long-term Memory (RAG)               │
│  └─ Retrieved memory fragments         │
└──────────────────────────────────────┘
```

**Context Compression Strategy**:
1. Token count approaches limit → generate conversation summary, replace old messages
2. Keep last 3 conversation turns + first assistant response
3. Summary generation uses smaller model to reduce cost

---

## Memory System

```
Memory (Main Process)
│
├── Short-term Memory (Within Session)
│   ├── Current session message queue
│   ├── Agent intermediate execution state
│   ├── Multi-turn intent tracking
│   └── Auto-cleaned on session end
│
├── Long-term Memory (Cross-Session)
│   ├── Factual Memory
│   │   └─ "User prefers Go", "Project uses Next.js"
│   ├── Experiential Memory
│   │   └─ "Fixed auth bug last time", "Module X has perf issues"
│   └── Preference Memory
│       └─ "User dislikes emoji", "Answers should be concise"
│
├── Memory Storage
│   ├── SQLite (Structured Memory)
│   │   └─ User preferences, project config, historical decisions
│   └── Vector Index (Semantic Search) — Layer 4
│       └─ embedded-memory/index.db
│          (sqlite-vec or lightweight embedding model)
│
└── Memory Injection
    ├── Retrieve relevant memory before conversation
    ├── Auto-inject into context window
    └── Memory expiration / decay strategy
```

**Memory Write Triggers**:
- User says "remember" → immediate write
- Agent discovers project characteristics during execution → auto-extract, prompt user to confirm
- Background consolidation during idle time (compress, deduplicate, merge)

---

## Harness Engineering

### Tool Calling Protocol
```
1. LLM returns tool_call
2. Harness parses → looks up tool → permission check
3. Execute tool → return result
4. Append result to messages
5. Send back to LLM → continue or return final text
```

### Error Recovery
- Tool execution fails → return error to LLM, let it retry
- LLM calls non-existent tool → return available tool list
- API timeout → exponential backoff retry (3 attempts)
- Consecutive failures → abort with diagnostic info

### Execution Controls
- `pause()` — Pause current agent (preserve state)
- `resume()` — Resume from pause point
- `cancel()` — Terminate execution, clean up resources
- `step()` — Single-step debug mode (wait for confirmation each step)

### State Persistence
- Running state → in-memory
- Paused state → SQLite serialization
- After cancel → cleanup + retain log

---

## Implementation Layers (AI Direct Generation)

**Layer 1 — Skeleton**
- Electron + React project scaffolding
- Basic chat UI, streaming text output
- OpenAI-compatible API integration
- Basic state management (Zustand)

**Layer 2 — Core**
- Thinking process display, tool call display
- Confirmation dialog (once/always)
- Prompt management (YAML templates + editor)
- Context management (token counting, sliding window)
- Short-term memory (in-session message management)

**Layer 3 — Agent System**
- Agent registry + YAML definition
- Tool system (built-in tools + sandbox)
- Skill plugin framework
- Harness (tool calling loop, error recovery)
- Execution controls (pause/resume/cancel)

**Layer 4 — Advanced**
- MCP Client integration
- A2UI dynamic component rendering
- Long-term memory (SQLite structured memory)
- Vector search (optional, based on complexity)
- Memory auto-injection

**Layer 5 — Polish**
- Settings page
- Conversation history persistence
- Import/export configuration
- Performance optimization, error boundaries
