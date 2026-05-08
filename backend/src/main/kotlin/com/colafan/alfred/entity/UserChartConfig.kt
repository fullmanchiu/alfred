package com.colafan.alfred.entity

import java.time.LocalDateTime
import jakarta.persistence.*

/**
 * 用户图表配置实体
 * User Chart Configuration Entity
 */
@Entity
@Table(name = "user_chart_config", indexes = [Index(columnList = "user_id")])
class UserChartConfig(
    /**
     * 主键ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    /**
     * 用户ID
     */
    @Column(name = "user_id", nullable = false, unique = true)
    var userId: Long = 0,

    /**
     * 图表配置（JSON格式）
     */
    @Column(name = "config", nullable = false, columnDefinition = "TEXT")
    var config: String = "{}",

    /**
     * 更新时间
     */
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now(),

    /**
     * 创建时间
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()
) {
    @PreUpdate
    fun preUpdate() {
        updatedAt = LocalDateTime.now()
    }
}
