package com.colafan.alfred.dto

import com.fasterxml.jackson.annotation.JsonInclude

/**
 * 标准REST API响应格式
 * 适用于所有后端框架（Spring Boot、FastAPI等）
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null
) {
    companion object {
        fun <T> success(data: T, message: String? = null): ApiResponse<T> =
            ApiResponse(success = true, data = data, message = message)

        fun <T> success(message: String): ApiResponse<T> =
            ApiResponse(success = true, data = null, message = message)

        fun <T> failure(message: String): ApiResponse<T> =
            ApiResponse(success = false, data = null, message = message)
    }
}
