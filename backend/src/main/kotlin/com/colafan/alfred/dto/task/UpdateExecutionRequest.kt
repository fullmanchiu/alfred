package com.colafan.alfred.dto.task

import com.colafan.alfred.entity.ExecutionStatus

/**
 * 更新执行状态请求
 */
data class UpdateExecutionRequest(
    val status: ExecutionStatus,
    val result: String? = null,
    val error: String? = null
)
