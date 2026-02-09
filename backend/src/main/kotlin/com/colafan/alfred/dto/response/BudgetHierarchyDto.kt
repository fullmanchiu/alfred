package com.colafan.alfred.dto.response

import java.math.BigDecimal
import java.time.LocalDate

/**
 * 预算层级关系
 */
data class BudgetHierarchyDto(
    val date: LocalDate,
    val period: String,  // day, week, month, year
    // 预算层级
    val dayBudget: BigDecimal,
    val weekBudgetAggregate: BigDecimal,
    val weekSpecific: BigDecimal,
    val monthBudgetAggregate: BigDecimal,
    val monthSpecific: BigDecimal,
    val yearBudgetAggregate: BigDecimal,
    val yearSpecific: BigDecimal,
    val totalBudget: BigDecimal,
    // 使用情况
    val used: BigDecimal,
    val percentage: Double,
    val status: String,  // normal, warning, over
    // 分类预算
    val categoryBudgets: List<CategoryBudgetDetailDto>
)

/**
 * 分类预算详情
 */
data class CategoryBudgetDetailDto(
    val categoryId: Long,
    val categoryName: String,
    val budget: BigDecimal,
    val used: BigDecimal,
    val percentage: Double,
    val status: String  // normal, warning, over
)
