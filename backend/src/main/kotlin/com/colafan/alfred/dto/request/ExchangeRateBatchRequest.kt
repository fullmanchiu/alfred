package com.colafan.alfred.dto.request

import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import java.time.LocalDate

/**
 * 批量汇率请求
 */
data class ExchangeRateBatchRequest(
    @field:NotEmpty(message = "汇率列表不能为空")
    @field:Valid
    val rates: List<ExchangeRateItem>
)

/**
 * 单个汇率项
 */
data class ExchangeRateItem(
    val date: LocalDate,
    val fromCurrency: String,
    val rate: java.math.BigDecimal
) {
    // 默认目标币种为 CNY
    val toCurrency: String = "CNY"
}
