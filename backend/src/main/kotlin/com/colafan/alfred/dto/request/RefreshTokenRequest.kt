package com.colafan.alfred.dto.request

import jakarta.validation.constraints.NotBlank

/**
 * Refresh Token 请求
 */
data class RefreshTokenRequest(
    @field:NotBlank(message = "Refresh token 不能为空")
    val refreshToken: String
)
