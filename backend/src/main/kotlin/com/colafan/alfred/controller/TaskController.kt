package com.colafan.alfred.controller

import com.colafan.alfred.dto.task.AppendLogRequest
import com.colafan.alfred.dto.task.CreateExecutionRequest
import com.colafan.alfred.dto.task.ScheduleTaskRequest
import com.colafan.alfred.dto.task.UpdateExecutionRequest
import com.colafan.alfred.dto.task.UpdateProgressRequest
import com.colafan.alfred.dto.task.toDTO
import com.colafan.alfred.entity.ExecutionStatus
import com.colafan.alfred.service.TaskService
import com.colafan.alfred.websocket.MessageHandler
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * 任务管理控制器
 *
 * 提供任务调度和执行记录的 API
 */
@RestController
@RequestMapping("/api/v1/tasks")
class TaskController(
    private val taskService: TaskService,
    private val messageHandler: MessageHandler
) {

    /**
     * 创建或更新任务
     */
    @PostMapping
    fun createTask(@RequestBody request: ScheduleTaskRequest): ResponseEntity<Map<String, Any>> {
        val task = taskService.createOrUpdateTask(request)

        // 通知 Python 同步任务
        task.id?.let { taskId ->
            messageHandler.sendNotification("tasks.changed", mapOf(
                "taskId" to taskId,
                "taskName" to task.name,
                "autoRun" to task.autoRun
            ))
        }

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "data" to mapOf(
                "task" to task.toDTO()
            ),
            "message" to "任务已保存"
        ))
    }

    /**
     * 更新任务
     */
    @PutMapping("/{id}")
    fun updateTask(
        @PathVariable id: Int,
        @RequestBody request: ScheduleTaskRequest
    ): ResponseEntity<Map<String, Any>> {
        val task = taskService.updateTask(id, request)

        return if (task != null) {
            // 通知 Python 同步任务
            messageHandler.sendNotification("tasks.changed", mapOf(
                "taskId" to id,
                "taskName" to task.name,
                "autoRun" to task.autoRun
            ))

            ResponseEntity.ok(mapOf(
                "success" to true,
                "data" to mapOf(
                    "task" to task.toDTO()
                ),
                "message" to "任务已更新"
            ))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * 立即执行任务（单次执行）
     */
    @PostMapping("/execute")
    fun executeTask(@RequestBody request: CreateExecutionRequest): ResponseEntity<Map<String, Any>> {
        // 先在Java端创建执行记录
        val execution = taskService.createExecution(
            taskName = request.taskName,
            taskType = request.taskType,
            params = request.params
        )

        // 再调用 Python 端执行任务（带上 executionId）
        val response = messageHandler.sendRequest(
            action = "tasks.execute",
            payload = mapOf(
                "taskName" to request.taskName,
                "taskType" to request.taskType,
                "params" to (request.params ?: "{}"),
                "executionId" to execution.id  // 传入已创建的 executionId
            )
        )

        return if (response?.payload?.get("success") == true) {
            @Suppress("UNCHECKED_CAST")
            val data = response.payload["data"] as Map<String, Any>
            ResponseEntity.ok(mapOf(
                "success" to true,
                "data" to mapOf("execution" to execution.toDTO()),
                "message" to "任务已提交执行"
            ))
        } else {
            // Python执行失败，更新执行状态为失败
            taskService.updateExecutionStatus(execution.id, ExecutionStatus.FAILED, null, "Python服务执行失败")
            ResponseEntity.status(500).body(mapOf(
                "success" to false,
                "message" to "提交任务失败"
            ))
        }
    }

    /**
     * 获取所有任务
     */
    @GetMapping
    fun listTasks(): ResponseEntity<Map<String, Any>> {
        val tasks = taskService.getAllTasks()
        return ResponseEntity.ok(mapOf(
            "success" to true,
            "data" to mapOf(
                "tasks" to tasks.map { it.toDTO() }
            )
        ))
    }

    /**
     * 获取启用自动执行的任务
     */
    @GetMapping("/enabled")
    fun listEnabledTasks(): ResponseEntity<Map<String, Any>> {
        val tasks = taskService.getAutoRunTasks()
        return ResponseEntity.ok(mapOf(
            "success" to true,
            "data" to mapOf(
                "tasks" to tasks.map { it.toDTO() }
            )
        ))
    }

    /**
     * 删除任务
     */
    @DeleteMapping("/{id}")
    fun deleteTask(@PathVariable id: Int): ResponseEntity<Map<String, Any>> {
        val deleted = taskService.deleteTask(id)

        if (deleted) {
            // 通知 Python 同步任务
            messageHandler.sendNotification("tasks.changed", mapOf("taskId" to id))
        }

        return if (deleted) {
            ResponseEntity.ok(mapOf(
                "success" to true,
                "message" to "任务已删除"
            ))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * 启用/禁用自动执行
     */
    @PutMapping("/{id}/toggle")
    fun toggleTask(
        @PathVariable id: Int,
        @RequestParam enabled: Boolean
    ): ResponseEntity<Map<String, Any>> {
        val task = taskService.toggleAutoRun(id, enabled)

        if (task != null) {
            // 通知 Python 同步任务
            messageHandler.sendNotification("tasks.changed", mapOf(
                "taskId" to id,
                "autoRun" to enabled
            ))
        }

        return if (task != null) {
            ResponseEntity.ok(mapOf(
                "success" to true,
                "data" to mapOf(
                    "task" to task.toDTO()
                ),
                "message" to if (enabled) "自动执行已启用" else "自动执行已禁用"
            ))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * 获取执行记录状态
     */
    @GetMapping("/executions/{id}")
    fun getExecutionStatus(@PathVariable id: String): ResponseEntity<Map<String, Any>> {
        val execution = taskService.getExecution(id)

        return if (execution != null) {
            ResponseEntity.ok(mapOf(
                "success" to true,
                "data" to mapOf(
                    "execution" to execution.toDTO()
                )
            ))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * 创建执行记录
     */
    @PostMapping("/executions")
    fun createExecution(@RequestBody request: CreateExecutionRequest): ResponseEntity<Map<String, Any>> {
        val execution = taskService.createExecution(
            taskName = request.taskName,
            taskType = request.taskType,
            params = request.params
        )
        return ResponseEntity.ok(mapOf(
            "success" to true,
            "data" to mapOf(
                "execution" to execution.toDTO()
            ),
            "message" to "执行记录已创建"
        ))
    }

    /**
     * 更新执行状态
     */
    @PutMapping("/executions/{id}/status")
    fun updateExecutionStatus(
        @PathVariable id: String,
        @RequestBody request: UpdateExecutionRequest
    ): ResponseEntity<Map<String, Any>> {
        val execution = taskService.updateExecutionStatus(
            id = id,
            status = request.status,
            result = request.result,
            error = request.error
        )

        return if (execution != null) {
            ResponseEntity.ok(mapOf(
                "success" to true,
                "data" to mapOf(
                    "execution" to execution.toDTO()
                ),
                "message" to "执行状态已更新"
            ))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * 更新执行进度
     */
    @PutMapping("/executions/{id}/progress")
    fun updateExecutionProgress(
        @PathVariable id: String,
        @RequestBody request: UpdateProgressRequest
    ): ResponseEntity<Map<String, Any>> {
        val execution = taskService.updateExecutionProgress(id, request.progress)

        return if (execution != null) {
            ResponseEntity.ok(mapOf(
                "success" to true,
                "data" to mapOf(
                    "execution" to execution.toDTO()
                ),
                "message" to "执行进度已更新"
            ))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * 获取执行记录列表
     */
    @GetMapping("/executions")
    fun listExecutions(
        @RequestParam taskName: String?,
        @RequestParam(defaultValue = "50") limit: Int
    ): ResponseEntity<Map<String, Any>> {
        val executions = if (!taskName.isNullOrBlank()) {
            taskService.getExecutionHistory(taskName, limit)
        } else {
            taskService.getAllExecutions(limit)
        }
        return ResponseEntity.ok(mapOf(
            "success" to true,
            "data" to mapOf(
                "executions" to executions.map { it.toDTO() }
            )
        ))
    }

    /**
     * 取消执行
     */
    @DeleteMapping("/executions/{id}")
    fun cancelExecution(@PathVariable id: String): ResponseEntity<Map<String, Any>> {
        val execution = taskService.cancelExecution(id)

        return if (execution != null) {
            // 通知 Python 取消执行
            messageHandler.sendRequest(
                action = "tasks.cancel_execution",
                payload = mapOf("executionId" to id)
            )

            ResponseEntity.ok(mapOf(
                "success" to true,
                "data" to mapOf(
                    "execution" to execution.toDTO()
                ),
                "message" to "执行已取消"
            ))
        } else {
            ResponseEntity.status(400).body(mapOf(
                "success" to false,
                "message" to "无法取消该执行（状态不允许或不存在）"
            ))
        }
    }

    /**
     * 添加执行日志
     */
    @PostMapping("/executions/{id}/logs")
    fun appendExecutionLog(
        @PathVariable id: String,
        @RequestBody request: AppendLogRequest
    ): ResponseEntity<Map<String, Any>> {
        val execution = taskService.appendExecutionLog(id, request.level, request.message)
        return if (execution != null) {
            ResponseEntity.ok(mapOf(
                "success" to true,
                "data" to mapOf(
                    "execution" to execution.toDTO()
                ),
                "message" to "日志已添加"
            ))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * 获取执行日志
     */
    @GetMapping("/executions/{id}/logs")
    fun getExecutionLogs(
        @PathVariable id: String,
        @RequestParam(defaultValue = "0") fromLine: Int
    ): ResponseEntity<Map<String, Any>> {
        val logs = taskService.readExecutionLogs(id, fromLine)
        val totalCount = taskService.getLogLineCount(id)

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "data" to mapOf(
                "logs" to logs,
                "totalCount" to totalCount,
                "fromLine" to fromLine
            )
        ))
    }
}
