package com.colafan.alfred.service

import com.colafan.alfred.entity.Activity
import com.colafan.alfred.entity.ActivityLap
import com.colafan.alfred.entity.ActivityPoint
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.ActivityLapRepository
import com.colafan.alfred.repository.ActivityPointRepository
import com.colafan.alfred.repository.ActivityRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 运动记录业务逻辑服务
 */
@Service
class ActivityService(
    private val activityRepository: ActivityRepository,
    private val activityPointRepository: ActivityPointRepository,
    private val activityLapRepository: ActivityLapRepository
) {
    private val logger = LoggerFactory.getLogger(ActivityService::class.java)

    /**
     * 获取用户的运动记录列表（分页）
     */
    fun getActivities(userId: Long, type: String?, pageable: Pageable): Page<Activity> {
        return if (type.isNullOrBlank()) {
            activityRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
        } else {
            activityRepository.findByUserIdAndTypeOrderByCreatedAtDesc(userId, type, pageable)
        }
    }

    /**
     * 获取运动记录详情（不含轨迹点和分段）
     */
    fun getActivityById(userId: Long, activityId: Long): Activity {
        val activity = activityRepository.findByIdOrNull(activityId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "运动记录不存在")

        if (activity.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此运动记录")
        }

        return activity
    }

    /**
     * 获取运动记录详情（含轨迹点和分段）
     */
    fun getActivityDetail(userId: Long, activityId: Long): Map<String, Any?> {
        val activity = getActivityById(userId, activityId)

        // 获取GPS轨迹点
        val points = activityPointRepository.findByActivityIdOrderByTime(activityId)

        // 获取分段数据
        val laps = activityLapRepository.findByActivityIdOrderByLapIndex(activityId)

        // 如果Activity中没有汇总数据，从轨迹点计算
        val computedStats = if (activity.avgHeartRate == null && points.isNotEmpty()) {
            computeStatsFromPoints(points)
        } else {
            null
        }

        return mapOf(
            "activity" to activity,
            "points" to points.map { point ->
                mapOf(
                    "time" to point.time,
                    "latitude" to point.latitude,
                    "longitude" to point.longitude,
                    "speed" to point.speed,
                    "heart_rate" to point.heartRate,
                    "power" to point.power,
                    "cadence" to point.cadence,
                    "elevation" to point.elevation
                )
            },
            "laps" to laps.map { lap ->
                mapOf(
                    "lap_index" to lap.lapIndex,
                    "start_time" to lap.startTime,
                    "elapsed_time" to lap.elapsedTime,
                    "distance" to lap.distance,
                    "avg_heart_rate" to lap.avgHeartRate,
                    "avg_power" to lap.avgPower,
                    "avg_speed" to lap.avgSpeed
                )
            },
            "computed_stats" to computedStats
        )
    }

    /**
     * 创建运动记录
     */
    @Transactional
    fun createActivity(userId: Long, activity: Activity): Activity {
        val newActivity = activity.copy(userId = userId)
        val saved = activityRepository.save(newActivity)
        logger.info("创建运动记录成功: userId={}, activityId={}", userId, saved.id)
        return saved
    }

    /**
     * 从轨迹点数据计算汇总统计
     */
    private fun computeStatsFromPoints(points: List<ActivityPoint>): Map<String, Any?> {
        // 心率
        val heartRates = points.mapNotNull { it.heartRate }.filter { it > 0 }
        val avgHeartRate = if (heartRates.isNotEmpty()) {
            heartRates.average().toInt()
        } else null

        val maxHeartRate = heartRates.maxOrNull()

        // 功率
        val powers = points.mapNotNull { it.power }.filter { it > 0 }
        val avgPower = if (powers.isNotEmpty()) {
            powers.average().toInt()
        } else null

        val maxPower = powers.maxOrNull()

        // 踏频
        val cadences = points.mapNotNull { it.cadence }.filter { it > 0 }
        val avgCadence = if (cadences.isNotEmpty()) {
            cadences.average().toInt()
        } else null

        // 速度
        val speeds = points.mapNotNull { it.speed }.filter { it > 0 }
        val maxSpeed = speeds.maxOrNull()

        return mapOf(
            "avg_heart_rate" to avgHeartRate,
            "max_heart_rate" to maxHeartRate,
            "avg_power" to avgPower,
            "max_power" to maxPower,
            "avg_cadence" to avgCadence,
            "max_speed" to maxSpeed
        )
    }

    /**
     * 获取用户运动记录统计
     */
    fun getActivityStats(userId: Long): Map<String, Any?> {
        val activities = activityRepository.findByUserIdOrderByCreatedAtDesc(
            userId,
            org.springframework.data.domain.PageRequest.of(0, 1000)
        )

        val totalDistance = activities.content.sumOf { it.distance ?: 0 }
        val totalDuration = activities.content.sumOf { it.duration ?: 0 }
        val totalElevation = activities.content.sumOf { it.totalElevation ?: 0 }

        return mapOf(
            "total_activities" to activities.totalElements,
            "total_distance" to totalDistance,         // 米
            "total_duration" to totalDuration,         // 秒
            "total_elevation" to totalElevation        // 米
        )
    }
}
