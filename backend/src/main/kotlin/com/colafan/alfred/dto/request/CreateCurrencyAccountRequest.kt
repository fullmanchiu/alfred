package com.colafan.alfred.dto.request

import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * 创建货币账户请求
 */
data class CreateCurrencyAccountRequest(
    @field:NotBlank(message = "货币代码不能为空")
    @field:Size(max = 3, message = "货币代码长度不能超过3个字符")
    val currency: String,

    @field:DecimalMin(value = "0.0", message = "初始余额不能为负数")
    val initialBalance: Double = 0.0
)
