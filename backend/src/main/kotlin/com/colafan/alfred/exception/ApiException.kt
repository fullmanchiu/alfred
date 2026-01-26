package com.colafan.alfred.exception

import org.springframework.http.HttpStatus

open class ApiException(
    message: String,
    val httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: String = "API_ERROR"
) : RuntimeException(message) {
    val errorCodeString: String = errorCode

    companion object {
        // 使用自定义消息（推荐用于业务逻辑错误）
        fun withMessage(errorCode: ErrorCode, message: String): ApiException {
            return ApiException(
                message = message,
                httpStatus = errorCode.httpStatus,
                errorCode = errorCode.name
            )
        }
    }

    // 构造函数：接受 ErrorCode 和参数
    // 如果只有一个参数且为 String，并且 ErrorCode 消息不包含格式化占位符，则直接使用该 String
    constructor(errorCode: ErrorCode, vararg args: Any) : this(
        message = if (args.size == 1 && args[0] is String && !errorCode.message.contains("%"))
            args[0] as String
        else
            errorCode.message.format(*args),
        httpStatus = errorCode.httpStatus,
        errorCode = errorCode.name
    )
}

// 便捷构造函数：使用 ErrorCode 枚举
fun apiException(errorCode: ErrorCode, vararg args: Any): ApiException {
    return ApiException(
        message = errorCode.message.format(*args),
        httpStatus = errorCode.httpStatus,
        errorCode = errorCode.name
    )
}
