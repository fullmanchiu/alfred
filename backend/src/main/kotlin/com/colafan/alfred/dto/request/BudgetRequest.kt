package com.colafan.alfred.dto.request

import java.time.LocalDateTime

data class BudgetRequest(
    val categoryId: Long,
    val amount: Double,
    val period: String,
    val alertThreshold: Double = 80.0,
    val startDate: LocalDateTime,
    val endDate: LocalDateTime? = null
)
