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
    val isNearLimit: Boolean,     // 是否接近限额
    val period: String,
    val pattern: String,          // 新增：预算生效模式
    val alertThreshold: Double,
    val icon: String?,            // 分类图标
    val color: String?            // 分类颜色
) {
    companion object {
        fun fromEntity(budget: Budget, categoryName: String?, icon: String?, color: String?, usedAmount: BigDecimal): BudgetUsageResponse {
            val remainingAmount = budget.amount.subtract(usedAmount)
            val usagePercentage = if (budget.amount.compareTo(BigDecimal.ZERO) == 0) {
                0.0
            } else {
                usedAmount.divide(budget.amount, 2, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .toDouble()
            }

            val isOverBudget = usedAmount.compareTo(budget.amount) > 0
            val isNearLimit = usagePercentage >= budget.alertThreshold

            return BudgetUsageResponse(
                budgetId = budget.id!!,
                categoryId = budget.categoryId,
                categoryName = categoryName,
                budgetAmount = budget.amount,
                usedAmount = usedAmount,
                remainingAmount = remainingAmount,
                usagePercentage = usagePercentage,
                isOverBudget = isOverBudget,
                isNearLimit = isNearLimit,
                period = budget.period,
                pattern = budget.pattern,
                alertThreshold = budget.alertThreshold,
                icon = icon,
                color = color
            )
        }
    }
}
