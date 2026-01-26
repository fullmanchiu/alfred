package com.colafan.alfred.controller

import com.colafan.alfred.entity.Activity
import com.colafan.alfred.service.ActivityService
import com.colafan.alfred.service.AuthService
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

/**
 * 运动记录API控制器
 *
 * 端点说明：
 * - GET /api/v1/activities - 获取运动记录列表（分页）
 * - GET /api/v1/activities/{id} - 获取运动记录详情（含轨迹点和分段）
 */
@RestController
@RequestMapping("/api/v1/activities")
class ActivityController(
    private val activityService: ActivityService,
    private val authService: AuthService
) {

    /**
     * 获取用户的运动记录列表（分页）
     * GET /api/v1/activities?type=xxx&page=1&page_size=20
     */
    @GetMapping("")
    fun getActivities(
        @RequestParam(required = false) type: String?,
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(name = "page_size", defaultValue = "20") pageSize: Int,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)

        // 创建分页请求
        val pageable = PageRequest.of(
            page - 1,  // Spring Data页码从0开始
            pageSize,
            Sort.by(Sort.Direction.DESC, "createdAt")
        )

        val activitiesPage: Page<Activity> = activityService.getActivities(userId, type, pageable)
        val stats = activityService.getActivityStats(userId)

        // 转换为响应格式
        val activitiesList = activitiesPage.content.map { activity ->
            mapOf(
                "id" to activity.id,
                "name" to activity.name,
                "type" to activity.type,
                "distance" to activity.distance,
                "duration" to activity.duration,
                "avg_speed" to activity.avgSpeed,
                "total_elevation" to activity.totalElevation,
                "created_at" to activity.createdAt
            )
        }

        return ResponseEntity.ok(mapOf(
            "stats" to stats,
            "activities" to activitiesList,
            "pagination" to mapOf(
                "page" to page,
                "page_size" to pageSize,
                "total" to activitiesPage.totalElements
            )
        ))
    }

    /**
     * 获取运动记录详情（含轨迹点和分段）
     * GET /api/v1/activities/{id}
     */
    @GetMapping("/{id}")
    fun getActivityDetail(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)
        val detail = activityService.getActivityDetail(userId, id)
        val activity = detail["activity"] as Activity

        val response = mapOf(
            "id" to activity.id,
            "name" to activity.name,
            "type" to activity.type,
            "distance" to activity.distance,
            "duration" to activity.duration,
            "avg_speed" to activity.avgSpeed,
            "max_speed" to activity.maxSpeed,
            "total_elevation" to activity.totalElevation,
            "avg_heart_rate" to activity.avgHeartRate,
            "max_heart_rate" to activity.maxHeartRate,
            "avg_power" to activity.avgPower,
            "max_power" to activity.maxPower,
            "avg_cadence" to activity.avgCadence,
            "calories" to activity.calories,
            "start_time" to activity.startTime,
            "end_time" to activity.endTime,
            "created_at" to activity.createdAt,
            "points" to (detail["points"] as List<*>),
            "laps" to (detail["laps"] as List<*>)
        )

        // 如果有计算的数据，合并到响应中
        val computedStats = detail["computed_stats"] as? Map<*, *>
        if (computedStats != null) {
            val mergedResponse = response.toMutableMap()
            computedStats.forEach { (key, value) ->
                val stringKey = key as? String ?: return@forEach
                if (response[stringKey] == null) {
                    mergedResponse[stringKey] = value
                }
            }
            return ResponseEntity.ok(mergedResponse)
        }

        return ResponseEntity.ok(response)
    }
}
