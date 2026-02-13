package com.colafan.alfred.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

/**
 * 汇率API配置
 */
@Component
@ConfigurationProperties(prefix = "exchange-rate")
data class ExchangeRateConfig(
    val apiUrl: String = "https://api.exchangerate-api.com/v4/latest",
    var enabled: Boolean = true,
    val timeout: Int = 10,
    val cacheHours: Int = 24
)
