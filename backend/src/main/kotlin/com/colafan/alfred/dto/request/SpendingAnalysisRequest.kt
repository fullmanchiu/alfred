package com.colafan.alfred.dto.request

/**
 * 消费分析请求
 */
data class SpendingAnalysisRequest(
    val transactions: List<Map<String, Any?>>,
    val budgetInfo: Map<String, Any?>
)
