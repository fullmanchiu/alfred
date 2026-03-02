package com.colafan.alfred.dto.task

/**
 * 添加日志请求
 */
data class AppendLogRequest(
    val level: String,  // INFO, WARNING, ERROR, DEBUG
    val message: String
)
