package com.colafan.alfred.dto.response

data class AuthResponse(
    val token: String,
    val tokenType: String = "bearer",
    val expiresIn: Long,
    val refreshToken: String? = null,
    val user: UserResponse
)
