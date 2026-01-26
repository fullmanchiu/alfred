package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 系统配置实体
 *
 * 用于存储系统级别的配置信息，如分类配置版本号等。
 * 每个配置键只有一个值，确保配置的一致性。
 */
@Entity
@Table(name = "system_configs")
data class SystemConfig(
    @Id
    @Column(name = "config_key", nullable = false, length = 100)
    val key: String,

    @Column(name = "config_value", nullable = false, length = 500)
    var value: String,

    @Column(name = "description", length = 500)
    val description: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime? = null,

    @Column(name = "updated_at")
    var updatedAt: LocalDateTime? = null
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

    companion object {
        /** 分类配置版本号的键 */
        const val CATEGORY_VERSION_KEY = "category_config_version"
    }
}
