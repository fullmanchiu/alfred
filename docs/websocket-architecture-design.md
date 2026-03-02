# 统一 WebSocket 架构设计

## 1. 架构概览

```
Frontend (React) --HTTP--> Java (Spring Boot) --WebSocket--> Python (FastAPI)
                                    |
                                    v
                               扩展点：前端→Java WS（保留）
```

**角色定位：**
- **Java**：大脑 - 业务逻辑、数据存储、API 服务
- **React**：前端 - 用户界面
- **Python**：手脚 - 数据采集、任务执行

## 2. WebSocket 端点

### 统一端点
- **路径**：`/api/ws`
- **用途**：所有 WebSocket 连接（Python、前端等）
- **客户端类型**：通过握手消息的 `clientType` 字段区分

### 扩展端点（保留）
- **路径**：`/api/ws/task-status`
- **用途**：前端任务状态推送（暂未使用）

## 3. 消息格式

### 统一消息结构
```json
{
  "type": "taskExecute",           // 消息类型（camelCase）
  "requestId": "uuid",             // 请求ID（用于请求-响应匹配）
  "payload": { ... },              // 具体数据
  "timestamp": 1708842600000,      // Unix 毫秒时间戳（数字）
  "status": "success"              // 状态（可选，响应消息）
}
```

### 消息类型命名
- 使用 `camelCase` 风格
- 示例：`taskExecute`, `taskLog`, `klineBatch`, `heartbeat`

### 时间戳处理
- **传输**：Unix 毫秒时间戳（数字）
- **存储**：数据库存 INTEGER/BIGINT
- **显示**：客户端/日志端格式化

## 4. 消息类型分类

### 指令类消息（立即返回）
断开时立即返回错误，不缓存。

| 消息类型 | 说明 |
|---------|------|
| `taskExecute` | 执行任务 |
| `taskStatus` | 查询任务状态 |
| `taskCancel` | 取消任务 |

### 数据类消息（可丢弃）
断开时直接丢弃，不缓存。

| 消息类型 | 说明 |
|---------|------|
| `taskLog` | 任务日志 |
| `klineBatch` | K线批量数据 |
| `heartbeat` | 心跳 |

## 5. 连接管理

### 握手流程
```
Python 连接 → 发送握手消息
{
  "type": "handshake",
  "payload": {"clientType": "python"},
  "timestamp": 1708842600000
}

Java 返回确认
{
  "type": "handshakeAck",
  "payload": {"clientType": "python", "serverTime": 1708842600000},
  "timestamp": 1708842600000
}
```

### 心跳机制
- **间隔**：30秒
- **消息**：`{"type": "heartbeat", "timestamp": 1708842600000}`
- **响应**：`{"type": "pong", "timestamp": 1708842600000}`

### 自动重连
- **重连延迟**：指数退避，1s → 2s → 4s → 8s → 16s → 30s（最大）
- **重连条件**：连接断开、心跳超时
- **重连策略**：持续重连（无上限）

### 连接状态
- 前端显示连接状态：
  - `● Java 已连接` - 正常
  - `⚠ Java 连接中断` - 断开

## 6. 代码更改

### Python 端
**新增/修改文件：**
- `python_to_java_websocket.py` - 重写为 `UnifiedWebSocketClient`
  - 连接到 `ws://localhost:8080/api/ws`
  - 握手时发送 `clientType: "python"`
  - 心跳机制（30秒）
  - 自动重连（指数退避）
  - 消息类型区分处理

**删除文件：**
- 无（仅重写）

### Java 端
**新增/修改文件：**
- `config/TaskWebSocketConfig.kt` - 修改端点为 `/api/ws`
- `websocket/UnifiedWebSocketHandler.kt` - 统一处理器，根据 clientType 路由
- `websocket/MessageHandler.kt` - 修改为使用 Python 会话发送消息

**删除文件：**
- `websocket/JavaWebSocketClient.kt` - 不再需要 Java 作为客户端
- `config/WebSocketConfig.kt` - 旧的配置文件

### 前端
**待实现：**
- 连接状态指示器
- 连接中断提示

## 7. 测试

### Python 测试
- 位置：`py-service/tests/test_unified_websocket.py`
- 测试内容：
  - 消息格式验证
  - 连接建立和握手
  - 心跳机制
  - 重连机制
  - 消息类型区分处理

### 运行测试
```bash
cd py-service
source venv/bin/activate
python -m pytest tests/test_unified_websocket.py -v
```

## 8. 迁移步骤

1. ✅ 编写测试用例
2. ✅ 实现 Python 统一 WebSocket 客户端
3. ✅ 修改 Java WebSocket 配置
4. ✅ 清理旧代码
5. ⏳ 前端显示连接状态
6. ⏳ 端到端测试

## 9. 待完成事项

- [ ] 前端连接状态显示
- [ ] 端到端测试
- [ ] 文档更新（API 文档等）
