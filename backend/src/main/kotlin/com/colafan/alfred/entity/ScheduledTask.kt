package com.colafan.alfred.entity

import org.hibernate.type.SqlTypes
import org.hibernate.annotations.JdbcTypeCode
import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 任务实体
 *
 * 用于配置和管理各类任务，支持手动执行和自动执行（调度）
 */
@Entity
@Table(name = "tasks")
data class Task(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(unique = true, nullable = false)
    var name: String,

    @Column(nullable = false)
    var taskType: String,

    /**
     * 是否启用自动执行
     * true = 按照 scheduleRule 自动执行
     * false = 只能手动执行
     */
    @Column(nullable = false)
    var autoRun: Boolean = false,

    /**
     * 调度规则
     * null = 没有规则（只能手动执行）
     * "cron:0 9 * * *" = cron 表达式
     * "interval:3600" = 间隔秒数
     */
    @Column
    var scheduleRule: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    var params: String? = null, // JSON 字符串存储

    @Column(nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    @PrePersist
    fun prePersist() {
        val now = LocalDateTime.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = LocalDateTime.now()
    }

    /**
     * 解析调度规则
     * @return Pair<类型, 值>，例如 Pair("cron", "0 9 * * *") 或 Pair("interval", "3600")
     */
    fun parseScheduleRule(): Pair<String, String>? {
        val rule = scheduleRule
        if (rule.isNullOrBlank()) return null
        val parts = rule.split(":", limit = 2)
        if (parts.size != 2) return null
        return Pair(parts[0], parts[1])
    }

    /**
     * 是否是 cron 调度
     */
    fun isCronSchedule(): Boolean {
        return parseScheduleRule()?.first == "cron"
    }

    /**
     * 是否是 interval 调度
     */
    fun isIntervalSchedule(): Boolean {
        return parseScheduleRule()?.first == "interval"
    }

    /**
     * 获取 cron 表达式
     */
    fun getCronExpr(): String? {
        val parsed = parseScheduleRule()
        return if (parsed?.first == "cron") parsed.second else null
    }

    /**
     * 获取间隔秒数
     */
    fun getIntervalSeconds(): Int? {
        val parsed = parseScheduleRule()
        return if (parsed?.first == "interval") parsed.second.toIntOrNull() else null
    }

    companion object {
        /** 任务类型：Python 函数 */
        const val TASK_TYPE_PYTHON_FUNCTION = "python_function"

        /** 任务类型：HTTP 请求 */
        const val TASK_TYPE_HTTP_REQUEST = "http_request"

        /** 任务类型：Shell 命令 */
        const val TASK_TYPE_SHELL_COMMAND = "shell_command"
    }
}
