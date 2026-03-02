package com.colafan.alfred.entity

import org.hibernate.type.SqlTypes
import org.hibernate.annotations.JdbcTypeCode
import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 任务执行状态枚举
 */
enum class ExecutionStatus {
    PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
}

/**
 * 任务执行记录实体
 *
 * 记录每次任务执行的详细信息，包括状态、重试次数、结果和错误信息
 */
@Entity
@Table(name = "task_executions")
data class TaskExecution(
    @Id
    @Column(length = 36)
    val id: String = java.util.UUID.randomUUID().toString(),

    @Column(nullable = false)
    var taskName: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ExecutionStatus = ExecutionStatus.PENDING,

    @Column
    var retryCount: Int = 0,

    @Column
    var maxRetries: Int = 3,

    @JdbcTypeCode(SqlTypes.JSON)
    var params: String? = null, // JSON 字符串存储任务参数

    @Column
    var startedAt: LocalDateTime? = null,

    @Column
    var completedAt: LocalDateTime? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    var result: String? = null, // JSON 字符串存储

    @Column
    var error: String? = null,

    /**
     * 执行进度 (0-100)
     * 用于长时间运行的任务报告进度
     */
    @Column
    var progress: Int = 0,

    /**
     * 日志文件路径（相对于日志目录）
     * 存储任务执行过程中的日志信息
     */
    @Column(length = 500)
    var logFilePath: String? = null,

    @Column(nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()
) {
    @PrePersist
    fun prePersist() {
        if (createdAt == LocalDateTime.now()) {
            createdAt = LocalDateTime.now()
        }
    }

    companion object {
        /** 默认最大重试次数 */
        const val DEFAULT_MAX_RETRIES = 3
    }
}
