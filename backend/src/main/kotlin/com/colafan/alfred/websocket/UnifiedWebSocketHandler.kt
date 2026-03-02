package com.colafan.alfred.websocket

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.TextWebSocketHandler
import java.util.concurrent.CopyOnWriteArrayList

/**
 * 统一 WebSocket 处理器
 *
 * 处理所有通过 /api/ws 连接的客户端（Python、前端等）
 * 根据 clientType 路由消息到不同的业务处理器
 */
@Component
class UnifiedWebSocketHandler(
    private val klineBatchMessageHandler: KlineBatchMessageHandler,
    private val taskLogMessageHandler: TaskLogMessageHandler,
    private val taskStatusMessageHandler: TaskStatusMessageHandler,
    private val taskProgressMessageHandler: TaskProgressMessageHandler,
    private val messageHandler: MessageHandler
) : TextWebSocketHandler() {

    private val logger: Logger = LoggerFactory.getLogger(UnifiedWebSocketHandler::class.java)
    private val objectMapper = ObjectMapper()

    // 存储会话的客户端类型
    private val sessionClientTypes = mutableMapOf<String, String>()

    // 前端客户端会话列表（线程安全）
    private val frontendSessions = CopyOnWriteArrayList<WebSocketSession>()

    override fun afterConnectionEstablished(session: WebSocketSession) {
        logger.info("WebSocket 连接建立: sessionId={}, 等待握手...", session.id)
    }

    override fun handleTextMessage(session: WebSocketSession, message: TextMessage) {
        try {
            val payload = objectMapper.readTree(message.payload)
            val messageType = payload.path("type").asText()

            logger.debug("收到消息: type={}, sessionId={}", messageType, session.id)

            // 处理握手消息
            when (messageType) {
                "handshake" -> handleHandshake(session, payload)
                "heartbeat" -> handleHeartbeat(session)
                "response" -> handleResponse(session, payload)
                "taskLog" -> taskLogMessageHandler.handle(session, payload)
                "taskStatus" -> taskStatusMessageHandler.handle(session, payload)
                "taskProgress" -> taskProgressMessageHandler.handle(session, payload)
                "klineBatch" -> klineBatchMessageHandler.handle(session, payload)
                "pong" -> logger.debug("收到 pong")
                else -> {
                    val clientType = sessionClientTypes[session.id]
                    logger.warn("未知的消息类型: type={}, clientType={}", messageType, clientType)
                    session.sendMessage(TextMessage("{\"type\":\"error\",\"message\":\"未知的消息类型: $messageType\"}"))
                }
            }

        } catch (e: Exception) {
            logger.error("处理消息失败: sessionId={}", session.id, e)
            try {
                session.sendMessage(TextMessage("{\"type\":\"error\",\"message\":\"${e.message}\"}"))
            } catch (ex: Exception) {
                logger.error("发送错误消息失败", ex)
            }
        }
    }

    private fun handleHandshake(session: WebSocketSession, payload: JsonNode) {
        val clientType = payload.path("payload").path("clientType").asText()
        sessionClientTypes[session.id] = clientType

        logger.info("握手成功: sessionId={}, clientType={}", session.id, clientType)

        // 如果是 Python 客户端，注册到 MessageHandler
        if (clientType == "python") {
            messageHandler.registerPythonSession(session)
        } else if (clientType == "frontend") {
            // 前端客户端加入会话列表
            frontendSessions.add(session)
            logger.info("前端客户端加入: sessionId={}, 当前前端连接数: {}", session.id, frontendSessions.size)
        }

        // 发送确认消息
        val response = mapOf(
            "type" to "handshakeAck",
            "payload" to mapOf(
                "clientType" to clientType,
                "serverTime" to System.currentTimeMillis()
            ),
            "timestamp" to System.currentTimeMillis()
        )
        session.sendMessage(TextMessage(objectMapper.writeValueAsString(response)))
    }

    private fun handleHeartbeat(session: WebSocketSession) {
        try {
            val pong = mapOf(
                "type" to "pong",
                "timestamp" to System.currentTimeMillis()
            )
            session.sendMessage(TextMessage(objectMapper.writeValueAsString(pong)))
        } catch (e: Exception) {
            logger.error("回复 pong 失败: sessionId={}", session.id, e)
        }
    }

    private fun handleResponse(session: WebSocketSession, payload: JsonNode) {
        try {
            val requestId = payload.path("requestId").asText()
            logger.debug("收到响应: requestId={}", requestId)

            // 解析响应消息
            val response = com.colafan.alfred.websocket.dto.WebSocketMessage(
                type = com.colafan.alfred.websocket.dto.MessageType.RESPONSE,
                requestId = requestId,
                payload = objectMapper.convertValue(payload.path("payload"), object : com.fasterxml.jackson.core.type.TypeReference<Map<String, Any>>() {})
            )

            // 通知 MessageHandler 完成 CompletableFuture
            messageHandler.handleResponse(response)
        } catch (e: Exception) {
            logger.error("处理响应失败: sessionId={}", session.id, e)
        }
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: CloseStatus) {
        val clientType = sessionClientTypes.remove(session.id)

        // 如果是 Python 客户端，从 MessageHandler 注销
        if (clientType == "python") {
            messageHandler.unregisterPythonSession(session)
        } else if (clientType == "frontend") {
            // 前端客户端移除
            frontendSessions.remove(session)
            logger.info("前端客户端断开: sessionId={}, 当前前端连接数: {}", session.id, frontendSessions.size)
        }

        logger.info("WebSocket 连接关闭: sessionId={}, clientType={}, status={}",
            session.id, clientType, status)
    }

    override fun handleTransportError(session: WebSocketSession, exception: Throwable) {
        val clientType = sessionClientTypes[session.id]
        logger.error("WebSocket 传输错误: sessionId={}, clientType={}",
            session.id, clientType, exception)
    }

    /**
     * 检查指定类型的客户端是否已连接
     */
    fun isClientConnected(clientType: String): Boolean {
        return sessionClientTypes.values.any { it == clientType }
    }

    /**
     * 获取已连接的客户端类型列表
     */
    fun getConnectedClientTypes(): Set<String> {
        return sessionClientTypes.values.toSet()
    }

    /**
     * 广播消息到所有前端客户端
     */
    fun broadcastToFrontend(data: Map<String, Any?>) {
        try {
            val message = objectMapper.writeValueAsString(data)
            frontendSessions.forEach { session ->
                try {
                    if (session.isOpen) {
                        session.sendMessage(TextMessage(message))
                    }
                } catch (e: Exception) {
                    logger.error("发送消息到前端失败: sessionId={}, error={}", session.id, e.message, e)
                }
            }
            logger.debug("广播消息到 {} 个前端客户端: type={}", frontendSessions.size, data["type"])
        } catch (e: Exception) {
            logger.error("序列化广播消息失败: error={}", e.message, e)
        }
    }

    /**
     * 获取前端连接数
     */
    fun getFrontendConnectionCount(): Int {
        return frontendSessions.size
    }
}
