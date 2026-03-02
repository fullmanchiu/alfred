# WebSocket 双向通讯设计

## 概述

Java 后端 (8080) 与 Python 微服务 (8001) 之间的双向通讯方案。

## 需求

- **双向对等通讯**：任何一方可主动发起
- **同步 + 异步**：支持 request-response 和 fire-and-forget
- **高频**：每秒上百次消息
- **中等数据量**：几 KB 消息
- **低延迟**：最小化传输延迟
- **简单**：不造轮子，不增加额外端口

## 方案选择

**WebSocket 双向通讯**

| 对比项 | WebSocket | gRPC 双向流 |
|--------|-----------|--------------|
| 端口 | 1个 (8001) | 2个 |
| 协议 | 成熟标准 | 需单独处理 |
| 数据格式 | JSON | Protobuf |
| 复杂度 | 低 | 中 |
| 性能 | 良好 | 更好 |

选择 WebSocket 的原因：与 HTTP 公用端口、实现简单、满足性能需求。

## 架构

```
┌─────────────────────────────────────────────────┐
│              WebSocket 持久连接                  │
│  Java (8080) ←─────────────→ Python (8001)      │
│      客户端                  服务端              │
└─────────────────────────────────────────────────┘
```

- Python FastAPI (8001) 同时处理 HTTP 和 WebSocket
- Java Spring Boot (8080) 作为 WebSocket 客户端连接
- 连接建立后，双方随时发送 JSON 消息

## 消息格式

```json
{
  "type": "request | response | notification",
  "requestId": "uuid",
  "payload": { ... }
}
```

**消息类型：**
- `request`：同步请求，需要响应
- `response`：对 request 的响应
- `notification`：异步通知，无需响应

## 组件设计

### Java 端

**WebSocketConfig**
- 配置 WebSocketClient bean
- 自动启动连接

**WebSocketClient**
- 封装发送/接收逻辑
- 自动重连（指数退避，最大 30 秒）
- 消息队列（断线缓存）

**MessageHandler**
- 处理收到的消息
- 路由到业务逻辑

### Python 端

**/ws 端点**
- WebSocket 连接入口
- 接受连接、处理消息

**ConnectionManager**
- 管理活跃连接
- 支持多实例连接

**MessageRouter**
- 路由消息到处理器
- 处理 request/response/notification

## 连接管理

**自动重连：**
- 连接断开自动重连
- 指数退避策略（1s, 2s, 4s...最大 30s）

**心跳机制：**
- 每 30 秒 ping/pong
- 60 秒无响应判定死亡

**消息队列：**
- 发送失败入队
- 重连后按序发送

## 错误处理

**发送失败：**
- 连接断开：入队，重连后发送
- 超时（5 秒）：记录，不重试
- 对端错误：返回错误消息

**幂等性：**
- requestId 唯一标识
- 接收方判重

**异常隔离：**
- 每条消息独立 try-catch
- 处理异常不影响其他消息

## 日志

- 复用已有的 request-id 透传机制
- 连接事件记录（连接/断开/重连）
- 消息发送/接收记录

## 测试

**单元测试：**
- mock WebSocket 连接
- 测试消息收发
- 测试错误处理

**集成测试：**
- 启动真实服务
- 测试双向通讯
- 测试重连机制

**压力测试：**
- 每秒 100 条消息
- 验证性能和稳定性
