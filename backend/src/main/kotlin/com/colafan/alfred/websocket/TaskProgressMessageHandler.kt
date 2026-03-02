package com.colafan.alfred.websocket

import com.colafan.alfred.service.TaskService
import com.fasterxml.jackson.databind.JsonNode
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Lazy
import org.springframework.stereotype.Component
import org.springframework.web.socket.WebSocketSession

/**
 * 任务进度消息处理器
 * 处理 task_progress 类型的消息，更新执行进度并转发到前端
 */
@Component
class TaskProgressMessageHandler(
    private val taskService: TaskService,
    @Lazy private val unifiedWebSocketHandler: UnifiedWebSocketHandler
) {

    private val logger: Logger = LoggerFactory.getLogger(TaskProgressMessageHandler::class.java)

    /**
     * 处理任务进度消息
     */
    fun handle(session: WebSocketSession, payload: JsonNode) {
        try {
            // 从嵌套的 payload 中提取数据
            val dataPayload = payload.path("payload")
            val executionId = dataPayload.path("executionId").asText()
            val progress = dataPayload.path("progress").asInt()

            // 确保进度在 0-100 之间
            val clampedProgress = maxOf(0, minOf(100, progress))

            // 更新执行进度
            taskService.updateExecutionProgress(executionId, clampedProgress)

            // 转发到前端
            val broadcastData = mapOf(
                "type" to "task_progress",
                "executionId" to executionId,
                "progress" to clampedProgress
            )

            unifiedWebSocketHandler.broadcastToFrontend(broadcastData)

            logger.debug("处理进度更新: executionId={}, progress={}%", executionId, clampedProgress)

        } catch (e: Exception) {
            logger.error("处理进度消息失败", e)
        }
    }
}
