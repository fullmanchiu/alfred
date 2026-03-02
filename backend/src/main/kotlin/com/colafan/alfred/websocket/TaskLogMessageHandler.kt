package com.colafan.alfred.websocket

import com.colafan.alfred.service.TaskService
import com.fasterxml.jackson.databind.JsonNode
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Lazy
import org.springframework.stereotype.Component
import org.springframework.web.socket.WebSocketSession

/**
 * 任务日志消息处理器
 * 处理 task_log 类型的消息，保存到日志文件并转发到前端
 */
@Component
class TaskLogMessageHandler(
    private val taskService: TaskService,
    @Lazy private val unifiedWebSocketHandler: UnifiedWebSocketHandler
) {

    private val logger: Logger = LoggerFactory.getLogger(TaskLogMessageHandler::class.java)

    /**
     * 处理任务日志消息
     */
    fun handle(session: WebSocketSession, payload: JsonNode) {
        try {
            // 从嵌套的 payload 中提取数据
            val dataPayload = payload.path("payload")
            val timestamp = dataPayload.path("timestamp").asText()
            val level = dataPayload.path("level").asText()
            val logMessage = dataPayload.path("message").asText()
            val executionId = dataPayload.path("executionId").asText()

            // 保存到日志文件（通过 TaskService）
            taskService.appendExecutionLog(executionId, level, logMessage)

            // 转发到前端（实时显示）
            val broadcastData = mapOf(
                "type" to "task_log",
                "executionId" to executionId,
                "timestamp" to timestamp,
                "level" to level,
                "message" to logMessage
            )

            unifiedWebSocketHandler.broadcastToFrontend(broadcastData)

            logger.debug("处理日志消息: [{}] {}", level, logMessage)

        } catch (e: Exception) {
            logger.error("处理日志消息失败", e)
        }
    }
}
