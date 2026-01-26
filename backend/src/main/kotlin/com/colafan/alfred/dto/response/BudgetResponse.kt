package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.Budget
import java.time.LocalDateTime

data class BudgetResponse(
    val id: Long,
    val categoryId: Long,
    val amount: Double,
    val period: String,
    val alertThreshold: Double,
    val startDate: LocalDateTime,
    val endDate: LocalDateTime?,
    val createdAt: LocalDateTime
) {
    companion object {
        fun fromEntity(budget: Budget): BudgetResponse {
            return BudgetResponse(
                id = budget.id!!,
                categoryId = budget.categoryId,
                amount = budget.amount.toDouble(),
                period = budget.period,
                alertThreshold = budget.alertThreshold,
                startDate = budget.startDate,
                endDate = budget.endDate,
                createdAt = budget.createdAt!!
            )
        }
    }
}
