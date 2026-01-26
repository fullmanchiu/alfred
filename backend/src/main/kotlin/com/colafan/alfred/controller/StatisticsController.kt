package com.colafan.alfred.controller

import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.TransactionService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/v1/statistics")
class StatisticsController(
    private val transactionService: TransactionService,
    private val authService: AuthService
) {

    @GetMapping("/overview")
    fun getOverview(
        @RequestParam(required = false) period: String?,
        @RequestParam(required = false) startDate: String?,
        @RequestParam(required = false) endDate: String?,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any>> {
        val userId = authService.getCurrentUserId(authentication)
        var transactions = transactionService.getTransactionsByUserId(userId)

        // 优先使用 startDate/endDate 筛选
        if (!startDate.isNullOrBlank() && !endDate.isNullOrBlank()) {
            val start = LocalDate.parse(startDate)
            val end = LocalDate.parse(endDate)
            transactions = transactions.filter {
                !it.transactionDate.toLocalDate().isBefore(start) &&
                !it.transactionDate.toLocalDate().isAfter(end)
            }
        } else if (!period.isNullOrBlank() && period != "all") {
            // 根据period参数筛选时间范围
            // period格式: "2024-01" (月度), "2024" (年度)
            transactions = if (period.matches(Regex("\\d{4}"))) {
                // 年度筛选: "2024"
                val year = period.toInt()
                transactions.filter {
                    it.transactionDate.year == year
                }
            } else if (period.matches(Regex("\\d{4}-\\d{2}"))) {
                // 月度筛选: "2024-01"
                val yearMonth = YearMonth.parse(period, DateTimeFormatter.ofPattern("yyyy-MM"))
                transactions.filter {
                    YearMonth.from(it.transactionDate) == yearMonth
                }
            } else {
                transactions
            }
        }

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
            "category_breakdown" to categoryBreakdown,
            "period" to (period ?: "all"),
            "start_date" to (startDate ?: ""),
            "end_date" to (endDate ?: "")
        )

        return ResponseEntity.ok(data)
    }
}
