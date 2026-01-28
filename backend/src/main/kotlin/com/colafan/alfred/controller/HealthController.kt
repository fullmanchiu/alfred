package com.colafan.alfred.controller

import com.colafan.alfred.entity.HealthProfile
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.HealthProfileService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

/**
 * 健康档案API控制器
 *
 * 端点说明：
 * - GET /api/v1/health/profile - 获取最新健康数据
 * - POST /api/v1/health/profile - 创建健康数据
 * - PUT /api/v1/health/profile - 更新健康数据（创建新记录）
 * - DELETE /api/v1/health/profile - 删除最新健康数据
 * - GET /api/v1/health/history - 获取健康数据历史记录
 */
@RestController
@RequestMapping("/api/v1/health")
class HealthController(
    private val healthProfileService: HealthProfileService,
    private val authService: AuthService
) {

    /**
     * 获取用户最新的健康档案
     * GET /api/v1/health/profile
     */
    @GetMapping("/profile")
    fun getHealthProfile(authentication: Authentication): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)
        val profile = healthProfileService.getLatestProfile(userId)

        return if (profile.isPresent) {
            val p = profile.get()
            ResponseEntity.ok(mapOf(
                "data" to mapOf(
                    "id" to p.id,
                    "height" to p.height,
                    "weight" to p.weight,
                    "body_fat" to p.bodyFat,
                    "muscle_rate" to p.muscleRate,
                    "water_rate" to p.waterRate,
                    "bone_mass" to p.boneMass,
                    "protein_rate" to p.proteinRate,
                    "bmr" to p.bmr,
                    "visceral_fat" to p.visceralFat,
                    "bmi" to p.bmi,
                    "created_at" to p.createdAt,
                    "deploy_test" to "webhook-test-${System.currentTimeMillis()}-v3"
                ),
                "message" to "获取健康数据成功",
                "status" to "success"
            ))
        } else {
            // 返回空的健康资料，而不是404
            ResponseEntity.ok(mapOf(
                "data" to emptyMap<String, Any>(),
                "message" to "健康数据不存在",
                "status" to "success"
            ))
        }
    }

    /**
     * 创建健康档案
     * POST /api/v1/health/profile
     */
    @PostMapping("/profile")
    fun createHealthProfile(
        @RequestBody profileData: Map<String, Any?>,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)

        val profile = HealthProfile(
            userId = userId,
            height = (profileData["height"] as Number?)?.toFloat(),
            weight = (profileData["weight"] as Number?)?.toFloat(),
            bodyFat = (profileData["body_fat"] as Number?)?.toFloat(),
            muscleRate = (profileData["muscle_rate"] as Number?)?.toFloat(),
            waterRate = (profileData["water_rate"] as Number?)?.toFloat(),
            boneMass = (profileData["bone_mass"] as Number?)?.toFloat(),
            proteinRate = (profileData["protein_rate"] as Number?)?.toFloat(),
            bmr = (profileData["bmr"] as Number?)?.toInt(),
            visceralFat = (profileData["visceral_fat"] as Number?)?.toInt()
        )

        val saved = healthProfileService.createProfile(userId, profile)

        return ResponseEntity.ok(mapOf(
            "data" to mapOf(
                "id" to saved.id,
                "height" to saved.height,
                "weight" to saved.weight,
                "body_fat" to saved.bodyFat,
                "muscle_rate" to saved.muscleRate,
                "water_rate" to saved.waterRate,
                "bone_mass" to saved.boneMass,
                "protein_rate" to saved.proteinRate,
                "bmr" to saved.bmr,
                "visceral_fat" to saved.visceralFat,
                "bmi" to saved.bmi,
                "created_at" to saved.createdAt
            ),
            "message" to "创建健康数据成功",
            "status" to "success"
        ))
    }

    /**
     * 更新健康档案（实际上是创建新记录）
     * PUT /api/v1/health/profile
     */
    @PutMapping("/profile")
    fun updateHealthProfile(
        @RequestBody profileData: Map<String, Any?>,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)

        val profile = HealthProfile(
            userId = userId,
            height = (profileData["height"] as Number?)?.toFloat(),
            weight = (profileData["weight"] as Number?)?.toFloat(),
            bodyFat = (profileData["body_fat"] as Number?)?.toFloat(),
            muscleRate = (profileData["muscle_rate"] as Number?)?.toFloat(),
            waterRate = (profileData["water_rate"] as Number?)?.toFloat(),
            boneMass = (profileData["bone_mass"] as Number?)?.toFloat(),
            proteinRate = (profileData["protein_rate"] as Number?)?.toFloat(),
            bmr = (profileData["bmr"] as Number?)?.toInt(),
            visceralFat = (profileData["visceral_fat"] as Number?)?.toInt()
        )

        val saved = healthProfileService.updateProfile(userId, profile)

        return ResponseEntity.ok(mapOf(
            "data" to mapOf(
                "id" to saved.id,
                "height" to saved.height,
                "weight" to saved.weight,
                "body_fat" to saved.bodyFat,
                "muscle_rate" to saved.muscleRate,
                "water_rate" to saved.waterRate,
                "bone_mass" to saved.boneMass,
                "protein_rate" to saved.proteinRate,
                "bmr" to saved.bmr,
                "visceral_fat" to saved.visceralFat,
                "bmi" to saved.bmi,
                "created_at" to saved.createdAt
            ),
            "message" to "添加健康记录成功",
            "status" to "success"
        ))
    }

    /**
     * 删除最新的健康档案
     * DELETE /api/v1/health/profile
     */
    @DeleteMapping("/profile")
    fun deleteHealthProfile(authentication: Authentication): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)
        val deleted = healthProfileService.deleteLatestProfile(userId)

        return if (deleted) {
            ResponseEntity.ok(mapOf(
                "data" to emptyMap<String, Any>(),
                "message" to "健康数据已删除",
                "status" to "success"
            ))
        } else {
            ResponseEntity.ok(mapOf(
                "data" to emptyMap<String, Any>(),
                "message" to "健康数据不存在",
                "status" to "error"
            ))
        }
    }

    /**
     * 获取健康数据历史记录
     * GET /api/v1/health/history
     */
    @GetMapping("/history")
    fun getHealthHistory(authentication: Authentication): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)
        val history = healthProfileService.getHistory(userId)

        val historyData = history.map { p ->
            mapOf(
                "id" to p.id,
                "height" to p.height,
                "weight" to p.weight,
                "body_fat" to p.bodyFat,
                "muscle_rate" to p.muscleRate,
                "water_rate" to p.waterRate,
                "bone_mass" to p.boneMass,
                "protein_rate" to p.proteinRate,
                "bmr" to p.bmr,
                "visceral_fat" to p.visceralFat,
                "bmi" to p.bmi,
                "created_at" to p.createdAt
            )
        }

        return ResponseEntity.ok(mapOf(
            "data" to historyData,
            "message" to "获取健康数据历史记录成功",
            "status" to "success"
        ))
    }
}
