package com.colafan.alfred.dto.response

/**
 * 预测分析响应DTO
 */
data class PredictionResponse(
    /** 下月预测支出 */
    val nextMonthPredictedExpense: Double,
    /** 预测方法 */
    val predictionMethod: String,
    /** 近3月支出趋势 */
    val recentThreeMonthsExpenses: List<MonthExpense>,
    /** 预测置信度 */
    val confidence: String,
    /** 趋势 */
    val trend: String,
    /** 预计超支时间（月份） */
    val overBudgetMonth: Int?
)

data class MonthExpense(
    /** 年月 */
    val yearMonth: String,
    /** 支出 */
    val expense: Double
)
