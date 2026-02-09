package com.colafan.alfred.dto.response

import java.time.LocalDateTime

/**
 * 异常消费响应DTO
 */
data class AnomalyResponse(
    /** 异常类型: single_transaction(单笔异常), category_spike(分类突增) */
    val type: String,
    /** 异常描述 */
    val description: String,
    /** 交易ID */
    val transactionId: Long?,
    /** 交易日期 */
    val transactionDate: LocalDateTime?,
    /** 分类ID */
    val categoryId: Long?,
    /** 分类名称 */
    val categoryName: String?,
    /** 金额 */
    val amount: Double,
    /** 平均金额 */
    val averageAmount: Double,
    /** 偏差百分比 */
    val deviationPercentage: Double,
    /** 严重程度: high(高), medium(中), low(低) */
    val severity: String
)
