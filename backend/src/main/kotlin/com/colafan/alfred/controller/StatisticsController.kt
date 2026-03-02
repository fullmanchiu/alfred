package com.colafan.alfred.controller

import com.colafan.alfred.dto.response.AnomalyResponse
import com.colafan.alfred.dto.response.ComparisonResponse
import com.colafan.alfred.dto.response.HealthScoreResponse
import com.colafan.alfred.dto.response.PredictionResponse
import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.BudgetService
import com.colafan.alfred.service.CategoryService
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
    private val authService: AuthService,
    private val categoryService: CategoryService,
    private val budgetService: BudgetService
) {
    companion object {
        // 储蓄率评分常量
        const val SAVINGS_RATE_EXCELLENT = 30.0
        const val SAVINGS_RATE_GOOD = 20.0
        const val SAVINGS_RATE_FAIR = 10.0
        const val SAVINGS_SCORE_EXCELLENT = 40
        const val SAVINGS_SCORE_GOOD = 35
        const val SAVINGS_SCORE_FAIR = 25
        const val SAVINGS_SCORE_POOR = 15
        const val SAVINGS_SCORE_NEGATIVE = 5

        // 预算控制评分常量
        const val BUDGET_USAGE_EXCELLENT = 100.0
        const val BUDGET_USAGE_GOOD = 110.0
        const val BUDGET_USAGE_FAIR = 120.0
        const val BUDGET_SCORE_EXCELLENT = 30
        const val BUDGET_SCORE_GOOD = 25
        const val BUDGET_SCORE_FAIR = 20
        const val BUDGET_SCORE_POOR = 10
        const val BUDGET_SCORE_NONE = 15

        // 消费多样性评分常量
        const val DIVERSITY_EXCELLENT = 8
        const val DIVERSITY_GOOD = 6
        const val DIVERSITY_FAIR = 4
        const val DIVERSITY_POOR = 2
        const val DIVERSITY_SCORE_EXCELLENT = 30
        const val DIVERSITY_SCORE_GOOD = 25
        const val DIVERSITY_SCORE_FAIR = 20
        const val DIVERSITY_SCORE_POOR = 15
        const val DIVERSITY_SCORE_NONE = 10

        // 健康评分等级常量
        const val HEALTH_SCORE_EXCELLENT = 90
        const val HEALTH_SCORE_GOOD = 80
        const val HEALTH_SCORE_FAIR = 70

        // 异常检测常量
        const val ANOMALY_GROWTH_THRESHOLD = 50.0
        const val ANOMALY_SEVERITY_HIGH = 100.0
        const val ANOMALY_SEVERITY_MEDIUM = 75.0
        const val ANOMALY_DEVIATION_HIGH = 3.0
        const val ANOMALY_DEVIATION_MEDIUM = 2.5

        // 预测分析常量
        const val PREDICTION_MIN_MONTHS = 2
        const val TREND_RISING_THRESHOLD = 1.1
        const val TREND_FALLING_THRESHOLD = 0.9
        const val VARIANCE_THRESHOLD_HIGH = 0.1
        const val VARIANCE_THRESHOLD_MEDIUM = 0.2
    }

    @GetMapping("/overview")
    fun getOverview(
        @RequestParam(required = false) period: String?,
        @RequestParam(required = false) startDate: String?,
        @RequestParam(required = false) endDate: String?,
        @RequestParam(required = false) currency: String?,
        @RequestParam(required = false) accountId: Long?,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any>> {
        val userId = authService.getCurrentUserId(authentication)
        var transactions = transactionService.getTransactionsByUserId(userId)

        // 货币筛选
        if (!currency.isNullOrBlank()) {
            transactions = transactions.filter { it.currency == currency }
        }

        // 账户筛选（匹配 from_account_id 或 to_account_id）
        if (accountId != null) {
            transactions = transactions.filter {
                it.fromAccountId == accountId || it.toAccountId == accountId
            }
        }

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
            // period格式: "2024-01" (月度), "2024" (年度), "today", "this_week", "this_month"
            transactions = when {
                period == "today" -> {
                    val today = LocalDate.now()
                    transactions.filter { it.transactionDate.toLocalDate() == today }
                }
                period == "this_week" -> {
                    val today = LocalDate.now()
                    val startOfWeek = today.with(java.time.DayOfWeek.MONDAY)
                    val endOfWeek = startOfWeek.plusDays(6)
                    transactions.filter {
                        !it.transactionDate.toLocalDate().isBefore(startOfWeek) &&
                        !it.transactionDate.toLocalDate().isAfter(endOfWeek)
                    }
                }
                period == "this_month" -> {
                    val yearMonth = YearMonth.now()
                    transactions.filter {
                        YearMonth.from(it.transactionDate) == yearMonth
                    }
                }
                period.matches(Regex("\\d{4}")) -> {
                    // 年度筛选: "2024"
                    val year = period.toInt()
                    transactions.filter { it.transactionDate.year == year }
                }
                period.matches(Regex("\\d{4}-\\d{2}")) -> {
                    // 月度筛选: "2024-01"
                    val yearMonth = YearMonth.parse(period, DateTimeFormatter.ofPattern("yyyy-MM"))
                    transactions.filter { YearMonth.from(it.transactionDate) == yearMonth }
                }
                else -> transactions
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

    /**
     * 检测异常消费
     * 1. 单笔异常：单笔交易金额超过该分类平均值的2倍
     * 2. 分类突增：某分类本月支出比上月增长50%以上
     */
    @GetMapping("/anomalies")
    fun detectAnomalies(
        @RequestParam(defaultValue = "3") threshold: Double, // 异常阈值：倍数
        authentication: Authentication
    ): ResponseEntity<List<AnomalyResponse>> {
        val userId = authService.getCurrentUserId(authentication)
        val allTransactions = transactionService.getTransactionsByUserId(userId)
        val expenses = allTransactions.filter { it.type == "expense" }

        if (expenses.isEmpty()) {
            return ResponseEntity.ok(emptyList())
        }

        val anomalies = mutableListOf<AnomalyResponse>()

        // 1. 检测单笔异常交易
        val categoryGroups = expenses.groupBy { it.categoryId }

        categoryGroups.forEach { (categoryId, transactions) ->
            if (transactions.size < 2 || categoryId == null) return@forEach // 至少需要2笔交易才能计算平均值

            val avgAmount = transactions.map { it.amount }.map { it.toDouble() }.average()
            val category = categoryService.getCategoryById(userId, categoryId)

            transactions.forEach { tx ->
                val amount = tx.amount.toDouble()
                val deviation = amount / avgAmount

                if (deviation >= threshold) {
                    anomalies.add(
                        AnomalyResponse(
                            type = "single_transaction",
                            description = "单笔支出异常",
                            transactionId = tx.id,
                            transactionDate = tx.transactionDate,
                            categoryId = categoryId,
                            categoryName = category?.name,
                            amount = amount,
                            averageAmount = avgAmount,
                            deviationPercentage = ((deviation - 1) * 100),
                            severity = if (deviation >= ANOMALY_DEVIATION_HIGH) "high" else if (deviation >= ANOMALY_DEVIATION_MEDIUM) "medium" else "low"
                        )
                    )
                }
            }
        }

        // 2. 检测分类突增
        val now = LocalDate.now()
        val thisMonth = expenses.filter {
            YearMonth.from(it.transactionDate.toLocalDate()) == YearMonth.from(now)
        }

        val lastMonth = expenses.filter {
            YearMonth.from(it.transactionDate.toLocalDate()) == YearMonth.from(now).minusMonths(1)
        }

        if (thisMonth.isNotEmpty() && lastMonth.isNotEmpty()) {
            val thisMonthByCategory = thisMonth.groupBy { it.categoryId }
                .mapValues { (_, txList) -> txList.fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble() }

            val lastMonthByCategory = lastMonth.groupBy { it.categoryId }
                .mapValues { (_, txList) -> txList.fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble() }

            thisMonthByCategory.forEach { (categoryId, thisMonthAmount) ->
                val lastMonthAmount = lastMonthByCategory[categoryId] ?: 0.0

                if (lastMonthAmount > 0) {
                    val growthRate = ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100

                    if (growthRate >= ANOMALY_GROWTH_THRESHOLD && categoryId != null) {
                        val category = categoryService.getCategoryById(userId, categoryId)
                        anomalies.add(
                            AnomalyResponse(
                                type = "category_spike",
                                description = String.format("本月支出环比增长%.0f%%", growthRate),
                                transactionId = null,
                                transactionDate = null,
                                categoryId = categoryId,
                                categoryName = category?.name,
                                amount = thisMonthAmount,
                                averageAmount = lastMonthAmount,
                                deviationPercentage = growthRate,
                                severity = if (growthRate >= ANOMALY_SEVERITY_HIGH) "high" else if (growthRate >= ANOMALY_SEVERITY_MEDIUM) "medium" else "low"
                            )
                        )
                    }
                }
            }
        }

        // 按严重程度和偏差百分比排序
        val sortedAnomalies = anomalies.sortedWith(
            compareBy(
                { it.severity == "low" },
                { it.severity == "medium" },
                { -it.deviationPercentage }
            )
        )

        return ResponseEntity.ok(sortedAnomalies)
    }

    /**
     * 计算财务健康评分
     * 评分维度：
     * 1. 储蓄率 (0-40分): 净储蓄/总收入
     * 2. 预算控制 (0-30分): 预算使用情况
     * 3. 消费多样性 (0-30分): 分类数量
     */
    @GetMapping("/health-score")
    fun getHealthScore(authentication: Authentication): ResponseEntity<HealthScoreResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val allTransactions = transactionService.getTransactionsByUserId(userId)

        // 计算本月数据
        val now = LocalDate.now()
        val thisMonth = allTransactions.filter {
            YearMonth.from(it.transactionDate.toLocalDate()) == YearMonth.from(now)
        }

        val income = thisMonth.filter { it.type == "income" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()

        val expense = thisMonth.filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()

        // 1. 储蓄率评分 (0-40分)
        val netSavings = income - expense
        val savingsRate = if (income > 0) netSavings / income * 100 else 0.0
        val savingsRateScore = when {
            savingsRate >= SAVINGS_RATE_EXCELLENT -> SAVINGS_SCORE_EXCELLENT
            savingsRate >= SAVINGS_RATE_GOOD -> SAVINGS_SCORE_GOOD
            savingsRate >= SAVINGS_RATE_FAIR -> SAVINGS_SCORE_FAIR
            savingsRate >= 0 -> SAVINGS_SCORE_POOR
            else -> SAVINGS_SCORE_NEGATIVE
        }

        // 2. 预算控制评分 (0-30分)
        val budgets = budgetService.getBudgetsByUserId(userId)
        val currentMonthBudgets = budgets.filter {
            YearMonth.from(it.startDate) == YearMonth.from(now)
        }

        var totalBudget = 0.0
        var totalBudgetUsed = 0.0
        var overBudgetCount = 0

        currentMonthBudgets.forEach { budget ->
            if (budget.amount != null) {
                totalBudget += budget.amount.toDouble()

                // 计算该预算的使用情况
                val budgetExpenses = thisMonth.filter {
                    it.categoryId == budget.categoryId && it.type == "expense"
                }
                val used = budgetExpenses.fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()
                totalBudgetUsed += used

                if (used > budget.amount.toDouble()) {
                    overBudgetCount++
                }
            }
        }

        val budgetUsageRate = if (totalBudget > 0) totalBudgetUsed / totalBudget * 100 else 0.0
        val budgetControlScore = when {
            totalBudget == 0.0 -> BUDGET_SCORE_NONE
            budgetUsageRate <= BUDGET_USAGE_EXCELLENT && overBudgetCount == 0 -> BUDGET_SCORE_EXCELLENT
            budgetUsageRate <= BUDGET_USAGE_GOOD && overBudgetCount <= 1 -> BUDGET_SCORE_GOOD
            budgetUsageRate <= BUDGET_USAGE_FAIR -> BUDGET_SCORE_FAIR
            else -> BUDGET_SCORE_POOR
        }

        // 3. 消费多样性评分 (0-30分)
        val expenseCategories = thisMonth
            .filter { it.type == "expense" }
            .map { it.categoryId }
            .distinct()
            .count()

        val diversityScore = when {
            expenseCategories >= DIVERSITY_EXCELLENT -> DIVERSITY_SCORE_EXCELLENT
            expenseCategories >= DIVERSITY_GOOD -> DIVERSITY_SCORE_GOOD
            expenseCategories >= DIVERSITY_FAIR -> DIVERSITY_SCORE_FAIR
            expenseCategories >= DIVERSITY_POOR -> DIVERSITY_SCORE_POOR
            else -> DIVERSITY_SCORE_NONE
        }

        // 计算总分
        val totalScore = savingsRateScore + budgetControlScore + diversityScore

        // 确定评级
        val level = when {
            totalScore >= HEALTH_SCORE_EXCELLENT -> "优秀"
            totalScore >= HEALTH_SCORE_GOOD -> "良好"
            totalScore >= HEALTH_SCORE_FAIR -> "一般"
            else -> "需改善"
        }

        // 生成优化建议
        val suggestions = mutableListOf<String>()

        if (savingsRate < 20) {
            suggestions.add("建议提高储蓄率至20%以上，可减少非必要支出")
        }

        if (budgetUsageRate > 100) {
            suggestions.add("注意控制预算，本月已超支${String.format("%.0f", budgetUsageRate - 100)}%")
        }

        if (expenseCategories < 4) {
            suggestions.add("消费分类较少，建议记录更多分类以便更好地分析支出")
        }

        if (totalScore >= 90) {
            suggestions.add("财务状况优秀，继续保持！")
        }

        val response = HealthScoreResponse(
            totalScore = totalScore,
            savingsRateScore = savingsRateScore,
            budgetControlScore = budgetControlScore,
            diversityScore = diversityScore,
            level = level,
            savingsRate = savingsRate,
            budgetUsageRate = budgetUsageRate,
            categoryCount = expenseCategories,
            suggestions = suggestions
        )

        return ResponseEntity.ok(response)
    }

    /**
     * 同比环比分析
     */
    @GetMapping("/comparison")
    fun getComparison(authentication: Authentication): ResponseEntity<ComparisonResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val allTransactions = transactionService.getTransactionsByUserId(userId)

        val now = LocalDate.now()
        val thisMonth = YearMonth.from(now)
        val lastMonth = thisMonth.minusMonths(1)
        val thisYear = now.year
        val lastYear = thisYear - 1

        // 环比数据
        val lastMonthTx = allTransactions.filter {
            YearMonth.from(it.transactionDate.toLocalDate()) == lastMonth
        }
        val thisMonthTx = allTransactions.filter {
            YearMonth.from(it.transactionDate.toLocalDate()) == thisMonth
        }

        val lastMonthIncome = lastMonthTx.filter { it.type == "income" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()
        val thisMonthIncome = thisMonthTx.filter { it.type == "income" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()
        val lastMonthExpense = lastMonthTx.filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()
        val thisMonthExpense = thisMonthTx.filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()

        val lastMonthNetSavings = lastMonthIncome - lastMonthExpense
        val thisMonthNetSavings = thisMonthIncome - thisMonthExpense

        val incomeMoMGrowthRate = if (lastMonthIncome > 0)
            ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 else 0.0
        val expenseMoMGrowthRate = if (lastMonthExpense > 0)
            ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 else 0.0
        val netSavingsMoMGrowthRate = if (lastMonthNetSavings != 0.0)
            ((thisMonthNetSavings - lastMonthNetSavings) / Math.abs(lastMonthNetSavings)) * 100 else 0.0

        // 同比数据
        val lastYearThisMonth = allTransactions.filter {
            val date = it.transactionDate.toLocalDate()
            YearMonth.from(date) == thisMonth && date.year == lastYear
        }
        val thisYearThisMonth = allTransactions.filter {
            val date = it.transactionDate.toLocalDate()
            YearMonth.from(date) == thisMonth && date.year == thisYear
        }

        val lastYearIncome = lastYearThisMonth.filter { it.type == "income" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()
        val thisYearIncome = thisYearThisMonth.filter { it.type == "income" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()
        val lastYearExpense = lastYearThisMonth.filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()
        val thisYearExpense = thisYearThisMonth.filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()

        val lastYearNetSavings = lastYearIncome - lastYearExpense
        val thisYearNetSavings = thisYearIncome - thisYearExpense

        val incomeYoYGrowthRate = if (lastYearIncome > 0)
            ((thisYearIncome - lastYearIncome) / lastYearIncome) * 100 else 0.0
        val expenseYoYGrowthRate = if (lastYearExpense > 0)
            ((thisYearExpense - lastYearExpense) / lastYearExpense) * 100 else 0.0
        val netSavingsYoYGrowthRate = if (lastYearNetSavings != 0.0)
            ((thisYearNetSavings - lastYearNetSavings) / Math.abs(lastYearNetSavings)) * 100 else 0.0

        val response = ComparisonResponse(
            monthOverMonth = com.colafan.alfred.dto.response.MonthOverMonthComparison(
                lastMonthIncome = lastMonthIncome,
                thisMonthIncome = thisMonthIncome,
                incomeGrowthRate = incomeMoMGrowthRate,
                lastMonthExpense = lastMonthExpense,
                thisMonthExpense = thisMonthExpense,
                expenseGrowthRate = expenseMoMGrowthRate,
                lastMonthNetSavings = lastMonthNetSavings,
                thisMonthNetSavings = thisMonthNetSavings,
                netSavingsGrowthRate = netSavingsMoMGrowthRate
            ),
            yearOverYear = com.colafan.alfred.dto.response.YearOverYearComparison(
                lastYearIncome = lastYearIncome,
                thisYearIncome = thisYearIncome,
                incomeGrowthRate = incomeYoYGrowthRate,
                lastYearExpense = lastYearExpense,
                thisYearExpense = thisYearExpense,
                expenseGrowthRate = expenseYoYGrowthRate,
                lastYearNetSavings = lastYearNetSavings,
                thisYearNetSavings = thisYearNetSavings,
                netSavingsGrowthRate = netSavingsYoYGrowthRate
            )
        )

        return ResponseEntity.ok(response)
    }

    /**
     * 预测性分析 - 使用移动平均法预测下月支出
     */
    @GetMapping("/prediction")
    fun getPrediction(authentication: Authentication): ResponseEntity<PredictionResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val allTransactions = transactionService.getTransactionsByUserId(userId)

        val now = LocalDate.now()
        val thisMonth = YearMonth.from(now)

        // 获取最近3个月的支出数据
        val recentMonths = mutableListOf<com.colafan.alfred.dto.response.MonthExpense>()
        for (i in 2 downTo 0) {
            val targetMonth = thisMonth.minusMonths(i.toLong())
            val monthTx = allTransactions.filter {
                YearMonth.from(it.transactionDate.toLocalDate()) == targetMonth && it.type == "expense"
            }
            val expense = monthTx.fold(BigDecimal.ZERO) { acc, tx -> acc + tx.amount }.toDouble()

            recentMonths.add(
                com.colafan.alfred.dto.response.MonthExpense(
                    yearMonth = targetMonth.format(DateTimeFormatter.ofPattern("yyyy-MM")),
                    expense = expense
                )
            )
        }

        // 使用移动平均法预测
        val avgExpense = recentMonths.map { it.expense }.average()
        val nextMonthPredictedExpense = avgExpense

        // 计算趋势
        val trend = when {
            recentMonths.size >= PREDICTION_MIN_MONTHS && recentMonths[2].expense > recentMonths[1].expense * TREND_RISING_THRESHOLD -> "rising"
            recentMonths.size >= PREDICTION_MIN_MONTHS && recentMonths[2].expense < recentMonths[1].expense * TREND_FALLING_THRESHOLD -> "falling"
            else -> "stable"
        }

        // 确定置信度（修复边界条件：至少需要2个数据点才能计算方差）
        val expenses = recentMonths.map { it.expense }
        val variance = if (expenses.size >= PREDICTION_MIN_MONTHS) {
            val mean = expenses.average()
            expenses.map { (it - mean) * (it - mean) }.average()
        } else 0.0

        val confidence = when {
            variance < avgExpense * VARIANCE_THRESHOLD_HIGH -> "high"
            variance < avgExpense * VARIANCE_THRESHOLD_MEDIUM -> "medium"
            else -> "low"
        }

        // 预计超支时间（基于预算）
        val budgets = budgetService.getBudgetsByUserId(userId)
        val currentMonthBudgets = budgets.filter {
            YearMonth.from(it.startDate) == thisMonth
        }
        val totalBudget = currentMonthBudgets
            .mapNotNull { it.amount }
            .sumOf { it.toDouble() }

        val overBudgetMonth = if (totalBudget > 0 && nextMonthPredictedExpense > totalBudget) {
            // 计算几个月后会超支
            val monthlyOver = nextMonthPredictedExpense - totalBudget
            val avgMonthlySavings = allTransactions
                .filter { it.type == "income" }
                .take(90)
                .fold(0.0) { acc, tx -> acc + tx.amount.toDouble() } / 3 -
                allTransactions
                .filter { it.type == "expense" }
                .take(90)
                .fold(0.0) { acc, tx -> acc + tx.amount.toDouble() } / 3

            if (avgMonthlySavings > 0) (monthlyOver / avgMonthlySavings).toInt() else null
        } else null

        val response = PredictionResponse(
            nextMonthPredictedExpense = nextMonthPredictedExpense,
            predictionMethod = "移动平均法（3个月）",
            recentThreeMonthsExpenses = recentMonths,
            confidence = confidence,
            trend = trend,
            overBudgetMonth = overBudgetMonth
        )

        return ResponseEntity.ok(response)
    }
}
