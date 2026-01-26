package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 健康档案实体
 * 用于记录用户的身体成分数据（身高、体重、体脂率等）
 */
@Entity
@Table(name = "health_profiles")
data class HealthProfile(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    // 身体尺寸
    @Column(name = "height")
    val height: Float? = null,        // 身高(cm)

    @Column(name = "weight")
    val weight: Float? = null,        // 体重(kg)

    // 体成分
    @Column(name = "body_fat")
    val bodyFat: Float? = null,       // 体脂率(%)

    @Column(name = "muscle_rate")
    val muscleRate: Float? = null,    // 肌肉率(%)

    @Column(name = "water_rate")
    val waterRate: Float? = null,     // 水分率(%)

    @Column(name = "bone_mass")
    val boneMass: Float? = null,      // 骨量(kg)

    @Column(name = "protein_rate")
    val proteinRate: Float? = null,   // 蛋白质率(%)

    // 代谢指标
    @Column(name = "bmr")
    val bmr: Int? = null,             // 基础代谢(kcal)

    @Column(name = "visceral_fat")
    val visceralFat: Int? = null,     // 内脏脂肪等级

    // 计算指标
    @Column(name = "bmi")
    val bmi: Float? = null,           // 体质指数

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
