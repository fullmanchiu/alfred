package com.colafan.alfred.dto.request

import jakarta.validation.constraints.AssertTrue
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDate

/**
 * 汇率创建/更新请求
 */
data class ExchangeRateRequest(
    @field:NotNull(message = "日期不能为空")
    val date: LocalDate?,

    @field:NotBlank(message = "原始币种不能为空")
    val fromCurrency: String?,

    @field:NotBlank(message = "目标币种不能为空")
    val toCurrency: String? = "CNY",

    @field:NotNull(message = "汇率不能为空")
    @field:DecimalMin(value = "0.0", message = "汇率必须大于0")
    val rate: java.math.BigDecimal?
) {
    @AssertTrue(message = "原始币种和目标币种不能相同")
    fun isCurrencyDifferent(): Boolean {
        return fromCurrency == null || toCurrency == null || fromCurrency != toCurrency
    }
}
