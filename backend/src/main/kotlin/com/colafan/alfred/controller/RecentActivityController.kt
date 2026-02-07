package com.colafan.alfred.controller

import com.colafan.alfred.dto.response.RecentActivityResponse
import com.colafan.alfred.service.ActivityAggregatorService
import com.colafan.alfred.service.AuthService
import org.springframework.web.bind.annotation.*

/**
 * Dashboard控制器
 * 提供仪表板相关接口
 */
@RestController
@RequestMapping("/api/v1/dashboard")
class RecentActivityController(
    private val activityAggregatorService: ActivityAggregatorService,
    private val authService: AuthService
) {

    /**
     * 获取最近活动
     * 返回用户最近的交易、账户变动等活动
     *
     * @param limit 返回数量限制，范围1-100，默认20
     * @return 最近的活动列表
     */
    @GetMapping("/recent-activities")
    fun getRecentActivities(
        @RequestParam(defaultValue = "20") limit: Int,
        authentication: org.springframework.security.core.Authentication
    ): List<RecentActivityResponse> {
        val userId = authService.getCurrentUserId(authentication)

        // 限制数量范围
        val safeLimit = limit.coerceIn(1, 100)

        return activityAggregatorService.getRecentActivities(userId, safeLimit)
    }
}
