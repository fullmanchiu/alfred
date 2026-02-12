package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.ExchangeRate
import java.time.LocalDate

/**
 * 汇率响应
 */
data class ExchangeRateResponse(
    val date: LocalDate,
    val fromCurrency: String,
    val toCurrency: String,
    val rate: java.math.BigDecimal
) {
    companion object {
        fun fromEntity(exchangeRate: ExchangeRate): ExchangeRateResponse {
            return ExchangeRateResponse(
                date = exchangeRate.date,
                fromCurrency = exchangeRate.fromCurrency,
                toCurrency = exchangeRate.toCurrency,
                rate = exchangeRate.rate
            )
        }
    }
}
