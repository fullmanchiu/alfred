package com.colafan.alfred.service

import com.colafan.alfred.dto.task.ScheduleTaskRequest
import com.colafan.alfred.entity.ExecutionStatus
import com.colafan.alfred.entity.Task
import com.colafan.alfred.entity.TaskExecution
import com.colafan.alfred.repository.TaskRepository
import com.colafan.alfred.repository.TaskExecutionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * 任务服务
 *
 * 负责管理任务配置和执行记录
 */
@Service
class TaskService(
    private val taskRepository: TaskRepository,
    private val taskExecutionRepository: TaskExecutionRepository,
    private val logFileService: LogFileService
) {
    private val logger = LoggerFactory.getLogger(TaskService::class.java)

    /**
     * 创建或更新任务
     */
    @Transactional
    fun createOrUpdateTask(request: ScheduleTaskRequest): Task {
        val task = taskRepository.findByName(request.name)
            ?: Task(
                name = request.name,
                taskType = request.taskType,
                autoRun = false
            )

        task.apply {
            taskType = request.taskType
            autoRun = request.autoRun ?: false

            // 根据 scheduleType 构建 scheduleRule
            scheduleRule = when (request.scheduleType) {
                "cron" -> request.cronExpr?.let { "cron:$it" }
                "interval" -> request.intervalSeconds?.let { "interval:$it" }
                else -> null
            }

            params = request.params
        }

        val savedTask = taskRepository.save(task)
        logger.info("任务已保存: ${savedTask.name}, autoRun: ${savedTask.autoRun}, scheduleRule: ${savedTask.scheduleRule}")
        return savedTask
    }

    /**
     * 获取所有任务
     */
    fun getAllTasks(): List<Task> {
        return taskRepository.findAll()
    }

    /**
     * 获取启用自动执行的任务
     */
    fun getAutoRunTasks(): List<Task> {
        return taskRepository.findByAutoRunTrue()
    }

    /**
     * 根据名称获取任务
     */
    fun getTaskByName(name: String): Task? {
        return taskRepository.findByName(name)
    }

    /**
     * 创建执行记录
     */
    @Transactional
    fun createExecution(taskName: String, taskType: String, params: String?): TaskExecution {
        val execution = TaskExecution(
            taskName = taskName,
            status = ExecutionStatus.PENDING,
            params = params
        )
        val saved = taskExecutionRepository.save(execution)
        // 设置日志文件路径
        saved.logFilePath = logFileService.getLogFilePath(saved.id)
        logger.info("创建执行记录: ${saved.id}, 任务: $taskName, 日志文件: ${saved.logFilePath}")
        return taskExecutionRepository.save(saved)
    }

    /**
     * 更新执行状态
     */
    @Transactional
    fun updateExecutionStatus(
        id: String,
        status: ExecutionStatus,
        result: String? = null,
        error: String? = null
    ): TaskExecution? {
        val execution = taskExecutionRepository.findById(id).orElse(null)
            ?: return null

        execution.apply {
            this.status = status
            result?.let { this.result = it }
            error?.let { this.error = it }

            when (status) {
                ExecutionStatus.RUNNING -> startedAt = LocalDateTime.now()
                ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED -> {
                    completedAt = LocalDateTime.now()
                    progress = 100 // 完成时进度设为 100
                }
                else -> {}
            }
        }

        val saved = taskExecutionRepository.save(execution)
        logger.info("更新执行状态: ${saved.id}, 状态: $status")
        return saved
    }

    /**
     * 更新执行进度
     * 用于长时间运行的任务报告进度
     */
    @Transactional
    fun updateExecutionProgress(id: String, progress: Int): TaskExecution? {
        val execution = taskExecutionRepository.findById(id).orElse(null)
            ?: return null

        execution.apply {
            this.progress = progress.coerceIn(0, 100)
        }

        val saved = taskExecutionRepository.save(execution)
        logger.debug("更新执行进度: ${saved.id}, 进度: $progress%")
        return saved
    }

    /**
     * 获取执行记录
     */
    fun getExecution(id: String): TaskExecution? {
        return taskExecutionRepository.findById(id).orElse(null)
    }

    /**
     * 获取任务执行历史
     */
    fun getExecutionHistory(taskName: String, limit: Int = 10): List<TaskExecution> {
        return taskExecutionRepository.findByTaskNameOrderByCreatedAtDesc(taskName).take(limit)
    }

    /**
     * 获取所有执行记录
     */
    fun getAllExecutions(limit: Int = 50): List<TaskExecution> {
        return taskExecutionRepository.findAllByOrderByCreatedAtDesc().take(limit)
    }

    /**
     * 删除任务
     */
    @Transactional
    fun deleteTask(id: Int): Boolean {
        return if (taskRepository.existsById(id)) {
            taskRepository.deleteById(id)
            true
        } else {
            false
        }
    }

    /**
     * 通过ID更新任务
     */
    @Transactional
    fun updateTask(id: Int, request: ScheduleTaskRequest): Task? {
        val task = taskRepository.findById(id).orElse(null) ?: return null

        task.apply {
            name = request.name
            taskType = request.taskType
            autoRun = request.autoRun ?: false

            // 根据 scheduleType 构建 scheduleRule
            scheduleRule = when (request.scheduleType) {
                "cron" -> request.cronExpr?.let { "cron:$it" }
                "interval" -> request.intervalSeconds?.let { "interval:$it" }
                else -> null
            }

            params = request.params
        }

        val savedTask = taskRepository.save(task)
        logger.info("任务已更新: ${savedTask.name}, autoRun: ${savedTask.autoRun}, scheduleRule: ${savedTask.scheduleRule}")
        return savedTask
    }

    /**
     * 启用/禁用自动执行
     */
    @Transactional
    fun toggleAutoRun(id: Int, autoRun: Boolean): Task? {
        val task = taskRepository.findById(id).orElse(null) ?: return null
        task.autoRun = autoRun
        return taskRepository.save(task)
    }

    /**
     * 取消执行
     */
    @Transactional
    fun cancelExecution(id: String): TaskExecution? {
        val execution = taskExecutionRepository.findById(id).orElse(null) ?: return null

        // 只能取消 PENDING 或 RUNNING 状态的执行
        if (execution.status != ExecutionStatus.PENDING && execution.status != ExecutionStatus.RUNNING) {
            return null
        }

        execution.status = ExecutionStatus.CANCELLED
        execution.completedAt = LocalDateTime.now()
        return taskExecutionRepository.save(execution)
    }

    /**
     * 添加执行日志（写入文件）
     */
    fun appendExecutionLog(id: String, level: String, message: String): TaskExecution? {
        val execution = taskExecutionRepository.findById(id).orElse(null) ?: return null

        // 写入日志文件
        logFileService.appendLog(id, level, message)

        // 确保数据库中有日志文件路径
        if (execution.logFilePath == null) {
            execution.logFilePath = logFileService.getLogFilePath(id)
            return taskExecutionRepository.save(execution)
        }

        return execution
    }

    /**
     * 读取日志内容
     */
    fun readExecutionLogs(id: String, fromLine: Int = 0): List<String> {
        return logFileService.readLogsFrom(id, fromLine)
    }

    /**
     * 获取日志行数
     */
    fun getLogLineCount(id: String): Int {
        return logFileService.getLogLineCount(id)
    }
}
