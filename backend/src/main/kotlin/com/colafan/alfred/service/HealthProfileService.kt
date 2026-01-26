package com.colafan.alfred.service

import com.colafan.alfred.entity.HealthProfile
import com.colafan.alfred.repository.HealthProfileRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.Optional

/**
 * 健康档案业务逻辑服务
 */
@Service
class HealthProfileService(
    private val healthProfileRepository: HealthProfileRepository
) {
    private val logger = LoggerFactory.getLogger(HealthProfileService::class.java)

    /**
     * 获取用户最新的健康档案
     */
    fun getLatestProfile(userId: Long): Optional<HealthProfile> {
        return healthProfileRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)
    }

    /**
     * 获取用户所有健康档案历史记录
     */
    fun getHistory(userId: Long): List<HealthProfile> {
        return healthProfileRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
    }

    /**
     * 创建健康档案记录
     */
    @Transactional
    fun createProfile(userId: Long, profile: HealthProfile): HealthProfile {
        // 计算BMI：体重(kg) / (身高(m) * 身高(m))
        val bmi = calculateBMI(profile.height, profile.weight)

        val newProfile = profile.copy(
            userId = userId,
            bmi = bmi
        )

        val saved = healthProfileRepository.save(newProfile)
        logger.info("创建健康档案成功: userId={}, profileId={}", userId, saved.id)
        return saved
    }

    /**
     * 更新健康档案（实际上是创建新记录，保留历史数据）
     */
    @Transactional
    fun updateProfile(userId: Long, profile: HealthProfile): HealthProfile {
        // 获取用户最近一次有身高记录的数据
        val lastRecordWithHeight = healthProfileRepository
            .findFirstByUserIdAndHeightIsNotNullOrderByCreatedAtDesc(userId)

        // 使用历史身高或当前提交的身高
        val height = profile.height ?: lastRecordWithHeight.map { it.height }.orElse(null)

        // 计算BMI
        val bmi = if (height != null && profile.weight != null) {
            calculateBMI(height, profile.weight)
        } else {
            null
        }

        val newProfile = HealthProfile(
            userId = userId,
            height = height,
            weight = profile.weight,
            bodyFat = profile.bodyFat,
            muscleRate = profile.muscleRate,
            waterRate = profile.waterRate,
            boneMass = profile.boneMass,
            proteinRate = profile.proteinRate,
            bmr = profile.bmr,
            visceralFat = profile.visceralFat,
            bmi = bmi
        )

        val saved = healthProfileRepository.save(newProfile)
        logger.info("更新健康档案成功: userId={}, profileId={}", userId, saved.id)
        return saved
    }

    /**
     * 删除用户最新的健康档案
     */
    @Transactional
    fun deleteLatestProfile(userId: Long): Boolean {
        val latest = getLatestProfile(userId)
        if (latest.isPresent) {
            healthProfileRepository.delete(latest.get())
            logger.info("删除健康档案成功: userId={}, profileId={}", userId, latest.get().id)
            return true
        }
        return false
    }

    /**
     * 计算BMI
     * @param heightCm 身高（厘米）
     * @param weightKg 体重（千克）
     * @return BMI值，保留1位小数
     */
    private fun calculateBMI(heightCm: Float?, weightKg: Float?): Float? {
        if (heightCm == null || weightKg == null || heightCm <= 0) {
            return null
        }
        val heightM = heightCm / 100f  // 转换为米
        val bmi = weightKg / (heightM * heightM)
        return (bmi * 10).toInt() / 10f  // 保留1位小数
    }
}
