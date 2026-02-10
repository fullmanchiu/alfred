package com.colafan.alfred.service

import com.colafan.alfred.dto.response.BudgetHierarchyDto
import com.colafan.alfred.dto.response.BudgetUsageResponse
import com.colafan.alfred.dto.response.CalendarCellDto
import com.colafan.alfred.dto.response.CategoryBudgetDetailDto
import com.colafan.alfred.entity.Budget
import com.colafan.alfred.entity.Category
import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.BudgetRepository
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.repository.TransactionRepository
import com.colafan.alfred.util.BudgetCalculator
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

@Service
class BudgetService(
    private val budgetRepository: BudgetRepository,
    private val transactionRepository: TransactionRepository,
    private val categoryRepository: CategoryRepository
) {

    fun getBudgetsByUserId(userId: Long): List<Budget> {
        return budgetRepository.findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId)
    }

    fun getBudgetById(userId: Long, budgetId: Long): Budget {
        val budget = budgetRepository.findByIdOrNull(budgetId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "预算不存在")

        if (budget.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此预算")
        }

        return budget
    }

    fun getBudgetByCategory(userId: Long, categoryId: Long): Budget? {
        return budgetRepository.findByUserIdAndCategoryIdAndIsActiveTrue(userId, categoryId)
    }

    @Transactional
    fun createBudget(userId: Long, budget: Budget): Budget {
        // 检查是否已存在该分类和周期的预算
        val existingBudget = budgetRepository.findByUserIdAndCategoryIdAndPeriodAndIsActiveTrue(
            userId,
            budget.categoryId,
            budget.period
        )

        if (existingBudget != null) {
            throw ApiException(ErrorCode.CONFLICT, "该分类的${getPeriodName(budget.period)}预算已设置")
        }

        val newBudget = budget.copy(
            userId = userId,
            isActive = true
        )

        return budgetRepository.save(newBudget)
    }

    @Transactional
    fun updateBudget(userId: Long, budgetId: Long, updatedBudget: Budget): Budget {
        val existingBudget = getBudgetById(userId, budgetId)

        // 使用 copy 创建新对象，保持不可变性
        val budgetToUpdate = existingBudget.copy(
            amount = updatedBudget.amount,
            period = updatedBudget.period,
            alertThreshold = updatedBudget.alertThreshold,
            startDate = updatedBudget.startDate,
            endDate = updatedBudget.endDate
        )

        return budgetRepository.save(budgetToUpdate)
    }

    @Transactional
    fun deleteBudget(userId: Long, budgetId: Long) {
        val budget = getBudgetById(userId, budgetId)

        // 先物理删除相同 (user_id, category_id) 的已软删除记录，避免唯一约束冲突
        val inactiveBudgets = budgetRepository.findByUserIdAndCategoryId(userId, budget.categoryId)
            .filter { !it.isActive }
        if (inactiveBudgets.isNotEmpty()) {
            inactiveBudgets.forEach { budgetRepository.delete(it) }
            budgetRepository.flush()  // 立即生效
        }

        // 使用 copy 创建软删除对象，保持不可变性
        val budgetToDelete = budget.copy(isActive = false)
        budgetRepository.save(budgetToDelete)
    }

    fun getBudgetCount(userId: Long): Long {
        return budgetRepository.countByUserId(userId)
    }

    /**
     * 获取预算使用情况（优化版）
     * 支持周期计算（日/周/月/年）
     * 使用批量查询避免 N+1 问题
     * @param period 可选周期过滤，只返回指定周期的预算
     */
    @Transactional(readOnly = true)
    fun getBudgetUsage(userId: Long, period: String? = null): List<BudgetUsageResponse> {
        val budgets = getBudgetsByUserId(userId).let {
            if (period != null) it.filter { budget -> budget.period == period } else it
        }
        val currentDate = LocalDate.now()

        // 批量查询所有分类（避免 N+1）
        val categoryIds = budgets.map { it.categoryId }.distinct()
        val categories = categoryRepository.findAllById(categoryIds).associateBy { it.id }

        // 计算所有预算的时间范围（找到最大的范围）
        val allPeriods = budgets.map { it.period }.distinct()
        val (earliestStart, latestEnd) = allPeriods.map { period ->
            BudgetCalculator.getPeriodRange(period, currentDate)
        }.let { periods ->
            periods.minByOrNull { it.first }?.first to periods.maxByOrNull { it.second }?.second
        }

        // 批量查询所有交易（一次查询）
        val allTransactions = if (earliestStart != null && latestEnd != null) {
            transactionRepository
                .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                    userId = userId,
                    startDate = earliestStart.atStartOfDay(),
                    endDate = latestEnd.atTime(23, 59, 59)
                )
        } else {
            emptyList()
        }

        // 按分类和周期分组交易
        val transactionsByCategoryAndPeriod = allTransactions
            .filter { it.type == "expense" }
            .groupBy { it.categoryId }

        return budgets.map { budget ->
            val category = categories[budget.categoryId]

            // 确定周期范围
            val (start, end) = BudgetCalculator.getPeriodRange(budget.period, currentDate)

            // 从已加载的交易中筛选
            val categoryTransactions = transactionsByCategoryAndPeriod[budget.categoryId] ?: emptyList()
            val periodTransactions = categoryTransactions.filter { transaction ->
                val transactionDate = transaction.transactionDate.toLocalDate()
                !transactionDate.isBefore(start) && !transactionDate.isAfter(end)
            }

            // 计算已使用金额
            val usedAmount = periodTransactions
                .fold(BigDecimal.ZERO) { acc, transaction ->
                    acc.add(transaction.amount)
                }

            val categoryName = category?.name
            val categoryIcon = category?.icon
            val categoryColor = category?.color

            BudgetUsageResponse.fromEntity(budget, categoryName, categoryIcon, categoryColor, usedAmount)
        }
    }

    /**
     * 获取日历数据
     * @param userId 用户ID
     * @param view 视图类型 (day, week, month, year)
     * @param date 参考日期
     * @return 日历单元格列表
     */
    fun getCalendarData(userId: Long, view: String, date: LocalDate): List<CalendarCellDto> {
        val budgets = getBudgetsByUserId(userId)
        val cells = mutableListOf<CalendarCellDto>()

        when (view) {
            "day" -> {
                // 生成当月所有日期
                val daysInMonth = date.lengthOfMonth()
                for (day in 1..daysInMonth) {
                    val currentDate = date.withDayOfMonth(day)
                    val cell = calculateDayCell(currentDate, budgets, userId)
                    cells.add(cell)
                }
            }
            "week" -> {
                // 生成当月所有周（大约4-5周）
                val firstDayOfMonth = date.withDayOfMonth(1)
                val lastDayOfMonth = date.withDayOfMonth(date.lengthOfMonth())

                var weekStart = firstDayOfMonth
                var weekCount = 1
                while (weekStart.isBefore(lastDayOfMonth) || weekStart.isEqual(lastDayOfMonth)) {
                    val weekEnd = weekStart.plusDays(6)
                    val cell = calculateWeekCell(weekStart, budgets, userId, weekCount)
                    cells.add(cell)
                    weekStart = weekStart.plusDays(7)
                    weekCount++
                }
            }
            "month" -> {
                // 生成当年所有月
                for (month in 1..12) {
                    val currentDate = date.withMonth(month)
                    val cell = calculateMonthCell(currentDate, budgets, userId)
                    cells.add(cell)
                }
            }
            "year" -> {
                // 生成未来5年
                for (i in 0..4) {
                    val currentDate = date.plusYears(i.toLong())
                    val cell = calculateYearCell(currentDate, budgets, userId)
                    cells.add(cell)
                }
            }
        }

        return cells
    }

    /**
     * 映射前端period到后端period
     */
    private fun mapPeriod(period: String): String {
        return when (period) {
            "day" -> "daily"
            "week" -> "weekly"
            "month" -> "monthly"
            "year" -> "yearly"
            else -> period
        }
    }

    /**
     * 计算单日单元格数据
     */
    private fun calculateDayCell(
        date: LocalDate,
        budgets: List<Budget>,
        userId: Long
    ): CalendarCellDto {
        // 计算当日总预算（所有日预算的总和）
        val dayBudgets = budgets.filter { it.period == "daily" }
        val totalBudget = dayBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            acc.add(budget.amount)
        }

        // 计算当日已用金额
        val used = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = date.atStartOfDay(),
                endDate = date.atTime(23, 59, 59)
            )
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        return CalendarCellDto(
            date = date,
            period = "day",
            budget = totalBudget,
            used = used,
            percentage = percentage,
            status = status
        )
    }

    /**
     * 计算周单元格数据
     */
    private fun calculateWeekCell(
        weekStart: LocalDate,
        budgets: List<Budget>,
        userId: Long,
        weekCount: Int
    ): CalendarCellDto {
        val weekEnd = weekStart.plusDays(6)

        // 计算本周总预算
        val dailyBudgets = budgets.filter { it.period == "daily" }
        val weeklyBudgets = budgets.filter { it.period == "weekly" }

        var totalBudget = BigDecimal.ZERO

        // 日预算聚合：累加本周每天的日预算
        var day = weekStart
        while (day.isBefore(weekEnd) || day.isEqual(weekEnd)) {
            for (budget in dailyBudgets) {
                totalBudget = totalBudget.add(budget.amount)
            }
            day = day.plusDays(1)
        }

        // 周预算：直接计入
        for (budget in weeklyBudgets) {
            totalBudget = totalBudget.add(budget.amount)
        }

        // 计算本周已用金额
        val used = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = weekStart.atStartOfDay(),
                endDate = weekEnd.atTime(23, 59, 59)
            )
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        return CalendarCellDto(
            date = weekStart,
            period = "week",
            budget = totalBudget,
            used = used,
            percentage = percentage,
            status = status
        )
    }

    /**
     * 计算月单元格数据
     */
    private fun calculateMonthCell(
        date: LocalDate,
        budgets: List<Budget>,
        userId: Long
    ): CalendarCellDto {
        val firstDay = date.withDayOfMonth(1)
        val lastDay = date.withDayOfMonth(date.lengthOfMonth())

        // 计算本月总预算
        val dailyBudgets = budgets.filter { it.period == "daily" }
        val weeklyBudgets = budgets.filter { it.period == "weekly" }
        val monthlyBudgets = budgets.filter { it.period == "monthly" }

        var totalBudget = BigDecimal.ZERO

        // 日预算聚合：使用本月实际天数
        val daysInMonth = date.lengthOfMonth()
        for (budget in dailyBudgets) {
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(daysInMonth.toLong())))
        }

        // 周预算聚合：本月包含的周数 × 周预算
        val weeksInMonth = (daysInMonth + 6) / 7
        for (budget in weeklyBudgets) {
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(weeksInMonth.toLong())))
        }

        // 月预算：直接计入
        for (budget in monthlyBudgets) {
            totalBudget = totalBudget.add(budget.amount)
        }

        // 计算本月已用金额
        val used = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = firstDay.atStartOfDay(),
                endDate = lastDay.atTime(23, 59, 59)
            )
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        return CalendarCellDto(
            date = date,
            period = "month",
            budget = totalBudget,
            used = used,
            percentage = percentage,
            status = status
        )
    }

    /**
     * 计算年单元格数据
     */
    private fun calculateYearCell(
        date: LocalDate,
        budgets: List<Budget>,
        userId: Long
    ): CalendarCellDto {
        val firstDay = date.withDayOfYear(1)
        val lastDay = date.withDayOfYear(date.lengthOfYear())

        // 计算本年总预算
        val dailyBudgets = budgets.filter { it.period == "daily" }
        val weeklyBudgets = budgets.filter { it.period == "weekly" }
        val monthlyBudgets = budgets.filter { it.period == "monthly" }
        val yearlyBudgets = budgets.filter { it.period == "yearly" }

        var totalBudget = BigDecimal.ZERO

        // 日预算聚合：本年实际天数 × 日预算
        val daysInYear = date.lengthOfYear()
        for (budget in dailyBudgets) {
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(daysInYear.toLong())))
        }

        // 周预算聚合：52 × 周预算
        for (budget in weeklyBudgets) {
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(52)))
        }

        // 月预算聚合：12 × 月预算
        for (budget in monthlyBudgets) {
            totalBudget = totalBudget.add(budget.amount.multiply(BigDecimal.valueOf(12)))
        }

        // 年预算：直接计入
        for (budget in yearlyBudgets) {
            totalBudget = totalBudget.add(budget.amount)
        }

        // 计算本年已用金额
        val used = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = firstDay.atStartOfDay(),
                endDate = lastDay.atTime(23, 59, 59)
            )
            .filter { it.type == "expense" }
            .fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        return CalendarCellDto(
            date = date,
            period = "year",
            budget = totalBudget,
            used = used,
            percentage = percentage,
            status = status
        )
    }

    /**
     * 获取预算层级关系（优化版）
     * @param userId 用户ID
     * @param date 日期
     * @param period 周期类型
     * @return 预算层级详情
     */
    @Transactional(readOnly = true)
    fun getBudgetHierarchy(userId: Long, date: LocalDate, period: String): BudgetHierarchyDto {
        val dbPeriod = mapPeriod(period)

        // 获取所有预算（使用现有的方法）
        val dailyBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "daily")
        val weeklyBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "weekly")
        val monthlyBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "monthly")
        val yearlyBudgets = budgetRepository.findByUserIdAndPeriodAndIsActiveTrue(userId, "yearly")

        // 计算日预算
        val dayBudget = dailyBudgets
            .fold(BigDecimal.ZERO) { acc, budget -> acc.add(budget.amount) }

        // 计算周聚合预算：日预算 × 本周实际天数
        val (weekStart, weekEnd) = BudgetCalculator.getPeriodRange("weekly", date)
        val weekDaysCount = java.time.temporal.ChronoUnit.DAYS.between(weekStart, weekEnd).toInt() + 1
        val weekBudgetAggregate = dailyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            acc.add(budget.amount.multiply(BigDecimal.valueOf(weekDaysCount.toLong())))
        }

        // 计算月聚合预算：日预算 × 本月实际天数 + 周预算 × 本月周数
        val (monthStart, monthEnd) = BudgetCalculator.getPeriodRange("monthly", date)
        val monthDaysCount = java.time.temporal.ChronoUnit.DAYS.between(monthStart, monthEnd).toInt() + 1

        // 月内的日预算
        val monthDailyAggregate = dailyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            acc.add(budget.amount.multiply(BigDecimal.valueOf(monthDaysCount.toLong())))
        }

        // 月内的周预算：计算本月包含的完整周数
        val weeksInMonth = (monthDaysCount + 6) / 7
        val monthWeeklyAggregate = weeklyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            acc.add(budget.amount.multiply(BigDecimal.valueOf(weeksInMonth.toLong())))
        }

        val monthBudgetAggregate = monthDailyAggregate.add(monthWeeklyAggregate)

        // 计算年聚合预算：月聚合 × 12
        val yearBudgetAggregate = monthBudgetAggregate.multiply(BigDecimal.valueOf(12))

        // 周特有预算：直接计入
        val weekSpecific = weeklyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            acc.add(budget.amount)
        }

        // 月特有预算：直接计入
        val monthSpecific = monthlyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            acc.add(budget.amount)
        }

        // 年特有预算：直接计入
        val yearSpecific = yearlyBudgets.fold(BigDecimal.ZERO) { acc, budget ->
            acc.add(budget.amount)
        }

        // 总预算
        val totalBudget = when (dbPeriod) {
            "daily" -> dayBudget
            "weekly" -> weekBudgetAggregate.add(weekSpecific)
            "monthly" -> monthBudgetAggregate.add(monthSpecific)
            "yearly" -> yearBudgetAggregate.add(yearSpecific)
            else -> BigDecimal.ZERO
        }

        // 计算时间范围并一次性查询交易数据（避免重复查询）
        val (start, end) = BudgetCalculator.getPeriodRange(dbPeriod, date)

        // 批量查询交易数据（只查询一次）
        val allTransactions = transactionRepository
            .findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                userId = userId,
                startDate = start.atStartOfDay(),
                endDate = end.atTime(23, 59, 59)
            )

        // 过滤支出并计算总使用金额
        val expenseTransactions = allTransactions.filter { it.type == "expense" }
        val used = expenseTransactions.fold(BigDecimal.ZERO) { acc, transaction -> acc.add(transaction.amount) }

        val percentage = if (totalBudget > BigDecimal.ZERO) {
            (used.divide(totalBudget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
        } else 0.0

        val status = when {
            percentage >= 100 -> "over"
            percentage >= 80 -> "warning"
            else -> "normal"
        }

        // 获取分类预算详情（传递已查询的交易数据，避免重复查询）
        val allBudgets = dailyBudgets + weeklyBudgets + monthlyBudgets + yearlyBudgets
        val categoryBudgets = getCategoryBudgetDetailsOptimized(
            budgets = allBudgets,
            transactions = expenseTransactions,
            startDate = start,
            endDate = end,
            period = dbPeriod
        )

        return BudgetHierarchyDto(
            date = date,
            period = period,
            dayBudget = dayBudget,
            weekBudgetAggregate = weekBudgetAggregate,
            weekSpecific = weekSpecific,
            monthBudgetAggregate = monthBudgetAggregate,
            monthSpecific = monthSpecific,
            yearBudgetAggregate = yearBudgetAggregate,
            yearSpecific = yearSpecific,
            totalBudget = totalBudget,
            used = used,
            percentage = percentage,
            status = status,
            categoryBudgets = categoryBudgets
        )
    }

    /**
     * 获取分类预算详情（优化版）
     * 使用批量查询避免 N+1 问题
     * @param budgets 预算列表
     * @param transactions 已查询的交易数据（避免重复查询）
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @param period 周期类型
     */
    private fun getCategoryBudgetDetailsOptimized(
        budgets: List<Budget>,
        transactions: List<Transaction>,
        startDate: LocalDate,
        endDate: LocalDate,
        period: String
    ): List<CategoryBudgetDetailDto> {
        val periodCount = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate).toInt() + 1

        // 批量查询所有分类
        val categoryIds = budgets.map { it.categoryId }.distinct()
        val categories = categoryRepository.findAllById(categoryIds).associateBy { it.id }

        // 按分类分组交易（使用传入的交易数据，不再查询）
        val transactionsByCategory = transactions
            .groupBy { it.categoryId }

        // 按分类聚合预算
        val categoryBudgetMap = mutableMapOf<Long, BigDecimal>()
        for (budget in budgets) {
            val categoryId = budget.categoryId

            // 计算该预算在周期内的实际金额
            val budgetAmount = when (budget.period) {
                "daily" -> {
                    // 日预算：直接使用周期天数
                    budget.amount.multiply(BigDecimal.valueOf(periodCount.toLong()))
                }
                "weekly" -> {
                    // 周预算：计算周期内包含的周数
                    val weeksInPeriod = (periodCount + 6) / 7
                    budget.amount.multiply(BigDecimal.valueOf(weeksInPeriod.toLong()))
                }
                "monthly" -> {
                    // 月预算：对于周或日周期，按比例计算
                    if (period == "daily" || period == "weekly") {
                        val daysInMonth = startDate.lengthOfMonth().toDouble()
                        budget.amount.multiply(BigDecimal.valueOf(periodCount.toDouble())).divide(
                            BigDecimal.valueOf(daysInMonth),
                            2,
                            java.math.RoundingMode.HALF_UP
                        )
                    } else {
                        budget.amount
                    }
                }
                "yearly" -> {
                    // 年预算：对于周/月/日周期，按比例计算
                    val daysInYear = if (startDate.isLeapYear) 366 else 365
                    budget.amount.multiply(BigDecimal.valueOf(periodCount.toDouble())).divide(
                        BigDecimal.valueOf(daysInYear.toLong()),
                        2,
                        java.math.RoundingMode.HALF_UP
                    )
                }
                else -> BigDecimal.ZERO
            }

            categoryBudgetMap[categoryId] = (categoryBudgetMap[categoryId] ?: BigDecimal.ZERO).add(budgetAmount)
        }

        // 转换为DTO
        val categoryBudgets = mutableListOf<CategoryBudgetDetailDto>()
        for ((categoryId, budget) in categoryBudgetMap) {
            val used = transactionsByCategory[categoryId]?.fold(BigDecimal.ZERO) { acc, transaction ->
                acc.add(transaction.amount)
            } ?: BigDecimal.ZERO

            val category = categories[categoryId]
            val categoryName = category?.name ?: "未知分类"

            val percentage = if (budget > BigDecimal.ZERO) {
                (used.divide(budget, 2, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))).toDouble()
            } else 0.0

            val status = when {
                percentage >= 100 -> "over"
                percentage >= 80 -> "warning"
                else -> "normal"
            }

            categoryBudgets.add(
                CategoryBudgetDetailDto(
                    categoryId = categoryId,
                    categoryName = categoryName,
                    budget = budget,
                    used = used,
                    percentage = percentage,
                    status = status
                )
            )
        }

        return categoryBudgets.sortedByDescending { it.budget }
    }

    /**
     * 获取周期名称
     */
    private fun getPeriodName(period: String): String {
        return when (period) {
            "daily" -> "日"
            "weekly" -> "周"
            "monthly" -> "月"
            "yearly" -> "年"
            else -> period
        }
    }
}
