# WebSocket 双向通讯实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 Java 后端与 Python 微服务之间的 WebSocket 双向通讯，支持高频、低延迟的 JSON 消息传输，无需额外端口。

**Architecture:** Java (8080) 作为 WebSocket 客户端连接到 Python FastAPI (8001)，Python 同时处理 HTTP 和 WebSocket。连接建立后双方可随时发送消息，支持同步 request-response 和异步 notification。

**Tech Stack:** Java (Spring WebSocket + WebSocketClient), Python (FastAPI + websockets), JSON 消息格式

---

## Task 1: 删除现有 gRPC 代码

**理由:** gRPC 需要额外端口且复杂，改用 WebSocket 方案。

**Files:**
- Delete: `backend/src/main/kotlin/com/colafan/alfred/grpc/GrpcClient.kt`
- Delete: `backend/src/main/kotlin/com/colafan/alfred/grpc/GrpcClientInterceptor.kt`
- Delete: `backend/src/main/kotlin/com/colafan/alfred/grpc/RequestIdContext.kt`
- Delete: `py-service/grpc_server.py`
- Delete: `py-service/comm_pb2.py`
- Delete: `py-service/comm_pb2_grpc.py`

**Step 1: 删除 Java gRPC 文件**

```bash
cd /Users/qiuliang/code/alfred/backend
rm -rf src/main/kotlin/com/colafan/alfred/grpc/
```

**Step 2: 删除 Python gRPC 文件**

```bash
cd /Users/qiuliang/code/alfred/py-service
rm -f grpc_server.py comm_pb2.py comm_pb2_grpc.py
```

**Step 3: 更新 main.py（移除 gRPC 启动代码）**

修改 `py-service/main.py` 第 570-572 行，删除 gRPC 相关代码：

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
```

**Step 4: 编译验证**

```bash
cd /Users/qiuliang/code/alfred/backend
./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

**Step 5: Commit**

```bash
cd /Users/qiuliang/code/alfred
git add backend/src/main/kotlin/com/colafan/alfred/grpc/ py-service/grpc_server.py py-service/comm_pb2.py py-service/comm_pb2_grpc.py
git commit -m "refactor: remove gRPC code, switch to WebSocket"
```

---

## Task 2: 定义消息格式和 DTO

**Files:**
- Create: `backend/src/main/kotlin/com/colafan/alfred/websocket/dto/MessageDto.kt`
- Create: `py-service/dto/message.py`

**Step 1: 创建 Java 消息 DTO**

```kotlin
package com.colafan.alfred.websocket.dto

import com.fasterxml.jackson.annotation.JsonProperty

/**
 * WebSocket 消息格式
 */
data class WebSocketMessage(
    @JsonProperty("type")
    val type: MessageType,

    @JsonProperty("requestId")
    val requestId: String? = null,

    @JsonProperty("payload")
    val payload: Map<String, Any>
)

enum class MessageType {
    @JsonProperty("request")
    REQUEST,

    @JsonProperty("response")
    RESPONSE,

    @JsonProperty("notification")
    NOTIFICATION
}
```

**Step 2: 创建 Python 消息 DTO**

```python
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel

class MessageType(str, Enum):
    REQUEST = "request"
    RESPONSE = "response"
    NOTIFICATION = "notification"

class WebSocketMessage(BaseModel):
    type: MessageType
    request_id: Optional[str] = None
    payload: Dict[str, Any]
```

**Step 3: 编译验证**

```bash
cd /Users/qiuliang/code/alfred/backend
./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

**Step 4: Commit**

```bash
git add backend/src/main/kotlin/com/colafan/alfred/websocket/dto/MessageDto.kt py-service/dto/message.py
git commit -m "feat: add WebSocket message DTO"
```

---

## Task 3: Java WebSocket 配置

**Files:**
- Create: `backend/src/main/kotlin/com/colafan/alfred/config/WebSocketConfig.kt`

**Step 1: 创建 WebSocket 配置类**

```kotlin
package com.colafan.alfred.config

