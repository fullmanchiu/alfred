package com.colafan.alfred.dto.stock

/**
 * K线数据点 DTO
 */
data class KlineDataDTO(
    val time: Long,  // Unix timestamp in milliseconds
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
    val volume: Long
)
