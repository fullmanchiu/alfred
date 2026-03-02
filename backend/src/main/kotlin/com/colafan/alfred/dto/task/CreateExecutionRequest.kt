package com.colafan.alfred.dto.task

/**
 * 创建执行记录请求
 */
data class CreateExecutionRequest(
    val taskName: String,
    val taskType: String,
    val params: String? = null
)
