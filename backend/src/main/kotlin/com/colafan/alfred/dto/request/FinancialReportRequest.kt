package com.colafan.alfred.dto.request

/**
 * 财务报告请求
 */
data class FinancialReportRequest(
    val income: Double,
    val expenses: Double,
    val savings: Double,
    val topCategories: List<Map<String, Any?>>
)
