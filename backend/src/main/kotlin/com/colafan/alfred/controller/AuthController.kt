package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.LoginRequest
import com.colafan.alfred.dto.request.RegisterRequestJava
import com.colafan.alfred.dto.response.AuthResponse
import com.colafan.alfred.service.AuthService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "认证", description = "用户注册和登录")
class AuthController(private val authService: AuthService) {
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
}
