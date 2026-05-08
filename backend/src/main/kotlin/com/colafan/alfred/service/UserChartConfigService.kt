package com.colafan.alfred.service

import com.colafan.alfred.entity.UserChartConfig
import com.colafan.alfred.repository.UserChartConfigRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * 用户图表配置服务
 * User Chart Configuration Service
 */
@Service
class UserChartConfigService(
    private val userChartConfigRepository: UserChartConfigRepository
) {
    companion object {
        private val logger = LoggerFactory.getLogger(UserChartConfigService::class.java)
    }

    /**
     * 获取用户图表配置
     */
    fun getUserChartConfig(userId: Long): UserChartConfig? {
        return userChartConfigRepository.findByUserId(userId)
    }

    /**
     * 保存或更新用户图表配置
     */
    @Transactional
    fun saveUserChartConfig(userId: Long, configJson: String): UserChartConfig {
        var config = userChartConfigRepository.findByUserId(userId)

        if (config == null) {
            // 创建新配置
            config = UserChartConfig(
                userId = userId,
                config = configJson,
                createdAt = LocalDateTime.now(),
                updatedAt = LocalDateTime.now()
            )
            logger.info("创建用户图表配置: userId=$userId")
        } else {
            // 更新现有配置
            config.config = configJson
            config.updatedAt = LocalDateTime.now()
            logger.info("更新用户图表配置: userId=$userId")
        }

        return userChartConfigRepository.save(config)
    }

    /**
     * 删除用户图表配置（恢复默认时使用）
     */
    @Transactional
    fun deleteUserChartConfig(userId: Long) {
        userChartConfigRepository.deleteByUserId(userId)
        logger.info("删除用户图表配置: userId=$userId")
    }

    /**
     * 检查用户是否有自定义配置
     */
    fun hasCustomConfig(userId: Long): Boolean {
        return userChartConfigRepository.findByUserId(userId) != null
    }
}
