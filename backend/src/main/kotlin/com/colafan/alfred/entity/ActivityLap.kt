package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 运动分段数据实体
 * 存储运动记录的Lap（分段）信息
 */
@Entity
@Table(name = "activity_laps", indexes = [
    Index(name = "idx_activity_laps_activity_id", columnList = "activity_id")
])
data class ActivityLap(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "activity_id", nullable = false)
    val activityId: Long,

    @Column(name = "lap_index", nullable = false)
    val lapIndex: Int,               // 分段序号（从1开始）

    @Column(name = "start_time")
    val startTime: LocalDateTime? = null,

    @Column(name = "elapsed_time")
    val elapsedTime: Int? = null,    // 经过时间(秒)

    @Column(name = "distance")
    val distance: Int? = null,       // 距离(米)

    @Column(name = "avg_heart_rate")
    val avgHeartRate: Int? = null,   // 平均心率

    @Column(name = "avg_power")
    val avgPower: Int? = null,       // 平均功率(瓦)

    @Column(name = "avg_speed")
    val avgSpeed: Float? = null      // 平均速度(m/s)
)
