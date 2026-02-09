package com.colafan.alfred.dto.response

import java.math.BigDecimal
import java.time.LocalDate

/**
 * 日历单元格数据
 */
data class CalendarCellDto(
    val date: LocalDate,
    val period: String,  // day, week, month, year
    val budget: BigDecimal,
    val used: BigDecimal,
    val percentage: Double,
    val status: String   // normal, warning, over
)
