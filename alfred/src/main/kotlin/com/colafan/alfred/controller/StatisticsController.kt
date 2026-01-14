package com.colafan.alfred.controller

import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.TransactionService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal

@RestController
@RequestMapping("/api/v1/statistics")
class StatisticsController(
    private val transactionService: TransactionService,
    private val authService: AuthService
) {

    @GetMapping("/overview")
    fun getOverview(
        @RequestParam(required = false) period: String?,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any>> {
        val userId = authService.getCurrentUserId(authentication)
        val transactions = transactionService.getTransactionsByUserId(userId)

        // 计算总收入和总支出
        val incomeTotal = transactions
            .filter { it.type == "income" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }

        val expenseTotal = transactions
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }

        val netSavings = incomeTotal.subtract(expenseTotal)

        // 按分类统计支出
        val categoryBreakdown = transactions
            .filter { it.type == "expense" }
            .groupBy { it.categoryId }
            .mapValues { (_, txList) ->
                txList.fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }
            }
            .map { (categoryId, amount) ->
                mapOf(
                    "category_id" to categoryId,
                    "amount" to amount.toDouble()
                )
            }

        val data = mapOf(
            "income_total" to incomeTotal.toDouble(),
            "expense_total" to expenseTotal.toDouble(),
            "net_savings" to netSavings.toDouble(),
            "category_breakdown" to categoryBreakdown
        )

        return ResponseEntity.ok(data)
    }
}
