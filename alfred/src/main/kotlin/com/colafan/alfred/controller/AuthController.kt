package com.colafan.alfred.controller

import com.colafan.alfred.dto.ApiResponse
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

    @PostMapping("/test")
    @Operation(summary = "测试", description = "测试JSON反序列化")
    fun test(@RequestBody body: Map<String, Any>): ApiResponse<Map<String, Any>> {
        // 尝试手动创建 RegisterRequestJava
        val req = RegisterRequestJava()
        req.username = body["username"] as? String
        req.password = body["password"] as? String
        req.email = body["email"] as? String
        return ApiResponse.success(
            mapOf(
                "map" to body,
                "username" to (req.username ?: "NULL"),
                "password" to (req.password ?: "NULL"),
                "email" to (req.email ?: "NULL")
            ),
            "测试成功"
        )
    }

    @PostMapping("/register")
    @Operation(summary = "用户注册", description = "注册新用户并初始化默认账户和分类")
    fun register(@Valid @RequestBody request: RegisterRequestJava): ResponseEntity<ApiResponse<AuthResponse>> {
        logger.info("Controller: 收到注册请求 - username=${request.username}")
        val response = authService.register(request)
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.success(response, "注册成功"))
    }

    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "用户登录获取 JWT Token")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<ApiResponse<AuthResponse>> {
        logger.info("Controller: 收到登录请求 - username=${request.username}")
        val response = authService.login(request)
        return ResponseEntity
            .status(HttpStatus.OK)
            .body(ApiResponse.success(response, "登录成功"))
    }

    @GetMapping("/me")
    @Operation(summary = "获取当前登录用户", description = "获取当前登录用户信息")
    fun getCurrentUser(): ApiResponse<com.colafan.alfred.dto.response.UserResponse> {
        val user = authService.getCurrentUser()
        return ApiResponse.success(user, "获取用户信息成功")
    }
}
