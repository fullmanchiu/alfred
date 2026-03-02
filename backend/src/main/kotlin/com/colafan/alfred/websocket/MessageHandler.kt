package com.colafan.alfred.websocket

import com.colafan.alfred.websocket.dto.MessageType
import com.colafan.alfred.websocket.dto.WebSocketMessage
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * WebSocket 消息处理服务
 *
 * 提供通过统一 WebSocket 向 Python 发送消息的接口。
 * 由于 Python 作为客户端连接到 Java，这里通过已建立的会话发送消息。
 */
@Service
class MessageHandler(
    private val objectMapper: ObjectMapper
) {
    private val logger = LoggerFactory.getLogger(MessageHandler::class.java)

    // 存储挂起的请求（requestId -> CompletableFuture）
    private val pendingRequests = ConcurrentHashMap<String, CompletableFuture<WebSocketMessage>>()

    // 存储 Python 客户端的会话
    @Volatile
    private var pythonSession: WebSocketSession? = null

    /**
     * 注册 Python 会话
     */
    fun registerPythonSession(session: WebSocketSession) {
        pythonSession = session
        logger.info("Python 会话已注册: sessionId={}", session.id)
    }

    /**
     * 注销 Python 会话
     */
    fun unregisterPythonSession(session: WebSocketSession) {
        if (pythonSession?.id == session.id) {
            pythonSession = null
            logger.info("Python 会话已注销: sessionId={}", session.id)
        }
    }

    /**
     * 发送请求并等待响应
     */
    fun sendRequest(action: String, payload: Map<String, Any>): WebSocketMessage? {
        val session = pythonSession
        if (session == null || !session.isOpen) {
            logger.error("Python 客户端未连接，无法发送请求: action={}", action)
            return null
        }

        val message = WebSocketMessage(
            type = MessageType.REQUEST,
            requestId = UUID.randomUUID().toString(),
            payload = payload + ("action" to action)
        )

        return try {
            // 发送消息
            session.sendMessage(TextMessage(objectMapper.writeValueAsString(message)))

            // 如果是请求类型，等待响应
            if (message.type == MessageType.REQUEST) {
                message.requestId?.let { requestId ->
                    val future = CompletableFuture<WebSocketMessage>()
                    pendingRequests[requestId] = future

                    try {
                        return future.get(10, TimeUnit.SECONDS)
                    } finally {
                        pendingRequests.remove(requestId)
                    }
                }
            }
            null
        } catch (e: Exception) {
            logger.error("发送请求失败: action=${action}, ${e.message}", e)
            null
        }
    }

    /**
     * 发送通知（无需响应）
     */
    fun sendNotification(action: String, payload: Map<String, Any>): Boolean {
        val session = pythonSession
        if (session == null || !session.isOpen) {
            logger.warn("Python 客户端未连接，通知已丢弃: action={}", action)
            return false
        }

        val message = WebSocketMessage(
            type = MessageType.NOTIFICATION,
            requestId = null,
            payload = payload + ("action" to action)
        )

        return try {
            session.sendMessage(TextMessage(objectMapper.writeValueAsString(message)))
            true
        } catch (e: Exception) {
            logger.error("发送通知失败: action=${action}, ${e.message}", e)
            false
        }
    }

    /**
     * 处理响应消息
     */
    fun handleResponse(response: WebSocketMessage) {
        response.requestId?.let { requestId ->
            pendingRequests[requestId]?.complete(response)
            pendingRequests.remove(requestId)
        }
    }

    /**
     * 检查 Python 客户端是否已连接
     */
    fun isConnected(): Boolean {
        return pythonSession?.isOpen == true
    }
}
