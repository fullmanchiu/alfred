package com.colafan.alfred.dto.request

import java.time.LocalDate

/**
 * 同步预算请求
 */
data class SyncBudgetRequest(
    val budgetId: Long,
    val pattern: String,  // all, workday, weekend
    val startDate: LocalDate  // 只同步此日期之后的
)
