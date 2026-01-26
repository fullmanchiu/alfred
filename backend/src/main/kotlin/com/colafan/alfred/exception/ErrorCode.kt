package com.colafan.alfred.exception

import org.springframework.http.HttpStatus

enum class ErrorCode(
    val httpStatus: HttpStatus,
    val message: String
) {
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "用户不存在: %s"),
    USER_ALREADY_EXISTS(HttpStatus.CONFLICT, "用户名已存在: %s"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "用户名或密码错误"),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "无效或过期的令牌"),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "令牌已过期"),
    ACCOUNT_NOT_FOUND(HttpStatus.NOT_FOUND, "账户不存在"),
    CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "分类不存在"),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "参数验证失败: %s"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "服务器内部错误: %s"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "未授权访问"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "资源不存在"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "无权访问"),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "请求参数错误"),
    CONFLICT(HttpStatus.CONFLICT, "资源冲突")
}
