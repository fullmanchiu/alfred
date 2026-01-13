package com.colafan.alfred.exception

import com.colafan.alfred.dto.ApiResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.FieldError
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.util.HashMap

@RestControllerAdvice
class GlobalExceptionHandler {
    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(ApiException::class)
    fun handleApiException(ex: ApiException): ResponseEntity<Map<String, Any?>> {
        logger.error("API Exception: ${ex.message}", ex)

        // 与 FastAPI 保持一致的错误响应格式 - 错误时不包含 data 字段
        val errorResponse = mapOf(
            "success" to false,
            "message" to (ex.message ?: "操作失败"),
            "error" to mapOf(
                "code" to (ex.errorCodeString ?: "API_ERROR"),
                "message" to (ex.message ?: "操作失败")
            )
        )

        return ResponseEntity
            .status(ex.httpStatus)
            .body(errorResponse)
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(ex: MethodArgumentNotValidException): ResponseEntity<Map<String, Any?>> {
        val errors = ex.bindingResult.allErrors.map { error ->
            when (error) {
                is FieldError -> "${error.field}: ${error.defaultMessage}"
                else -> "${error.objectName}: ${error.defaultMessage}"
            }
        }
        val message = "参数验证失败: ${errors.joinToString(", ")}"
        logger.warn("Validation Exception: $message")

        // 与 FastAPI 保持一致的错误响应格式 - 错误时不包含 data 字段
        val errorResponse = mapOf(
            "success" to false,
            "message" to message,
            "error" to mapOf(
                "code" to "VALIDATION_ERROR",
                "message" to message
            )
        )

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(errorResponse)
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(ex: Exception): ResponseEntity<Map<String, Any?>> {
        logger.error("Unexpected Exception: ${ex.message}", ex)

        // 与 FastAPI 保持一致的错误响应格式 - 错误时不包含 data 字段
        val errorResponse = mapOf(
            "success" to false,
            "message" to "服务器内部错误",
            "error" to mapOf(
                "code" to "INTERNAL_SERVER_ERROR",
                "message" to (ex.message ?: "服务器内部错误")
            )
        )

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse)
    }
}
