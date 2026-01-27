package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.Budget
import java.math.BigDecimal

/**
 * 预算使用情况响应
 */
data class BudgetUsageResponse(
    val budgetId: Long,
    val categoryId: Long,
    val categoryName: String?,
    val budgetAmount: BigDecimal,
    val usedAmount: BigDecimal,
    val remainingAmount: BigDecimal,
    val usagePercentage: Double,  // 使用百分比
    val isOverBudget: Boolean,    // 是否超支
    val period: String,
    val alertThreshold: Double
) {
    companion object {
        fun fromEntity(budget: Budget, categoryName: String?, usedAmount: BigDecimal): BudgetUsageResponse {
            val remainingAmount = budget.amount.subtract(usedAmount)
            val usagePercentage = if (budget.amount.compareTo(BigDecimal.ZERO) == 0) {
                0.0
            } else {
                usedAmount.divide(budget.amount, 2, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .toDouble()
            }

            val isOverBudget = usedAmount.compareTo(budget.amount) > 0

            return BudgetUsageResponse(
                budgetId = budget.id!!,
                categoryId = budget.categoryId,
                categoryName = categoryName,
                budgetAmount = budget.amount,
                usedAmount = usedAmount,
                remainingAmount = remainingAmount,
                usagePercentage = usagePercentage,
                isOverBudget = isOverBudget,
                period = budget.period,
                alertThreshold = budget.alertThreshold
            )
        }
    }
}
