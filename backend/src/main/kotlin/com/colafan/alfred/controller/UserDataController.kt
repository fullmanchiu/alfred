package com.colafan.alfred.controller

import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.CategoryService
import com.colafan.alfred.service.UserDataResetService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

/**
 * 用户数据管理控制器
 * 用于修复用户数据问题
 */
@RestController
@RequestMapping("/api/v1/user-data")
class UserDataController(
    private val userDataResetService: UserDataResetService,
    private val categoryService: CategoryService,
    private val authService: AuthService
) {
    private val logger = LoggerFactory.getLogger(UserDataController::class.java)

    /**
     * 重新初始化用户的默认分类
     * 这将删除用户所有现有分类并创建新的默认分类
     */
    @PostMapping("/reset-categories")
    @PreAuthorize("isAuthenticated()")
    fun resetCategories(authentication: Authentication): ResponseEntity<Map<String, Any>> {
        val userId = authService.getCurrentUserId(authentication)

        logger.info("用户 {} 请求重新初始化分类", userId)

        val categories = categoryService.initDefaultCategories(userId)

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "message" to "分类已重新初始化",
            "data" to mapOf(
                "total" to categories.size,
                "categories" to categories.map { it.name }
            )
        ))
    }

    /**
     * 恢复用户被软删除的系统分类
     */
    @PostMapping("/restore-system-categories")
    @PreAuthorize("isAuthenticated()")
    fun restoreSystemCategories(authentication: Authentication): ResponseEntity<Map<String, Any>> {
        val userId = authService.getCurrentUserId(authentication)

        logger.info("用户 {} 请求恢复系统分类", userId)

        val restored = userDataResetService.restoreSystemCategories(userId)

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "message" to "系统分类已恢复",
            "data" to mapOf(
                "restored" to restored
            )
        ))
    }

    /**
     * 强制重新同步系统分类（忽略版本号检查）
     * 这会更新所有系统分类的图标、颜色、名称等配置
     */
    @PostMapping("/force-sync-categories")
    @PreAuthorize("isAuthenticated()")
    fun forceSyncCategories(authentication: Authentication): ResponseEntity<Map<String, Any>> {
        val userId = authService.getCurrentUserId(authentication)

        logger.info("用户 {} 请求强制重新同步系统分类", userId)

        val synced = categoryService.forceSyncSystemCategories(userId)

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "message" to "系统分类已强制同步",
            "data" to mapOf(
                "synced" to synced
            )
        ))
    }
}
