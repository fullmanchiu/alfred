package com.colafan.alfred.exception

import org.springframework.http.HttpStatus

open class ApiException(
    message: String,
    val httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: String = "API_ERROR"
) : RuntimeException(message) {
    val errorCodeString: String = errorCode

    // 构造函数：接受 ErrorCode 枚举
    constructor(errorCode: ErrorCode, vararg args: Any) : this(
        message = errorCode.message.format(*args),
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
