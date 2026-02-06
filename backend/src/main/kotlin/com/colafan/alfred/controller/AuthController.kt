package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.LoginRequest
import com.colafan.alfred.dto.request.RefreshTokenRequest
import com.colafan.alfred.dto.request.RegisterRequestJava
import com.colafan.alfred.dto.response.AuthResponse
import com.colafan.alfred.entity.RefreshToken
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.RefreshTokenService
import com.colafan.alfred.security.JwtTokenProvider
import com.colafan.alfred.config.JwtConfig
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "认证", description = "用户注册和登录")
class AuthController(
    private val authService: AuthService,
    private val refreshTokenService: RefreshTokenService,
    private val jwtTokenProvider: JwtTokenProvider,
    private val jwtConfig: JwtConfig
) {
    private val logger = org.slf4j.LoggerFactory.getLogger(AuthController::class.java)

    @PostMapping("/register")
    @Operation(summary = "用户注册", description = "注册新用户并初始化默认账户和分类")
    fun register(@Valid @RequestBody request: RegisterRequestJava): ResponseEntity<AuthResponse> {
        logger.info("Controller: 收到注册请求 - username=${request.username}")
        val response = authService.register(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "用户登录获取 JWT Token")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<AuthResponse> {
        logger.info("Controller: 收到登录请求 - username=${request.username}")
        val response = authService.login(request)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/me")
    @Operation(summary = "获取当前登录用户", description = "获取当前登录用户信息")
    fun getCurrentUser(): com.colafan.alfred.dto.response.UserResponse {
        return authService.getCurrentUser()
    }

    @PostMapping("/refresh")
    @Operation(summary = "刷新 Token", description = "使用 Refresh Token 获取新的 Access Token 和 Refresh Token（滑动过期）")
    fun refreshToken(@Valid @RequestBody request: RefreshTokenRequest): ResponseEntity<AuthResponse> {
        logger.info("收到 token 刷新请求")

        // 验证并刷新 refresh token
        val newRefreshToken = refreshTokenService.refreshRefreshToken(request.refreshToken)

        // 获取用户信息
        val user = authService.getUserById(newRefreshToken.userId)

        // 生成新的 access token
        val newAccessToken = jwtTokenProvider.generateToken(user.id!!, user.username)

        logger.info("Token 刷新成功: userId=${user.id}")

        return ResponseEntity.ok(
            AuthResponse(
                token = newAccessToken,
                tokenType = "bearer",
                expiresIn = jwtConfig.expiration / 1000,
                refreshToken = newRefreshToken.token,
                user = com.colafan.alfred.dto.response.UserResponse(
                    id = user.id!!,
                    username = user.username,
                    email = user.email ?: "",
                    nickname = user.nickname ?: ""
                )
            )
        )
    }

    @PostMapping("/logout")
    @Operation(summary = "登出", description = "登出并删除 Refresh Token")
    fun logout(authentication: Authentication): ResponseEntity<Map<String, String>> {
        val userId = authService.getCurrentUserId(authentication)
        refreshTokenService.deleteByUserId(userId)
        logger.info("用户登出: userId=$userId")

        return ResponseEntity.ok(mapOf("message" to "登出成功"))
    }
}
