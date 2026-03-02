package com.colafan.alfred.dto.task

import com.colafan.alfred.entity.ExecutionStatus
import com.colafan.alfred.entity.TaskExecution
import java.time.LocalDateTime

/**
 * 任务执行记录响应
 */
data class TaskExecutionDTO(
    val id: String,
    val taskName: String,
    val status: ExecutionStatus,
    val retryCount: Int,
    val maxRetries: Int,
    val params: String?,
    val startedAt: LocalDateTime?,
    val completedAt: LocalDateTime?,
    val result: String?,
    val error: String?,
    val progress: Int,  // 执行进度 0-100
    val logFilePath: String?,  // 日志文件路径
    val createdAt: LocalDateTime
)

/**
 * 将 TaskExecution 转换为 DTO
 */
fun TaskExecution.toDTO(): TaskExecutionDTO {
    return TaskExecutionDTO(
        id = this.id,
        taskName = this.taskName,
        status = this.status,
        retryCount = this.retryCount,
        maxRetries = this.maxRetries,
        params = this.params,
        startedAt = this.startedAt,
        completedAt = this.completedAt,
        result = this.result,
        error = this.error,
        progress = this.progress,
        logFilePath = this.logFilePath,
        createdAt = this.createdAt
    )
}
