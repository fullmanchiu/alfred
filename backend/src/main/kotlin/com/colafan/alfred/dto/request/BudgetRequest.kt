package com.colafan.alfred.dto.request

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import java.time.LocalDateTime

@JsonIgnoreProperties(ignoreUnknown = true)
data class BudgetRequest(
    val categoryId: Long,
    val amount: Double,
    val period: String,
    val pattern: String = "all",  // 生效模式: all, workday, weekend
    val alertThreshold: Double = 80.0,
    val isRecurring: Boolean = true,  // 是否循环
    val startDate: LocalDateTime,
    val endDate: LocalDateTime? = null,
    val isActive: Boolean = true
)
