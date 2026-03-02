package com.colafan.alfred.dto.task

/**
 * 任务请求
 */
data class ScheduleTaskRequest(
    val name: String,
    val taskType: String,
    val scheduleType: String? = null,        // "cron" or "interval" or null
    val cronExpr: String? = null,            // cron 表达式
    val intervalSeconds: Int? = null,        // 间隔秒数
    val autoRun: Boolean? = false,           // 是否自动执行
    val params: String? = null
)
