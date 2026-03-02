package com.colafan.alfred.dto.stock

import java.math.BigDecimal
import java.time.LocalDate

/**
 * K线批量传输DTO
 * 用于WebSocket批量接收K线数据
 */
data class StockKlineBatch(
    val code: String,              // 股票代码（6位）
    val tradeDate: LocalDate,      // 交易日期
    val open: BigDecimal,          // 开盘价
    val high: BigDecimal,          // 最高价
    val low: BigDecimal,           // 最低价
    val close: BigDecimal,         // 收盘价
    val volume: Long,              // 成交量
    val amount: BigDecimal? = null,     // 成交额
    val preClose: BigDecimal? = null,   // 昨收价
    val turnRate: BigDecimal? = null,    // 换手率 (%)
    val pctChange: BigDecimal? = null    // 涨跌幅 (%)
)
