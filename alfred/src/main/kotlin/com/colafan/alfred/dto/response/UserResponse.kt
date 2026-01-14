package com.colafan.alfred.dto.response

data class UserResponse(
    val id: Long,
    val username: String,
    val email: String = "",
    val nickname: String = ""
)
