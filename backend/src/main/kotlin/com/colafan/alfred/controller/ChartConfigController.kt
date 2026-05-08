package com.colafan.alfred.controller

import com.colafan.alfred.service.UserChartConfigService
import com.colafan.alfred.service.AuthService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import org.springframework.security.core.Authentication
import org.springframework.transaction.annotation.Transactional

/**
 * 图表配置控制器
 * Chart Configuration Controller
 */
@RestController
@RequestMapping("/api/v1/stocks/chart-config")
@Tag(name = "图表配置", description = "用户图表配置管理")
class ChartConfigController(
    private val userChartConfigService: UserChartConfigService,
    private val authService: AuthService
) {
    companion object {
        private val logger = LoggerFactory.getLogger(ChartConfigController::class.java)
    }

    /**
     * 获取用户图表配置
     */
    @GetMapping
    @Operation(summary = "获取图表配置", description = "获取当前用户的图表配置")
    fun getChartConfig(authentication: Authentication): Map<String, Any> {
        val userId = getUserId(authentication)
        val config = userChartConfigService.getUserChartConfig(userId)

        return if (config != null) {
            mapOf(
                "success" to true,
                "data" to mapOf(
                    "config" to config.config
                )
            )
        } else {
            mapOf(
                "success" to true,
                "data" to emptyMap<String, Any>()
            )
        }
    }

    /**
     * 保存用户图表配置
     */
    @PostMapping
    @Operation(summary = "保存图表配置", description = "保存当前用户的图表配置")
    @Transactional
    fun saveChartConfig(
        @RequestBody request: ChartConfigRequest,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)

        // 验证配置JSON格式
        try {
            // 简单验证JSON是否有效
            if (!request.config.startsWith("{") || !request.config.endsWith("}")) {
                logger.warn("无效的配置JSON格式: userId=$userId")
                return mapOf(
                    "success" to false,
                    "message" to "配置格式无效"
                )
            }
        } catch (e: Exception) {
            logger.error("解析配置失败: userId=$userId", e)
            return mapOf(
                "success" to false,
                "message" to "配置解析失败"
            )
        }

        val savedConfig = userChartConfigService.saveUserChartConfig(userId, request.config)

        return mapOf(
            "success" to true,
            "data" to mapOf(
                "id" to (savedConfig.id ?: 0),
                "updatedAt" to savedConfig.updatedAt
            )
        )
    }

    /**
     * 恢复默认配置
     */
    @PostMapping("/reset")
    @Operation(summary = "恢复默认配置", description = "删除用户自定义配置，恢复默认设置")
    fun resetChartConfig(authentication: Authentication): Map<String, Any> {
        val userId = getUserId(authentication)
        userChartConfigService.deleteUserChartConfig(userId)

        return mapOf("success" to true)
    }

    private fun getUserId(authentication: Authentication): Long {
        return authService.getCurrentUserId(authentication)
    }
}

/**
 * 图表配置请求
 */
data class ChartConfigRequest(
    val config: String
)
