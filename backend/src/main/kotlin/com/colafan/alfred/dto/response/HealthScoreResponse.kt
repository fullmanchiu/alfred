package com.colafan.alfred.dto.response

/**
 * 财务健康评分响应DTO
 */
data class HealthScoreResponse(
    /** 总分 (0-100) */
    val totalScore: Int,
    /** 储蓄率评分 (0-40) */
    val savingsRateScore: Int,
    /** 预算控制评分 (0-30) */
    val budgetControlScore: Int,
    /** 消费多样性评分 (0-30) */
    val diversityScore: Int,
    /** 评级: 优秀(90+)/良好(80-89)/一般(70-79)/需改善(<70) */
    val level: String,
    /** 储蓄率 */
    val savingsRate: Double,
    /** 预算使用率 */
    val budgetUsageRate: Double,
    /** 消费分类数 */
    val categoryCount: Int,
    /** 优化建议 */
    val suggestions: List<String>
)
