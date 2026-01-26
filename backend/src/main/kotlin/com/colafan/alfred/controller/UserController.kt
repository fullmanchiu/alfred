package com.colafan.alfred.controller

import com.colafan.alfred.entity.User
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.UserDataResetService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1")
class UserController(
    private val userDataResetService: UserDataResetService,
    private val authService: AuthService
) {

    @PostMapping("/users/reset-data")
    fun resetUserData(authentication: Authentication): ResponseEntity<Map<String, Any>> {
        val userId = authService.getCurrentUserId(authentication)

        val result = userDataResetService.resetUserData(userId)

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "message" to "数据重置成功",
            "data" to result
        ))
    }

    @GetMapping("/user/profile")
    fun getUserProfile(authentication: Authentication): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)
        val user = authService.getUserById(userId)

        return ResponseEntity.ok(mapOf(
            "data" to mapOf(
                "id" to user.id,
                "username" to user.username,
                "email" to user.email,
                "nickname" to user.nickname,
                "created_at" to user.createdAt,
                "updated_at" to user.updatedAt
            )
        ))
    }

    @PutMapping("/user/profile")
    fun updateUserProfile(
        @RequestBody profileData: Map<String, Any?>,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any?>> {
        val userId = authService.getCurrentUserId(authentication)
        val updatedUser = authService.updateUserProfile(userId, profileData)

        return ResponseEntity.ok(mapOf(
            "data" to mapOf(
                "id" to updatedUser.id,
                "username" to updatedUser.username,
                "email" to updatedUser.email,
                "nickname" to updatedUser.nickname,
                "created_at" to updatedUser.createdAt,
                "updated_at" to updatedUser.updatedAt
            )
        ))
    }
}
