package com.colafan.alfred.dto.stock

/**
 * K线数据响应 DTO
 */
data class KlineResponseDTO(
    val code: String,
    val name: String,
    val klines: List<KlineDataDTO>
)
