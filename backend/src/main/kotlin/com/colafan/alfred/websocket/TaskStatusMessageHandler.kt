package com.colafan.alfred.websocket

import com.colafan.alfred.entity.ExecutionStatus
import com.colafan.alfred.service.TaskService
import com.fasterxml.jackson.databind.JsonNode
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Lazy
import org.springframework.stereotype.Component
import org.springframework.web.socket.WebSocketSession

/**
 * 任务状态消息处理器
 * 处理 task_status 类型的消息，更新执行状态并转发到前端
 */
@Component
class TaskStatusMessageHandler(
    private val taskService: TaskService,
    @Lazy private val unifiedWebSocketHandler: UnifiedWebSocketHandler
) {

    private val logger: Logger = LoggerFactory.getLogger(TaskStatusMessageHandler::class.java)

    /**
     * 处理任务状态消息
     */
    fun handle(session: WebSocketSession, payload: JsonNode) {
        try {
            // 从嵌套的 payload 中提取数据
            val dataPayload = payload.path("payload")
            val executionId = dataPayload.path("executionId").asText()
            val statusStr = dataPayload.path("status").asText().uppercase()
            val result = dataPayload.path("result")
            val error = dataPayload.path("error").asText(null)

            // 转换状态枚举
            val status = try {
                ExecutionStatus.valueOf(statusStr)
            } catch (e: IllegalArgumentException) {
                logger.warn("无效的状态值: {}", statusStr)
                return
            }

            // 更新执行状态
            taskService.updateExecutionStatus(
                id = executionId,
                status = status,
                result = if (result.isNull) null else result.toString(),
                error = error
            )

            // 转发到前端
            val broadcastData = mapOf(
                "type" to "task_status",
                "executionId" to executionId,
                "status" to status.name,
                "result" to result?.asText(null),
                "error" to error
            )

            unifiedWebSocketHandler.broadcastToFrontend(broadcastData)

            logger.debug("处理状态更新: executionId={}, status={}", executionId, status)

        } catch (e: Exception) {
            logger.error("处理状态消息失败", e)
        }
    }
}
