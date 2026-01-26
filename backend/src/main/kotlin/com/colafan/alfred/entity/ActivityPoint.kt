package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 运动轨迹点实体
 * 存储GPS轨迹和传感器数据
 */
@Entity
@Table(name = "activity_points", indexes = [
    Index(name = "idx_activity_points_activity_id", columnList = "activity_id"),
    Index(name = "idx_activity_points_time", columnList = "time")
])
data class ActivityPoint(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "activity_id", nullable = false)
    val activityId: Long,

    // 时间戳
    @Column(name = "time")
    val time: LocalDateTime? = null,

    // GPS位置
    @Column(name = "latitude")
    val latitude: Double? = null,     // 纬度

    @Column(name = "longitude")
    val longitude: Double? = null,    // 经度

    @Column(name = "elevation")
    val elevation: Float? = null,     // 海拔(米)

    // 运动数据
    @Column(name = "speed")
    val speed: Float? = null,         // 速度(m/s)

    @Column(name = "heart_rate")
    val heartRate: Int? = null,       // 心率

    @Column(name = "power")
    val power: Int? = null,           // 功率(瓦)

    @Column(name = "cadence")
    val cadence: Int? = null          // 踏频(rpm)
)
