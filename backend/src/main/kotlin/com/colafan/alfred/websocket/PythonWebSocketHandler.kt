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

/**
 * Python 统一 WebSocket 处理器
 * 处理所有 Python → Java 的通信（K线、日志等）
 * 根据 type 字段路由到不同的业务处理器
 */
@Component
class PythonWebSocketHandler(
    private val klineBatchMessageHandler: KlineBatchMessageHandler,
    private val taskLogMessageHandler: TaskLogMessageHandler
) : TextWebSocketHandler() {

    private val logger: Logger = LoggerFactory.getLogger(PythonWebSocketHandler::class.java)
    private val objectMapper = ObjectMapper()

    override fun afterConnectionEstablished(session: WebSocketSession) {
        logger.info("Python WebSocket 连接建立: {}", session.id)
        session.sendMessage(TextMessage("{\"type\":\"connected\",\"message\":\"Python WebSocket 连接建立成功\"}"))
    }

    override fun handleTextMessage(session: WebSocketSession, message: TextMessage) {
        try {
            val payload = objectMapper.readTree(message.payload)
            val messageType = payload.path("type").asText()

            logger.debug("收到 Python 消息: type={}", messageType)

            when (messageType) {
                "batch_klines" -> klineBatchMessageHandler.handle(session, payload)
                "task_log" -> taskLogMessageHandler.handle(session, payload)
                "ping" -> handlePing(session)
                else -> {
                    logger.warn("未知的消息类型: {}", messageType)
                    session.sendMessage(TextMessage("{\"type\":\"error\",\"message\":\"未知的消息类型: $messageType\"}"))
                }
            }

        } catch (e: Exception) {
            logger.error("处理 Python 消息失败", e)
            try {
                session.sendMessage(TextMessage("{\"type\":\"error\",\"message\":\"${e.message}\"}"))
            } catch (ex: Exception) {
                logger.error("发送错误消息失败", ex)
            }
        }
    }

    private fun handlePing(session: WebSocketSession) {
        try {
            session.sendMessage(TextMessage("{\"type\":\"pong\"}"))
        } catch (e: Exception) {
            logger.error("回复 pong 失败", e)
        }
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: CloseStatus) {
        logger.info("Python WebSocket 连接关闭: session={}, status={}", session.id, status)
    }

    override fun handleTransportError(session: WebSocketSession, exception: Throwable) {
        logger.error("WebSocket 传输错误: session={}", session.id, exception)
    }
}
