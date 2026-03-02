package com.colafan.alfred.dto.task

import com.colafan.alfred.entity.Task
import java.time.LocalDateTime

/**
 * 任务响应
 */
data class TaskDTO(
    val id: Int?,
    val name: String,
    val taskType: String,
    val autoRun: Boolean,
    val scheduleRule: String?,
    val params: String?,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)

/**
 * 将 Task 转换为 DTO
 */
fun Task.toDTO(): TaskDTO {
    return TaskDTO(
        id = this.id,
        name = this.name,
        taskType = this.taskType,
        autoRun = this.autoRun,
        scheduleRule = this.scheduleRule,
        params = this.params,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
