package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 运动记录实体
 * 记录用户的运动数据（跑步、骑行、游泳等）
 */
@Entity
@Table(name = "activities")
data class Activity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    // 基本信息
    @Column(name = "name", nullable = false)
    val name: String,

    @Column(name = "type", nullable = false)
    val type: String,  // running, cycling, swimming, walking等

    // 汇总数据（从GPS点计算得出）
    @Column(name = "distance")
    val distance: Int? = null,         // 距离(米)

    @Column(name = "duration")
    val duration: Int? = null,         // 时长(秒)

    @Column(name = "avg_speed")
    val avgSpeed: Float? = null,       // 平均速度(m/s)

    @Column(name = "max_speed")
    val maxSpeed: Float? = null,       // 最大速度(m/s)

    @Column(name = "total_elevation")
    val totalElevation: Int? = null,   // 总爬升(米)

    // 生理数据汇总
    @Column(name = "avg_heart_rate")
    val avgHeartRate: Int? = null,     // 平均心率

    @Column(name = "max_heart_rate")
    val maxHeartRate: Int? = null,     // 最大心率

    @Column(name = "avg_power")
    val avgPower: Int? = null,         // 平均功率(瓦)

    @Column(name = "max_power")
    val maxPower: Int? = null,         // 最大功率(瓦)

    @Column(name = "avg_cadence")
    val avgCadence: Int? = null,       // 平均踏频( rpm)

    @Column(name = "calories")
    val calories: Int? = null,         // 消耗卡路里

    // 时间范围
    @Column(name = "start_time")
    val startTime: LocalDateTime? = null,

    @Column(name = "end_time")
    val endTime: LocalDateTime? = null,

    // 审计字段
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
}
