package com.colafan.alfred.controller

import com.colafan.alfred.dto.SyncTaskDto
import com.colafan.alfred.service.SyncTaskService
import com.colafan.alfred.service.AuthService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

/**
 * 同步任务控制器
 * 管理股票数据同步任务
 */
@RestController
@RequestMapping("/api/v1/sync-tasks")
@Tag(name = "同步任务", description = "股票数据同步任务管理")
class SyncTaskController(
    private val syncTaskService: SyncTaskService,
    private val authService: AuthService
) {

    /**
     * 获取同步任务列表
     */
    @GetMapping
    @Operation(summary = "获取任务列表", description = "获取当前用户的同步任务列表")
    fun getSyncTasks(authentication: Authentication): Map<String, Any> {
        val userId = getUserId(authentication)
        val tasks = syncTaskService.getSyncTasks(userId)

        return mapOf(
            "success" to true,
            "data" to tasks.map { it.toDto() }
        )
    }

    /**
     * 创建同步任务
     */
    @PostMapping
    @Operation(summary = "创建任务", description = "创建新的股票数据同步任务")
    fun createTask(
        @RequestBody request: CreateSyncTaskRequest,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)
        val task = syncTaskService.createTask(
            userId = userId,
            stockCode = request.stockCode,
            taskName = request.taskName,
            taskType = request.taskType ?: "kline",
            syncInterval = request.syncInterval ?: 1440
        )

        return mapOf(
            "success" to true,
            "data" to task.toDto()
        )
    }

    /**
     * 删除同步任务
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "删除任务", description = "删除指定的同步任务")
    fun deleteTask(
        @PathVariable id: Long,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)
        syncTaskService.deleteTask(userId, id)

        return mapOf("success" to true)
    }

    /**
     * 启动任务
     */
    @PutMapping("/{id}/start")
    @Operation(summary = "启动任务", description = "启动指定的同步任务")
    fun startTask(
        @PathVariable id: Long,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)
        val task = syncTaskService.startTask(userId, id)

        return mapOf(
            "success" to true,
            "data" to task.toDto()
        )
    }

    /**
     * 停止任务
     */
    @PutMapping("/{id}/stop")
    @Operation(summary = "停止任务", description = "停止指定的同步任务")
    fun stopTask(
        @PathVariable id: Long,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)
        val task = syncTaskService.stopTask(userId, id)

        return mapOf(
            "success" to true,
            "data" to task.toDto()
        )
    }

    /**
     * 手动触发同步
     */
    @PostMapping("/{id}/trigger")
    @Operation(summary = "触发同步", description = "手动触发一次同步")
    fun triggerSync(
        @PathVariable id: Long,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)
        val result = syncTaskService.triggerSync(userId, id)

        return result
    }

    /**
     * 根据股票代码同步数据
     */
    @PostMapping("/sync-by-code")
    @Operation(summary = "按代码同步", description = "根据股票代码触发同步")
    fun syncByCode(
        @RequestBody request: SyncByCodeRequest,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)
        val result = syncTaskService.syncByCode(userId, request.stockCode)

        return result
    }

    private fun getUserId(authentication: Authentication): Long {
        return authService.getCurrentUserId(authentication)
    }
}

/**
 * 请求DTO
 */
data class CreateSyncTaskRequest(
    val stockCode: String,
    val taskName: String? = null,
    val taskType: String? = "kline",
    val syncInterval: Int? = 1440
)

data class SyncByCodeRequest(
    val stockCode: String
)

/**
 * 扩展函数：转换为DTO
 */
fun com.colafan.alfred.entity.SyncTask.toDto() = SyncTaskDto(
    id = this.id!!,
    stockCode = this.stockCode,
    taskName = this.taskName,
    taskType = this.taskType,
    syncInterval = this.syncInterval,
    status = this.status,
    lastSyncAt = this.lastSyncAt?.toString(),
    lastSyncStatus = this.lastSyncStatus,
    lastSyncRecords = this.lastSyncRecords,
    totalRecords = this.totalRecords,
    lastError = this.lastError,
    enabled = this.enabled,
    createdAt = this.createdAt.toString(),
    updatedAt = this.updatedAt.toString()
)
