package com.colafan.alfred.dto

/**
 * 同步任务DTO
 */
data class SyncTaskDto(
    val id: Long,
    val stockCode: String,
    val taskName: String?,
    val taskType: String,
    val syncInterval: Int,
    val status: String,
    val lastSyncAt: String?,
    val lastSyncStatus: String?,
    val lastSyncRecords: Int,
    val totalRecords: Int,
    val lastError: String?,
    val enabled: Boolean,
    val createdAt: String,
    val updatedAt: String
)
