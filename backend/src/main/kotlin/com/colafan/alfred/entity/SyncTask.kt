package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 股票数据同步任务
 */
@Entity
@Table(name = "sync_tasks", uniqueConstraints = [
    UniqueConstraint(columnNames = ["user_id", "stock_code", "task_type"])
])
class SyncTask(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "stock_code", nullable = false, length = 20)
    val stockCode: String,

    @Column(name = "task_name", length = 100)
    var taskName: String? = null,

    @Column(name = "task_type", nullable = false, length = 20)
    val taskType: String = "kline",

    @Column(name = "sync_interval", nullable = false)
    var syncInterval: Int = 1440,

    @Column(name = "status", nullable = false, length = 20)
    var status: String = "stopped",

    @Column(name = "last_sync_at")
    var lastSyncAt: LocalDateTime? = null,

    @Column(name = "last_sync_status", length = 20)
    var lastSyncStatus: String? = null,

    @Column(name = "last_sync_records")
    var lastSyncRecords: Int = 0,

    @Column(name = "last_error", columnDefinition = "TEXT")
    var lastError: String? = null,

    @Column(name = "total_records")
    var totalRecords: Int = 0,

    @Column(name = "enabled", nullable = false)
    var enabled: Boolean = true,

    @Column(name = "created_at", updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at")
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = LocalDateTime.now()
    }
}
