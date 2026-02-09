package com.colafan.alfred.dto.response

/**
 * 同比环比分析响应DTO
 */
data class ComparisonResponse(
    /** 环比数据 */
    val monthOverMonth: MonthOverMonthComparison,
    /** 同比数据 */
    val yearOverYear: YearOverYearComparison
)

data class MonthOverMonthComparison(
    /** 上月收入 */
    val lastMonthIncome: Double,
    /** 本月收入 */
    val thisMonthIncome: Double,
    /** 收入增长率 */
    val incomeGrowthRate: Double,
    /** 上月支出 */
    val lastMonthExpense: Double,
    /** 本月支出 */
    val thisMonthExpense: Double,
    /** 支出增长率 */
    val expenseGrowthRate: Double,
    /** 上月净储蓄 */
    val lastMonthNetSavings: Double,
    /** 本月净储蓄 */
    val thisMonthNetSavings: Double,
    /** 净储蓄增长率 */
    val netSavingsGrowthRate: Double
)

data class YearOverYearComparison(
    /** 去年同期收入 */
    val lastYearIncome: Double,
    /** 今年同期收入 */
    val thisYearIncome: Double,
    /** 收入增长率 */
    val incomeGrowthRate: Double,
    /** 去年同期支出 */
    val lastYearExpense: Double,
    /** 今年同期支出 */
    val thisYearExpense: Double,
    /** 支出增长率 */
    val expenseGrowthRate: Double,
    /** 去年同期净储蓄 */
    val lastYearNetSavings: Double,
    /** 今年同期净储蓄 */
    val thisYearNetSavings: Double,
    /** 净储蓄增长率 */
    val netSavingsGrowthRate: Double
)
