package com.colafan.alfred.dto.stock

/**
 * 股票搜索结果项 DTO
 */
data class StockSearchItemDTO(
    val code: String,
    val name: String,
    val market: String,
    val industry: String?,
    val latestPrice: Double?,
    val changePercent: Double?,
    val volume: Long?
)
