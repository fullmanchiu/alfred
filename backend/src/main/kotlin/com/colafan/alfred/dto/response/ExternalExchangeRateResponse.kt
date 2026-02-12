package com.colafan.alfred.dto.response

import com.fasterxml.jackson.annotation.JsonProperty

/**
 * 外部汇率API响应（ExchangeRate-API格式）
 *
 * 示例响应：
 * {
 *   "base_code": "USD",
 *   "time_last_updated": 1234567890,
 *   "rates": {
 *     "CNY": 7.2345,
 *     "HKD": 7.8123,
 *     "EUR": 0.9123,
 *     ...
 *   }
 * }
 */
data class ExternalExchangeRateResponse(
    @JsonProperty("base_code")
    val baseCode: String,

    @JsonProperty("time_last_updated")
    val timeLastUpdated: Long,

    val rates: Map<String, Double>
)