import com.colafan.alfred.websocket.client.WebSocketClient
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class WebSocketConfig(
    @Value("\${python-service.websocket.url:ws://localhost:8001}")
    private val webSocketUrl: String
) {

    @Bean
    fun webSocketClient(): WebSocketClient {
        return WebSocketClient(webSocketUrl)
    }
}
```

**Step 2: 编译验证**

```bash
./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

**Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/colafan/alfred/config/WebSocketConfig.kt
git commit -m "feat: add WebSocket configuration"
```

---

## Task 4: Java WebSocket 客户端实现

**Files:**
- Create: `backend/src/main/kotlin/com/colafan/alfred/websocket/client/WebSocketClient.kt`
- Create: `backend/src/main/kotlin/com/colafan/alfred/websocket/client/ReconnectWebSocketClient.kt`

**Step 1: 创建 WebSocket 客户端主类**

```kotlin
package com.colafan.alfred.websocket.client

import com.colafan.alfred.websocket.dto.MessageType
import com.colafan.alfred.websocket.dto.WebSocketMessage
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.stereotype.Component
import org.springframework.web.socket.*
import org.springframework.web.socket.client.standard.StandardWebSocketClient
import java.net.URI
import java.util.concurrent.*
import java.util.concurrent.atomic.AtomicBoolean

@Component
class WebSocketClient(
    private val url: String
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val objectMapper = jacksonObjectMapper()
    private val client = StandardWebSocketClient()
    private val session: AtomicReference<WebSocketSession?> = AtomicReference(null)
    private val messageQueue: LinkedBlockingQueue<WebSocketMessage> = LinkedBlockingQueue()
    private val isConnected = AtomicBoolean(false)
    private val handlers: ConcurrentHashMap<String, (WebSocketMessage) -> Unit> = ConcurrentHashMap()

    init {
        connect()
        startMessageSender()
    }

    private fun connect() {
        try {
            val session = client.doHandshake(WebSocketHandler(), URI(url))
            this.session.set(session)
            isConnected.set(true)
            logger.info("[WebSocket] 已连接: $url")
        } catch (e: Exception) {
            logger.error("[WebSocket] 连接失败: $url", e)
            scheduleReconnect()
        }
    }

    private inner class WebSocketHandler : WebSocketHandler {
        override fun afterConnectionEstablished(session: WebSocketSession) {
            logger.info("[WebSocket] 连接已建立")
        }

        override fun handleMessage(session: WebSocketSession, message: Any) {
            try {
                val json = message as String
                val msg = objectMapper.readValue(json, WebSocketMessage::class.java)

                // 设置 request-id 到 MDC
                msg.requestId?.let { MDC.put("request-id", it) }

                // 路由到处理器
                when (msg.type) {
                    MessageType.RESPONSE -> handleResponse(msg)
                    MessageType.NOTIFICATION -> handleNotification(msg)
                    MessageType.REQUEST -> handleRequest(msg)
                }

                MDC.remove("request-id")
            } catch (e: Exception) {
                logger.error("[WebSocket] 消息处理失败", e)
            }
        }

        override fun handleTransportError(session: WebSocketSession, exception: Throwable) {
            logger.error("[WebSocket] 传输错误", exception)
            isConnected.set(false)
            scheduleReconnect()
        }

        override fun afterConnectionClosed(session: WebSocketSession, status: CloseStatus) {
            logger.warn("[WebSocket] 连接已关闭: $status")
            isConnected.set(false)
            scheduleReconnect()
        }
    }

    fun sendMessage(message: WebSocketMessage): Boolean {
        return messageQueue.offer(message)
    }

    private fun startMessageSender() {
        Thread {
            while (true) {
                try {
                    val msg = messageQueue.poll(1, TimeUnit.SECONDS) ?: continue
                    if (!isConnected.get()) {
                        messageQueue.offer(msg)
                        continue
                    }

                    val json = objectMapper.writeValueAsString(msg)
                    session.get()?.sendMessage(TextMessage(json))
                    logger.debug("[WebSocket] 发送消息: ${msg.type}")
                } catch (e: Exception) {
                    logger.error("[WebSocket] 发送失败", e)
                }
            }
        }.start()
    }

    private fun scheduleReconnect() {
        Thread {
            var delay = 1000L
            while (!isConnected.get()) {
                try {
                    TimeUnit.MILLISECONDS.sleep(delay)
                    connect()
                    delay = (delay * 2).coerceAtMost(30000)
                } catch (e: InterruptedException) {
                    break
                }
            }
        }.start()
    }

    fun registerHandler(id: String, handler: (WebSocketMessage) -> Unit) {
        handlers[id] = handler
    }

    private fun handleResponse(msg: WebSocketMessage) {
        handlers[msg.requestId]?.invoke(msg)
    }

    private fun handleNotification(msg: WebSocketMessage) {
        handlers["notification"]?.invoke(msg)
    }

    private fun handleRequest(msg: WebSocketMessage) {
        handlers["request"]?.invoke(msg)
    }
}
```

**Step 2: 编译验证**

```bash
./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

**Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/colafan/alfred/websocket/client/WebSocketClient.kt
git commit -m "feat: add WebSocket client implementation"
```

---

## Task 5: Python WebSocket 端点

**Files:**
- Modify: `py-service/main.py`

**Step 1: 添加 WebSocket 依赖**

检查 `py-service/environment.yml` 或 `requirements.txt` 是否有 `websockets` 或 `fastapi[websocket]`。

如果没有，在 `py-service/environment.yml` 的 dependencies 中添加：

```yaml
dependencies:
  - websockets>=12.0
```

然后运行：

```bash
cd /Users/qiuliang/code/alfred/py-service
source venv/bin/pip install -r environment.yml
```

**Step 2: 在 main.py 中添加 WebSocket 端点**

在 `py-service/main.py` 的 import 部分添加：

```python
from fastapi import WebSocket
from fastapi.responses import JSONResponse
import websockets
import json
import asyncio
from typing import Dict, Set
```

在 `@app.on_event("startup")` 之前添加：

```python
# WebSocket 连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"[WebSocket] 客户端已连接: {client_id}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"[WebSocket] 客户端已断开: {client_id}")

    async def send_message(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            await websocket.send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()
```

在 `if __name__ == "__main__":` 之前添加 WebSocket 端点：

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"[WebSocket] 收到消息: {data}")
            # 处理消息并响应
            await handle_websocket_message(client_id, data)
    except Exception as e:
        logger.error(f"[WebSocket] 处理异常: {e}")
    finally:
        manager.disconnect(client_id)

async def handle_websocket_message(client_id: str, data: dict):
    msg_type = data.get("type")

    if msg_type == "request":
        # 处理同步请求
        response = await process_request(data)
        await manager.send_message(client_id, response)
    elif msg_type == "notification":
        # 处理异步通知
        await process_notification(data)

async def process_request(data: dict) -> dict:
    # TODO: 实现具体的业务逻辑
    return {
        "type": "response",
        "requestId": data.get("requestId"),
        "payload": {"result": "ok"}
    }

async def process_notification(data: dict):
    # TODO: 实现具体的业务逻辑
    logger.info(f"[WebSocket] 处理通知: {data}")
```

**Step 3: 测试导入**

```bash
cd /Users/qiuliang/code/alfred/py-service
source venv/bin/python -c "from main import manager; print('Import OK')"
```

Expected: Import OK

**Step 4: Commit**

```bash
git add py-service/main.py
git commit -m "feat: add WebSocket endpoint to Python service"
```

---

## Task 6: 添加心跳机制

**Files:**
- Modify: `backend/src/main/kotlin/com/colafan/alfred/websocket/client/WebSocketClient.kt`
- Modify: `py-service/main.py`

**Step 1: Java 端添加心跳**

在 `WebSocketClient` 类中添加心跳方法：

```kotlin
private fun startHeartbeat() {
    Thread {
        while (isConnected.get()) {
            try {
                TimeUnit.SECONDS.sleep(30)
                session.get()?.sendMessage(TextMessage("{"type":"ping"}"))
            } catch (e: Exception) {
                logger.error("[WebSocket] 心跳失败", e)
                isConnected.set(false)
                scheduleReconnect()
                break
            }
        }
    }.start()
}
```

在 `connect()` 方法成功后调用 `startHeartbeat()`。

**Step 2: Python 端添加心跳处理**

在 `handle_websocket_message` 函数中添加 ping/pong 处理：

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    last_pong = asyncio.get_event_loop().time()

    try:
        while True:
            data = await websocket.receive_json()

            # 处理心跳
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            # 检查心跳超时
            current_time = asyncio.get_event_loop().time()
            if current_time - last_pong > 60:
                logger.warning(f"[WebSocket] 心跳超时: {client_id}")
                break

            # 处理业务消息
            await handle_websocket_message(client_id, data)
    except Exception as e:
        logger.error(f"[WebSocket] 处理异常: {e}")
    finally:
        manager.disconnect(client_id)
```

**Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/colafan/alfred/websocket/client/WebSocketClient.kt py-service/main.py
git commit -m "feat: add heartbeat mechanism to WebSocket"
```

---

## Task 7: 添加日志记录

**Files:**
- Modify: `backend/src/main/kotlin/com/colafan/alfred/websocket/client/WebSocketClient.kt`

**Step 1: 增强日志记录**

在关键位置添加日志：

```kotlin
private val logger = LoggerFactory.getLogger(javaClass)

// 在连接建立时
logger.info("[WebSocket] 连接已建立，客户端ID: java-$port")

// 在发送消息时
logger.info("[WebSocket] 发送消息: type={}, requestId={}", msg.type, msg.requestId)

// 在接收消息时
logger.info("[WebSocket] 接收消息: type={}, requestId={}", msg.type, msg.requestId)

// 在连接断开时
logger.warn("[WebSocket] 连接已断开: status={}", status)

// 在重连时
logger.info("[WebSocket] 尝试重连，延迟={}ms", delay)
```

**Step 2: Commit**

```bash
git add backend/src/main/kotlin/com/colafan/alfred/websocket/client/WebSocketClient.kt
git commit -m "feat: add WebSocket logging"
```

---

## Task 8: Java 单元测试

**Files:**
- Create: `backend/src/test/kotlin/com/colafan/alfred/websocket/WebSocketClientTest.kt`

**Step 1: 创建单元测试**

```kotlin
package com.colafan.alfred.websocket

import org.junit.jupiter.api.Test
import org.mockito.kotlinkotlin.mock
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.client.standard.StandardWebSocketClient
import kotlin.test.assertEquals

class WebSocketClientTest {

    @Test
    fun `should send message successfully`() {
        // TODO: 实现 mock 测试
    }

    @Test
    fun `should reconnect on connection loss`() {
        // TODO: 实现 mock 测试
    }
}
```

**Step 2: 运行测试验证失败**

```bash
cd /Users/qiuliang/code/alfred/backend
./gradlew test --tests WebSocketClientTest
```

Expected: TODO errors or empty tests

**Step 3: Commit**

```bash
git add backend/src/test/kotlin/com/colafan/alfred/websocket/WebSocketClientTest.kt
git commit -m "test: add WebSocket client unit test skeleton"
```

---

## Task 9: Python 单元测试

**Files:**
- Create: `py-service/tests/test_websocket.py`

**Step 1: 创建测试文件**

```python
import pytest
from fastapi.testclient import TestClient
from main import app, manager

def test_websocket_connection():
    client = TestClient(app)

    with client.websocket_connect("/ws?client_id=test") as websocket:
        # 测试连接建立
        websocket.send_json({"type": "ping"})
        data = websocket.receive_json()
        assert data["type"] == "pong"

def test_websocket_message_handling():
    # TODO: 实现消息处理测试
    pass

def test_websocket_reconnect():
    # TODO: 实现重连测试
    pass
```

**Step 2: 创建 tests 目录**

```bash
mkdir -p /Users/qiuliang/code/alfred/py-service/tests
touch /Users/qiuliang/code/alfred/py-service/tests/__init__.py
```

**Step 3: 运行测试验证失败**

```bash
cd /Users/qiuliang/code/alfred/py-service
source venv/bin/pytest tests/test_websocket.py -v
```

Expected: TODO errors or empty tests

**Step 4: Commit**

```bash
git add py-service/tests/test_websocket.py py-service/tests/__init__.py
git commit -m "test: add WebSocket unit test skeleton"
```

---

## Task 10: 集成测试

**Files:**
- Create: `scripts/test_websocket_integration.sh`

**Step 1: 创建集成测试脚本**

```bash
#!/bin/bash

echo "=== WebSocket 集成测试 ==="

# 启动 Python 服务
cd /Users/qiuliang/code/alfred/py-service
source venv/bin/python main.py &
PYTHON_PID=$!
echo "Python 服务 PID: $PYTHON_PID"

# 等待服务启动
sleep 10

# 测试 WebSocket 连接（使用 websocat 或 curl）
# 这里简化为检查端口是否监听
if lsof -i :8001 > /dev/null 2>&1; then
    echo "✅ Python 服务已启动"
else
    echo "❌ Python 服务启动失败"
    kill $PYTHON_PID 2>/dev/null
    exit 1
fi

# 清理
kill $PYTHON_PID 2>/dev/null

echo "=== 集成测试完成 ==="
```

**Step 2: 添加执行权限**

```bash
chmod +x /Users/qiuliang/code/alfred/scripts/test_websocket_integration.sh
```

**Step 3: Commit**

```bash
git add scripts/test_websocket_integration.sh
git commit -m "test: add WebSocket integration test script"
```

---

## Task 11: 更新 Python 配置

**Files:**
- Modify: `backend/src/main/resources/application.yml`

**Step 1: 添加 WebSocket URL 配置**

在 `python-service` 配置下添加：

```yaml
python-service:
  websocket:
    url: ws://localhost:8001/ws
```

**Step 2: 编译验证**

```bash
cd /Users/qiuliang/code/alfred/backend
./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

**Step 3: Commit**

```bash
git add backend/src/main/resources/application.yml
git commit -m "config: add WebSocket URL configuration"
```

---

## Task 12: 清理 gRPC 依赖

**Files:**
- Modify: `backend/build.gradle.kts`

**Step 1: 移除 gRPC 依赖（如果独立存在）**

检查 `backend/build.gradle.kts` 中是否有 gRPC 相关依赖（如 `io.grpc:grpc-netty`）。如果有，删除对应行。

**Step 2: 刷新依赖**

```bash
cd /Users/qiuliang/code/alfred/backend
./gradlew build --refresh-dependencies
```

**Step 3: Commit**

```bash
git add backend/build.gradle.kts
git commit -m "refactor: remove gRPC dependencies"
```

---

## Task 13: 文档更新

**Files:**
- Modify: `docs/plans/2026-02-17-websocket-bidirectional-communication-design.md`
- Update: `CLAUDE.md`

**Step 1: 在设计文档中添加实施完成标记**

在设计文档末尾添加：

```markdown
## 实施状态

- [x] 设计完成
- [ ] Java WebSocket 客户端实现
- [ ] Python WebSocket 服务端实现
- [ ] 单元测试
- [ ] 集成测试
- [ ] 部署验证
```

**Step 2: 更新项目 CLAUDE.md**

在架构概览部分添加：

```
Frontend (React)
    ↓ REST API
Backend (Spring Boot) ←→ WebSocket 双向通讯 → Python FastAPI
    ↓ PostgreSQL
```

**Step 3: Commit**

```bash
git add docs/plans/2026-02-17-websocket-bidirectional-communication-design.md CLAUDE.md
git commit -m "docs: update architecture documentation with WebSocket"
```

---

## 实施顺序建议

1. 先完成 Task 1-3（清理和基础结构）
2. 再完成 Task 4-7（核心实现）
3. 最后完成 Task 8-13（测试和文档）

**总估计时间：** 4-6 小时

**关键风险：**
- WebSocket 连接稳定性：需要充分测试重连逻辑
- 消息顺序：队列机制确保消息不丢失
- 性能验证：压力测试确保满足每秒上百次的需求
